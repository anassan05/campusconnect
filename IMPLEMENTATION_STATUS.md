# CampusConnect — Implementation Status

Last updated: 2026-11-02

## Phase 1B-A — feasibility study (draft, not approved)

The standalone disposable PostgreSQL proof and real Auth.js handler experiment
are in `experiments/auth-boundary/`; `architecture/PHASE_1B_AUTH_DECISION.md`
compares alternatives, documents the privilege model, evidence and outstanding
security gates. No app auth endpoints, production changes or new Prisma
migration exist. The existing tenant GUC remains forgeable; arbitrary SQL with
runtime credentials can enumerate another tenant. Rate limiting and audit are
strategies only, not implemented. The proof is not production security clearance.
Project-owner and independent review are required before Phase 1B begins.

On PostgreSQL 16, CI run [41482874697](https://github.com/anassan05/campusconnect/actions/runs/41482874697)
on `b8838b36ce2fce17c987f774fdee071ac72af525` passed **18 proof tests, 0 failed**
and **15 existing RLS tests, 0 failed**, plus Prisma generation, lint, typecheck,
unit test and build. A documentation-only commit triggers a fresh final-head run. Local PostgreSQL and Docker
are unavailable. `npm audit --json` reported 23 findings: 17 moderate, 4 high,
2 critical; [issue #4](https://github.com/anassan05/campusconnect/issues/4)
remains open. Auth.js was added only as a dev dependency for the experiment.

## Phase 1B — blocked at identity-boundary design

No authentication, session management, authorization matrix or protected
endpoints have been implemented. `architecture/PHASE_1B_AUTH_DESIGN.md` records
a capability-based broker candidate, not a verified implementation. The existing
runtime role cannot authenticate platform users under forced RLS. A safe
least-privilege broker, credential storage, ownership/provisioning, revocation,
and Auth.js callback handling have not been demonstrated against PostgreSQL 16.
Until that boundary is built and verified, do not add an authentication route,
trust client-provided tenant identifiers, or weaken existing RLS. Phase 1B is
not complete and is not production security clearance.

### Phase 1B design-only verification (2026-11-02)

- `npm ci` passed; npm reported 23 vulnerabilities (17 moderate, 4 high,
  2 critical). Issue #4 remains open; no dependency changes were made.
- `npx prisma generate` failed locally because the Prisma engine host is
  blocked. Placeholder-assisted generation succeeded only for static checks.
- `npm test` passed 1/1; `npm run lint`, `npm run typecheck` and
  `npm run build` passed. These do not test any Phase 1B implementation.
- Local PostgreSQL integration and migration runs were not executed: no
  PostgreSQL or Docker is installed. CI can exercise only the unchanged Phase 1A
  suite; it cannot establish the proposed authentication boundary.

## Phase 1A — database foundation: merged

PR #3 was merged on 2026-11-02; merge commit on `main`:
`dd789f9f58579eaea7b1e804dc9b1eb3393edc53`. Final PR-head CI run
[41474748495](https://github.com/anassan05/campusconnect/actions/runs/41474748495)
passed the 15-test PostgreSQL suite. The statements below describe the prior
Phase 1A implementation and historical verification, not Phase 1B.

Implemented for review: College and User, five-role enum and role/tenant CHECK;
initial versioned Prisma migration with college FK, tenant-aware creator FK,
ENABLE/FORCE RLS and fail-closed policies targeted only to the restricted
runtime role; pre-migration role creation and post-migration grant provisioning;
transaction-local parameterized tenant context helper; actual PostgreSQL RLS
integration suite and CI wiring. See `architecture/MULTI_TENANCY.md` and
`architecture/DATABASE_STRATEGY.md` for boundaries, provisioning and tests.
No authentication, RBAC, onboarding, business workflows or deployment were
implemented. Platform identities are not accessible to the runtime tenant role;
a privileged platform access/bootstrap design remains a Phase 1B blocker.

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
- PostgreSQL 16 push run [41474397667](https://github.com/anassan05/campusconnect/actions/runs/41474397667)
  on commit `85cedad9854a0109aa8baf5f2a5467d489d3f97c` passed real Prisma
  generation, role creation, migration, provisioning, lint, typecheck, unit
  tests and build. `npm run test:integration` reported **15 passed, 0 failed,
  0 pending**. CI audit reported **23** (17 moderate, 4 high, 2 critical) and
  uploaded `npm-audit-report`; a successful CI run does not mean zero findings.
  No PostgreSQL or Docker was installed locally. Final PR-head run 41474748495
  also passed 15 integration tests and reported the same audit counts.
- Docker/Compose and Playwright e2e remain unverified locally. No production
  data or destructive database changes were used.

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
Never expose raw uniqueness/constraint errors. Do not start business phases
until the Phase 1B boundary is verified and independently reviewed. No production data, credentials,
deployment or destructive database operations were used.

## Prior phase

Phase 0 engineering foundation was merged in PR #1. Previous Phase 0 CI runs:
https://github.com/anassan05/campusconnect/actions/runs/41459517857 and
https://github.com/anassan05/campusconnect/actions/runs/41462308444. Those runs
do not verify Phase 1A. Phase 0 Playwright and Docker checks were not executed.
