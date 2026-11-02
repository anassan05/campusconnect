# Database Strategy

## Technology
PostgreSQL 16+, accessed via Prisma ORM. Shared database; tenant separation by
tenant column + RLS (planned), not by schema-per-tenant.

## Credentials separation (planned / policy)
- **Migration identity**: owns DDL, used only by `prisma migrate` from a
  controlled environment/CI — never by the running app.
- **Application runtime identity**: restricted role — DML only, subject to RLS,
  no table ownership — used via `DATABASE_URL` at runtime.
- Local dev currently uses the compose Postgres superuser for convenience; this
  must not be replicated in staging/production.

## Initialization & migration procedure
1. `docker compose up -d` (local, ephemeral volume)
2. `cp .env.example .env.local`, set `DATABASE_URL`
3. `npx prisma generate`
4. First domain schema lands with `prisma migrate dev` → committed SQL under
   `prisma/migrations/` — **no migration history exists yet** (recorded
   review finding).

## Safety rules
- No destructive commands (`migrate reset`, `db drop`, DROP/TRUNCATE) without
  explicit human authorization; never touch production from an agent session.
- Dumps/backups and SQLite files are gitignored.
- RLS context (when implemented): `SET LOCAL app.tenant_id` transaction-locally,
  always reset — see MULTI_TENANCY.md.

## Environment note
In the agent sandbox, Prisma engine binaries cannot be downloaded
(binaries.prisma.sh blocked); generation was done with local placeholder engine
paths. `db:push`/`migrate` require network access to that host.
