#!/bin/sh
# Runs once when the database volume is first created.
# Creates the restricted role the app connects with: it can read and write
# rows but is subject to row-level security (no BYPASSRLS, not table owner).
set -eu

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set app_password="$APP_DB_PASSWORD" <<-'EOSQL'
	CREATE EXTENSION IF NOT EXISTS pg_trgm;

	CREATE ROLE chumchon_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
	  PASSWORD :'app_password';

	GRANT CONNECT ON DATABASE :"DBNAME" TO chumchon_app;
	GRANT USAGE ON SCHEMA public TO chumchon_app;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public
	  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chumchon_app;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public
	  GRANT USAGE ON TYPES TO chumchon_app;
EOSQL
