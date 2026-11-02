# Database Strategy — Phase 1A

PostgreSQL 16 + Prisma, shared DB. `prisma/migrations/20261102000000_identity_tenant_foundation`
contains the initial schema, CHECK constraint, tenant-aware FK and RLS policies.
Use versioned migrations (`prisma migrate deploy`); `db push` does not install
custom RLS, CHECKs, or grants and is **not** a safe substitute.

## Separation of roles

- A controlled migration identity owns the schema/tables and applies DDL. It
  must not be used by the running app. FORCE RLS also applies to an ordinary
  owner, but PostgreSQL superusers and BYPASSRLS roles always bypass it.
- `prisma/admin/runtime-role.sql` is run by a database administrator **after**
  migration. It creates `campusconnect_runtime` as NOLOGIN, NOSUPERUSER,
  NOBYPASSRLS, with no role membership, and grants the minimal current table
  permissions. It rejects unsafe attributes, memberships, or table ownership.
  Provision LOGIN and a strong secret separately through your secrets manager;
  do not commit credentials. Use that login via `DATABASE_URL` for the app.
- Review database/schema/PUBLIC privileges, role memberships and ownership in
  each environment. The script is not a full cluster privilege audit and must
  be rerun/reviewed as tables and privileges evolve. Never grant the runtime
  role migration ownership, BYPASSRLS, superuser, or membership allowing
  escalation. Pooling must preserve transaction affinity.
- Local Compose's `campusconnect` superuser is for local database administration
  only, not application runtime. No production setup/deployment is performed.

## Integration tests (disposable database only)

Use a fresh local PostgreSQL 16 instance, never production or shared data.
After `npm ci` and `npx prisma generate`, apply migrations using a migration
identity with `DATABASE_URL` pointing at the disposable DB:

```sh
npx prisma migrate deploy
# Administrator connects to the disposable DB and runs:
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/admin/runtime-role.sql
# Separately provision LOGIN and a local-only password for campusconnect_runtime.
# Supply the two URLs through local environment variables, never committed:
# TEST_ADMIN_DATABASE_URL: fixture writer that bypasses RLS (test DB only)
# TEST_RUNTIME_DATABASE_URL: campusconnect_runtime login, same test DB
npm run test:integration
```

The suite creates random synthetic rows and does not delete data. It verifies
RLS and a composite FK against real PostgreSQL, checks runtime attributes,
ownership and FORCE flags, and uses a one-connection pool to test context reuse
on commit and rollback. CI provisions an ephemeral PostgreSQL 16 service and
runs these steps with disposable credentials. A superuser fixture writer is
used **only** in the isolated test database because FORCE RLS applies to normal
owners. CI and local results are recorded in `IMPLEMENTATION_STATUS.md`.
Never reset/drop/truncate databases or use production credentials/data.
