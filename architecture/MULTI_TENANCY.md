# Multi-Tenancy Model (planned design)

> Status: 📋 **planned, not implemented.** Phase 0 contains no domain schema and
> no RLS policies. This document is the design future phases must implement.

## Model: shared database, tenant column, defense in depth

One PostgreSQL database serves all colleges. Tenant-scoped tables will carry a
tenant column (`college_id`).

## Layers of isolation

1. **Application layer (planned)** — the active tenant is resolved server-side
   from the authenticated session; every query filters by it; every mutation
   re-verifies row ownership with a tenant-scoped lookup. Client input never
   selects the tenant.
2. **Database layer (planned)** — PostgreSQL Row-Level Security:
   - `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on all
     tenant-owned tables (FORCE applies even to the table owner).
   - Policies compare the row's tenant column to transaction-local context.
   - Context set with `SET LOCAL app.tenant_id = '<id>'` and
     `SET LOCAL app.user_id = '<id>'` inside a transaction, then reset — never
     a persistent `SET` on a pooled connection.
   - Composite tenant-aware foreign keys where appropriate (e.g. `(tenant_id,
     student_id)` referencing a tenant-scoped parent).
3. **Connection layer (planned)** — restricted application database role (DML
   only, subject to RLS) separate from the migration identity.

## Tenant resolution (planned)
Login with email + password + college slug; slug maps to a tenant row.
`PLATFORM_SUPER_ADMIN` is the only cross-tenant role and must pass an explicit
slug. Subdomain-based resolution is a possible future extension.

## Honest current state
RLS, composite tenant-aware FKs and tenant-context handling do **not** exist
yet — review finding recorded in IMPLEMENTATION_STATUS.md.
