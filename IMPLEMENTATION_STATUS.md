# CampusConnect — Implementation Status

Last updated: 2026-11-02

## Phase 1A — database foundation: in progress, not complete

Implemented for review: College and User, five-role enum and role/tenant CHECK;
initial versioned Prisma migration with college FK, tenant-aware creator FK,
ENABLE/FORCE RLS and fail-closed policies targeted only to the restricted
runtime role; pre-migration role creation and post-migration grant provisioning;
transaction-local parameterized tenant context helper; actual PostgreSQL RLS
integration suite and CI wiring. See `architecture/MULTI_TENANCY.md` and
`architecture/DATABASE_STRATEGY.md` for boundaries, provisioning and tests.
No authentication, RBAC, onboarding, business workflows or deployment were
implemented. Platform identities are not accessible to the runtime tenant role;
a privileged platform access/bootstrap design is deferred to Phase 1B review.

### Dependency and provisioning review (2026-11-02)

The seven stale root lockfile entries were removed; `tsx` remains as a legitimate
optional transitive dependency. A scoped Next -> PostCSS override replaces the
vulnerable Next-nested 8.4.31 with 8.5.32; other locked versions did not change.
`npm audit` was 26 findings (18 moderate, 6 high, 2 critical) before, and 23
(17 moderate, 4 high, 2 critical) after. `npm audit --omit=dev`: 3 high; Prisma
is retained by an optional peer even in an omit-dev installation. Exact paths,
advisories, exposure, mitigations and the non-breaking-fix limitation are in
`architecture/DEPENDENCY_SECURITY.md`; tracked by
[issue #4](https://github.com/anassan05/campusconnect/issues/4). The audit is not
clean; dependency findings must be reviewed before production. CI publishes the
full JSON audit artifact and warns, but does not treat the findings as a gate.

`create-runtime-role.sql` now rejects an already-LOGIN role before migration
without changing it. CI tests creation/idempotence with NOLOGIN and the integration
suite exercises the actual script against the existing LOGIN test role.

### Verification (2026-11-02)

- `npm ci` passed from a clean install. `npm ls --all` passed. `npm audit --json`
  and `npm audit` ran and exited 1 due to findings; counts above are actual.
- Plain `npx prisma generate` failed locally because engine downloads are blocked.
  Placeholder-assisted generation succeeded for typechecking; this is not DB
  verification. `npm run lint`, `npm run typecheck`, `npm test` (1/1) and
  `npm run build` passed locally after remediation.
- Revised role test and dependency changes require fresh PostgreSQL 16 CI
  verification; no PostgreSQL or Docker is installed locally. Prior-head run
  [41471683241](https://github.com/anassan05/campusconnect/actions/runs/41471683241)
  passed the earlier 14-test suite, not these new changes.
- Docker/Compose and Playwright e2e remain unverified locally. Independent review
  remains pending. No production data or destructive database changes were used.

### Limitations and next steps

RLS is defense in depth against accidental missing tenant filters and pool
context leakage, not authentication: the runtime role can forge its own custom
setting. It does not protect against arbitrary SQL execution, SQL injection, or
stolen runtime credentials. Before exposing any tenant-data endpoint, Phase 1B
must derive the tenant from a verified, server-controlled identity, enforce
current authorization, and design reviewed, explicit platform-admin tenant
selection and bootstrap. Every tenant query must use the transaction callback
client and an explicit trusted tenant filter. The creator FK remains nullable
for controlled bootstrap/import, but enforces same-tenant references when set; it
is not a complete audit log. The integration suite demonstrates GUC forgery as
an acknowledged limitation rather than an isolation guarantee. Runtime role grants do not implement RBAC.
Never expose raw uniqueness/constraint errors. Do not start Phase 1B until
independent review and project-owner approval. No production data, credentials,
deployment or destructive database operations were used.

## Prior phase

Phase 0 engineering foundation was merged in PR #1. Previous Phase 0 CI runs:
https://github.com/anassan05/campusconnect/actions/runs/41459517857 and
https://github.com/anassan05/campusconnect/actions/runs/41462308444. Those runs
do not verify Phase 1A. Phase 0 Playwright and Docker checks were not executed.
