# Multi-Tenancy Model

## Model: shared database, tenant column, defense in depth

One PostgreSQL database serves all colleges. Tenant-scoped tables carry a
tenant column (`tenantId` today; `college_id` naming planned with RLS).

## Layers of isolation

1. **Application layer (implemented ✅)** — the active tenant is resolved
   server-side from the authenticated session (`src/lib/tenant.ts` →
   `requireTenant()`). Every Prisma query is filtered by `tenantId`; every
   mutation re-checks ownership via a tenant-scoped `findFirst`. Client input
   is never used to select the tenant.
2. **Database layer (planned 📋)** — PostgreSQL Row-Level Security:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`
     on all tenant-owned tables (FORCE applies even to the table owner).
   - Policies compare the row's tenant column to a session/transaction-local
     context value.
   - Context is set with `SET LOCAL app.tenant_id = '<id>'` inside a
     transaction and `SET LOCAL app.user_id` for user context, then reset —
     never a persistent `SET` on a pooled connection.
   - Composite tenant-aware foreign keys where appropriate.
3. **Connection layer (planned 📋)** — a restricted application database role
   (no DDL, RLS not bypassed) separate from the migration identity.

## Tenant resolution
- Users log in with email + password + college slug; the slug maps to a
  `Tenant` row. `SUPER_ADMIN` is the only role allowed cross-tenant access and
  must pass an explicit slug.
- Subdomain-based resolution is a future option, not implemented.

## What is NOT yet enforced
- RLS policies do not exist yet — isolation currently relies on application
  filtering only. This is a documented gap; Phase 1 must close it.
