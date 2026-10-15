# Chumchon Plus

Mobile-first web app for village headmen and their assistants to search resident records. See [issues/](issues/) for the v1 plan.

## Local development

Requires Node 22, pnpm and Docker.

```sh
cp .env.example .env          # then replace the passwords
pnpm install
docker compose up -d db       # Postgres 16; creates the restricted app role on first start
pnpm db:migrate               # runs as the owner role

pnpm village:create --name "บ้านทดลอง" --moo 5 --subdistrict "..." --district "..." --province "..."
pnpm user:create --role admin --village <village-id> --username phuyai --name "ชื่อ สกุล"
pnpm seed:residents --village <village-id> templates/residents-example.csv

pnpm dev                      # or: docker compose up -d --build app
```

`user:create` prints a generated password once. Use `--role superadmin` (no `--village`) for the developer account, which cannot see resident data.

Sign-in requests must come from the origin in `BETTER_AUTH_URL` (use `http://localhost:3000`, not `127.0.0.1`).

To try search with many residents, `pnpm seed:fake` creates a separate village of 500 fake people (150 households, look-alike names, every status). It refuses to run unless `APP_ENV` is `development` or `staging`.

## Database access rules

- The app connects as `chumchon_app`, which is subject to row-level security. Every resident query must run inside `withVillage(villageId, tx => ...)`; outside it, queries return no rows.
- `MIGRATION_DATABASE_URL` (table owner, bypasses RLS) is only for migrations and the village management scripts.
- Never wrap resident data in `"use cache"`, and never cache the session: revoking a session must take effect on the next request.
- Get the village from `getVillageUser()` (src/lib/session.ts), never from the request.
- `users` and `sessions` have no RLS (sign-in needs them first): filter them by village explicitly.
- Never log personal data; `console` is banned in `src/` by ESLint.

## Importing residents

Fill in [templates/residents-template.csv](templates/residents-template.csv) (one row per person; rows with the same บ้านเลขที่ form one household, and the row whose ความสัมพันธ์ is `หัวหน้าครัวเรือน` becomes the head). Birth dates accept `dd/mm/yyyy` in Buddhist or Christian era. The seed script validates the whole file first and writes nothing if any row is invalid.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test        # includes RLS and auth integration tests when the database is running
pnpm test:e2e    # Playwright; reuses whatever serves :3000, else starts `pnpm dev`
```

Stop or rebuild the Docker `app` container before `pnpm test:e2e`, otherwise the tests run against its stale build.

## Deploying

See [deploy/README.md](deploy/README.md) (Thai): Docker Compose on the home server behind Tailscale Funnel, with `deploy/ctl.sh` for deploy, rollback and admin scripts.
