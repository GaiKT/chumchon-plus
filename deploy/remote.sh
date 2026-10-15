#!/usr/bin/env bash
# Runs on the home server; deploy/ctl.sh copies it there and calls it.
#   remote.sh <production|staging> deploy <tag>
#   remote.sh <env> rollback [tag]
#   remote.sh <env> status | logs | run <script> [args...]
# Never prints passwords or keys.
set -euo pipefail

ENV=${1:?environment}
CMD=${2:?command}
shift 2
case "$ENV" in production | staging) ;; *) echo "Unknown environment: $ENV" >&2; exit 1 ;; esac

ROOT="$HOME/chumchon"
DIR="$ROOT/$ENV"
ENVFILE="$DIR/.env"
PROJECT="chumchon-$ENV"
KEEP_SOURCES=5

compose() { docker compose -p "$PROJECT" --env-file "$ENVFILE" -f "$DIR/compose.yml" "$@"; }
setting() { grep -E "^$1=" "$ENVFILE" | tail -n 1 | cut -d= -f2- || true; }
set_setting() {
  if grep -qE "^$1=" "$ENVFILE"; then
    sed -i "s|^$1=.*|$1=$2|" "$ENVFILE"
  else
    echo "$1=$2" >>"$ENVFILE"
  fi
}

# Random passwords are created on the server and never leave it.
init_env() {
  mkdir -p "$DIR"
  [ -f "$ENVFILE" ] && return
  local hostname=chumchon
  [ "$ENV" = staging ] && hostname=chumchon-staging
  (
    umask 077
    cat >"$ENVFILE" <<EOF
APP_ENV=$ENV
APP_TAG=
OWNER_DB_PASSWORD=$(openssl rand -hex 24)
APP_DB_PASSWORD=$(openssl rand -hex 24)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=
CLIENT_IP_HEADER=x-forwarded-for
TS_HOSTNAME=$hostname
TS_AUTHKEY=
EOF
  )
  echo "Created $ENVFILE with new random passwords."
}

tailscale_joined() { docker volume inspect "${PROJECT}_tailscale-state" >/dev/null 2>&1; }

# The public address, e.g. https://chumchon.tail1234.ts.net
fill_auth_url() {
  [ -n "$(setting BETTER_AUTH_URL)" ] && return
  local name=""
  for _ in $(seq 1 30); do
    name=$(compose exec -T tailscale tailscale status --json </dev/null 2>/dev/null |
      python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null || true)
    [ -n "$name" ] && break
    sleep 2
  done
  if [ -z "$name" ]; then
    echo "Tailscale did not come up. Check: deploy/ctl.sh $ENV logs tailscale" >&2
    exit 1
  fi
  set_setting BETTER_AUTH_URL "https://$name"
  echo "Public address: https://$name"
}

wait_healthy() {
  for _ in $(seq 1 60); do
    case "$(compose ps app --format '{{.Health}}' </dev/null)" in
      healthy) return 0 ;;
    esac
    sleep 2
  done
  echo "The app did not become healthy. Check: deploy/ctl.sh $ENV logs app" >&2
  return 1
}

build_images() {
  local tag=$1 src="$ROOT/src/$1"
  if docker image inspect "chumchon-app:$tag" >/dev/null 2>&1 &&
    docker image inspect "chumchon-tools:$tag" >/dev/null 2>&1; then
    echo "Images for $tag already built."
    return
  fi
  [ -d "$src" ] || { echo "No source for $tag in $src" >&2; exit 1; }
  docker build --target runner -t "chumchon-app:$tag" "$src"
  docker build --target tools -t "chumchon-tools:$tag" "$src"
}

install_config() {
  local src="$ROOT/src/$1"
  mkdir -p "$DIR/db-init" "$DIR/tailscale"
  install -m 644 "$src/deploy/compose.yml" "$DIR/compose.yml"
  install -m 755 "$src/docker/db/init/"* "$DIR/db-init/"
  install -m 644 "$src/deploy/tailscale-serve.json" "$DIR/tailscale/serve.json"
}

switch_to() {
  local tag=$1 previous
  previous=$(setting APP_TAG)
  set_setting APP_TAG "$tag"
  if [ -n "$previous" ] && [ "$previous" != "$tag" ]; then echo "$previous" >>"$DIR/previous-tags"; fi
}

prune_sources() {
  # Keeps the newest sources; images stay, so older tags can still be rolled back to.
  ls -1t "$ROOT/src" 2>/dev/null | tail -n +$((KEEP_SOURCES + 1)) | while read -r old; do rm -rf "${ROOT:?}/src/$old"; done
}

cmd_deploy() {
  local tag=${1:?tag}
  init_env
  if [ -z "$(setting TS_AUTHKEY)" ] && ! tailscale_joined; then
    echo "Set TS_AUTHKEY in $ENVFILE on the server first (see deploy/README.md)." >&2
    exit 2
  fi
  build_images "$tag"
  install_config "$tag"
  switch_to "$tag"
  compose up -d db tailscale </dev/null
  fill_auth_url
  compose up -d --remove-orphans </dev/null
  wait_healthy
  prune_sources
  echo "Deployed $tag to $ENV at $(setting BETTER_AUTH_URL)"
}

cmd_rollback() {
  local tag=${1:-}
  if [ -z "$tag" ]; then
    tag=$(tail -n 1 "$DIR/previous-tags" 2>/dev/null || true)
    [ -n "$tag" ] || { echo "No earlier version to roll back to." >&2; exit 1; }
    sed -i '$d' "$DIR/previous-tags"
    set_setting APP_TAG "$tag"
  else
    switch_to "$tag"
  fi
  docker image inspect "chumchon-app:$tag" >/dev/null || { echo "No image for $tag" >&2; exit 1; }
  compose up -d --remove-orphans </dev/null
  wait_healthy
  echo "Rolled back $ENV to $tag. Database migrations are not undone."
}

cmd_run() {
  local script=${1:?script}
  shift
  case "$script" in
    village:create) script=create-village ;;
    user:create) script=create-user ;;
    purge:deleted) script=purge-deleted ;;
    seed:fake) script=seed-fake ;;
    seed:residents) script=seed-residents ;;
    *) echo "Unknown script: $script" >&2; exit 1 ;;
  esac
  # Files under ~/chumchon/<env>/import are visible to the script as /import.
  mkdir -p "$DIR/import"
  compose run --rm -T -v "$DIR/import:/import:ro" tools node_modules/.bin/tsx "scripts/$script.ts" "$@" </dev/null
}

case "$CMD" in
  deploy) cmd_deploy "$@" ;;
  rollback) cmd_rollback "$@" ;;
  status)
    echo "Version: $(setting APP_TAG)  Address: $(setting BETTER_AUTH_URL)"
    compose ps -a </dev/null
    ;;
  logs) compose logs --tail 100 "$@" </dev/null ;;
  run) cmd_run "$@" ;;
  *) echo "Unknown command: $CMD" >&2; exit 1 ;;
esac
