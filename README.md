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
# put the printed id in .env as DEV_VILLAGE_ID
pnpm seed:residents --village <village-id> templates/residents-example.csv

pnpm dev                      # or: docker compose up -d --build app
```

## Database access rules

- The app connects as `chumchon_app`, which is subject to row-level security. Every resident query must run inside `withVillage(villageId, tx => ...)`; outside it, queries return no rows.
- `MIGRATION_DATABASE_URL` (table owner, bypasses RLS) is only for migrations and the village management scripts.
- Never wrap resident data in `"use cache"`.

## Importing residents

Fill in [templates/residents-template.csv](templates/residents-template.csv) (one row per person; rows with the same บ้านเลขที่ form one household, and the row whose ความสัมพันธ์ is `หัวหน้าครัวเรือน` becomes the head). Birth dates accept `dd/mm/yyyy` in Buddhist or Christian era. The seed script validates the whole file first and writes nothing if any row is invalid.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test        # includes RLS integration tests when the database is running
```
