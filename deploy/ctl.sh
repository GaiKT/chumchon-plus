#!/usr/bin/env bash
# Deploys and manages Chumchon Plus on the home server over SSH.
#
#   deploy/ctl.sh <production|staging> deploy           build HEAD on the server and switch to it
#   deploy/ctl.sh <env> rollback [tag]                  back to the previous (or given) version
#   deploy/ctl.sh <env> status                          version, address and containers
#   deploy/ctl.sh <env> logs [service]                  last 100 log lines
#   deploy/ctl.sh <env> run <script> [args...]          village:create, user:create, seed:fake, purge:deleted
#   deploy/ctl.sh <env> import <village-id> <file.csv>  import residents, then delete the file from the server
#
# DEPLOY_HOST overrides the SSH host (default: myserver from ~/.ssh/config).
set -euo pipefail

HOST=${DEPLOY_HOST:-myserver}
HERE=$(cd "$(dirname "$0")" && pwd)
ENV=${1:-}
CMD=${2:-}
if [ -z "$ENV" ] || [ -z "$CMD" ]; then
  sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi
shift 2

remote() {
  ssh "$HOST" "mkdir -p chumchon && cat > chumchon/remote.sh" <"$HERE/remote.sh"
  # Quote each argument: ssh joins them into one command line.
  ssh "$HOST" "bash chumchon/remote.sh $(printf '%q ' "$ENV" "$@")"
}

case "$CMD" in
  deploy)
    if ! git diff --quiet HEAD; then
      echo "Commit or stash your changes first: the server builds the last commit." >&2
      exit 1
    fi
    tag=$(git rev-parse --short=12 HEAD)
    echo "Sending $tag to $HOST..."
    git archive --format=tar HEAD | ssh "$HOST" "mkdir -p chumchon/src/$tag && tar -x -C chumchon/src/$tag"
    remote deploy "$tag"
    ;;
  import)
    village=${1:?village id}
    file=${2:?CSV file}
    name="residents-$(date +%s).csv"
    # Resident data: copy, import, and always remove the copy from the server.
    ssh "$HOST" "mkdir -p chumchon/$ENV/import && umask 077 && cat > chumchon/$ENV/import/$name" <"$file"
    status=0
    remote run seed:residents --village "$village" "/import/$name" || status=$?
    ssh "$HOST" "rm -f chumchon/$ENV/import/$name"
    exit $status
    ;;
  rollback | status | logs | run)
    remote "$CMD" "$@"
    ;;
  *)
    echo "Unknown command: $CMD" >&2
    exit 1
    ;;
esac
