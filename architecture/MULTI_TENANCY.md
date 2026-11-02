# Multi-Tenancy Model — Phase 1A

One shared PostgreSQL database holds colleges and users. A college is visible
only when `colleges.id` matches the active college. A tenant user has a
non-null `college_id`; a platform user has a null `college_id` and is invisible
to the ordinary runtime role. The initial migration enables **and forces** RLS
on both tables. Each policy uses the same match in `USING` and `WITH CHECK`;
missing or empty `app.college_id` matches nothing. The runtime role has SELECT
only on colleges, and SELECT/INSERT/UPDATE/DELETE on users. It has no blanket
platform bypass. Privileged provisioning of college/platform records is outside
Phase 1A.

The optional creator reference on a tenant user is tenant-consistent: the
`(college_id, created_by_user_id)` foreign key references
`users(college_id, id)`. This is not an audit log; it is optional and mutable.
The college FK and a CHECK enforce that only platform super-admins have no
college, and they cannot have a creator. User email is globally unique: this
can reveal existence via uniqueness errors if future APIs expose raw DB errors;
Phase 1B must handle responses safely.

## Context and trust boundary

`withTenantTransaction` starts an interactive Prisma transaction, validates and
normalizes a college UUID, and parameterizes `set_config('app.college_id', id,
true)` before invoking the callback on that same transaction client. The final
`true` makes it transaction-local, so commit or rollback clears it before a
pooled connection is reused. Callback code must explicitly filter every tenant
query by the same trusted college ID as a second defense; never use the global
Prisma client inside the callback. No client-supplied ID is authorization.

The helper does **not** authenticate or authorize: it is not safe to expose it
directly to a request. Phase 1B must verify a server-controlled session, look
up the actor's current role and college from trusted data, authorize the action,
and derive the active tenant from that identity before calling the helper.
Revocation and role changes must not rely on stale, unverified client claims.
A platform admin's explicit tenant selection is only a requested target: the
server must verify platform authority and the target before establishing a
single-tenant context. Cross-tenant administration and login/bootstrap of
platform identities require a separately reviewed, least-privilege design;
there is no Phase 1A privileged runtime path or broad bypass policy.

PostgreSQL custom settings are not cryptographic identities: the runtime role
can change its own setting. RLS guards accidental omissions, not arbitrary SQL
injection or stolen runtime credentials. Restrict credentials, use
parameterized queries, never accept SQL from clients, and enforce server-side
RBAC; RLS alone does not stop a tenant user from changing roles within its own
college. Authentication, authorization, and user-facing operations are not yet
implemented. Verification status is in `IMPLEMENTATION_STATUS.md`.
