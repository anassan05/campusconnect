# Database Strategy

## Technology
PostgreSQL 16+, accessed via Prisma ORM. Shared database, schema-per-deployment
(single `public` schema; tenant separation by column + RLS, not by schema).

## Credentials separation (planned 📋 / partially practiced)
- **Migration identity**: owns DDL, used only by `prisma migrate` from a
  controlled environment/CI. Never used by the running app.
- **Application runtime identity**: restricted role — DML only, subject to RLS,
  no table ownership. Used via `DATABASE_URL` at runtime.
- Local dev uses the compose Postgres superuser for convenience only; this must
  not be replicated in staging/production.

## Initialization & migration procedure
1. `docker compose up -d postgres` (local, ephemeral volume)
2. `cp .env.example .env.local` and set `DATABASE_URL`
3. Dev: `npm run db:push` (schema sync, no migration history)
4. Before any real deployment: `prisma migrate dev` to create committed
   migration SQL under `prisma/migrations/`, reviewed in PRs.
5. Seed (synthetic only): `npm run db:seed`

## Safety rules
- No destructive commands (`migrate reset`, `db drop`, DROP/TRUNCATE) without
  explicit human authorization.
- Never touch a production database from an agent session.
- Dumps/backups and SQLite files are gitignored.
- RLS context: set transaction-locally (`SET LOCAL app.tenant_id`) and always
  reset; see MULTI_TENANCY.md.

## Environment note
In the current sandbox, Prisma engine binaries cannot be downloaded
(binaries.prisma.sh blocked); `prisma generate` was completed with local
engine-path env vars. `db:push`/`migrate` require network access to that host.
