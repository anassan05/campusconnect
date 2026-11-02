# Database Strategy — Phase 1A

PostgreSQL 16 + Prisma, shared DB. `prisma/migrations/20261102000000_identity_tenant_foundation`
contains the initial schema, CHECK constraint, tenant-aware FK and RLS policies.
Use versioned migrations (`prisma migrate deploy`); `db push` does not install
custom RLS, CHECKs, or grants and is **not** a safe substitute.

## Separation of roles and policy targets

1. A database administrator runs `prisma/admin/create-runtime-role.sql` before
   the migration: PostgreSQL requires the role named in `CREATE POLICY ... TO`
   to exist. The script creates `campusconnect_runtime` NOLOGIN, NOSUPERUSER,
   NOBYPASSRLS, and refuses unsafe attributes or memberships in either direction.
2. A separate, controlled migration identity owns the tables and applies DDL;
   never use it for the application. An ordinary table owner is subject to FORCE
   RLS and has no matching policy, so tenant DML is denied. PostgreSQL superusers
   and BYPASSRLS roles bypass RLS even when forced. Schema migrations do not
   require ordinary owner DML through a runtime policy.
3. An administrator runs `prisma/admin/runtime-role.sql` after migration. It
   checks ownership, role attributes, memberships and effective schema CREATE;
   grants schema USAGE, SELECT on colleges and SELECT/INSERT/UPDATE/DELETE on
   users, with no grant options. Unexpected effective table/column permissions
   are rejected. The script does not silently revoke shared schema CREATE from
   PUBLIC; an administrator must correct unsafe grants before retrying. Provision
   LOGIN and a strong secret separately via a secrets manager. Use that login
   via `DATABASE_URL` for the app.

Both policies target **only** `campusconnect_runtime` with `USING` and `WITH
CHECK`; neither applies to PUBLIC, and no platform-admin bypass exists. With no
applicable policy, non-bypass identities, including the forced table owner and
any future bootstrap identity, are denied tenant DML. A future production
bootstrap design must be separately reviewed; do not reuse the CI fixture
superuser. The RLS-bypassing fixture admin is limited to disposable test DBs.

Review all database/schema/PUBLIC privileges, column grants, role memberships,
ownership and other objects in each environment; the scripts are not a full
cluster privilege audit and must be reviewed as the schema evolves. Never grant
runtime schema CREATE, ownership, role membership, BYPASSRLS or superuser.
Pooling must preserve transaction affinity. A custom GUC can be forged by runtime:
RLS is defense in depth against missed filters and pool leakage, **not** protection
against arbitrary SQL execution, SQL injection or stolen runtime credentials.
Phase 1B must verify server-controlled identity, current authorization and trusted
tenant derivation before any tenant-data endpoint is exposed; every tenant query
must use the callback transaction client and an explicit trusted tenant filter.

This migration is unreleased and was revised in PR #3. Earlier CI runs used
fresh disposable databases; do not edit an applied migration on a persistent
database. For this revision use a fresh disposable database, without resetting
or dropping an existing one. Local Compose's admin is never the runtime identity.

## Integration tests (disposable database only)

Use a fresh local PostgreSQL 16 instance, never production or shared data.
After `npm ci` and `npx prisma generate`, set `ADMIN_DATABASE_URL` for the
administrator and `DATABASE_URL` for the distinct migration identity, both
pointing at the same disposable DB:

```sh
# Administrator creates the NOLOGIN role first (required by the policies):
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/admin/create-runtime-role.sql
npx prisma migrate deploy
# Administrator applies grants and safety checks after migration:
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/admin/runtime-role.sql
# Separately provision LOGIN and a local-only password for campusconnect_runtime.
# Supply the two URLs through local environment variables, never committed:
# TEST_ADMIN_DATABASE_URL: fixture writer that bypasses RLS (test DB only)
# TEST_RUNTIME_DATABASE_URL: campusconnect_runtime login, same test DB
npm run test:integration
```

The suite creates random synthetic rows and does not delete data. It verifies
RLS and a composite FK against real PostgreSQL, checks policy targets, runtime
attributes, effective permissions, ownership and FORCE flags, demonstrates the
forgeable custom setting, and uses a one-connection pool to test context reuse
on commit and rollback. CI provisions an ephemeral PostgreSQL 16 service and
runs these steps with disposable credentials. A superuser fixture writer is
used **only** in the isolated test database because FORCE RLS applies to normal
owners. CI and local results are recorded in `IMPLEMENTATION_STATUS.md`.
Never reset/drop/truncate databases or use production credentials/data.
