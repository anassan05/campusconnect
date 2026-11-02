# Phase 1B-A — identity-boundary feasibility decision

**Status: experimental, not approved for implementation or production.** The
project owner and independent security reviewer must approve the architecture
before Phase 1B. This document distinguishes demonstrated behavior from design
requirements. No user-facing auth endpoint, application RBAC, production schema,
account provisioning or production credentials are introduced.

## Decision and unresolved blocker

For the next design iteration, recommend **PostgreSQL SECURITY DEFINER** as the
least-operationally-complex candidate, with a NOLOGIN, non-owner, non-superuser,
non-BYPASSRLS function owner and narrowly scoped policies. The disposable proof
shows an experimentally viable credential/capability interface; it does **not**
prove a production-safe architecture. In particular, Phase 1A's existing runtime
role can forge `app.college_id` and read a different tenant via arbitrary SQL.
The proof explicitly demonstrates this: cross-tenant enumeration is denied for
an approved tenant context, but **not** against a malicious SQL caller holding
runtime credentials. The mandated stronger isolation cannot be claimed while
preserving that Phase 1A design. A separate application authorization boundary,
SQL-injection prevention and credential protection are essential; if isolation
against arbitrary runtime SQL is mandatory, the owner must choose a stronger
DB-authenticated tenant identity model before production. No rate limiter or
audit pipeline is implemented in the proof; operational guarantees below remain
requirements, not demonstrated controls. Do not expose a login endpoint based on
this experiment.

## Comparison (not a claim of equivalent verification)

| Approach | Isolation and platform admin | Security / operations / cost | Next 15 + Auth.js v5 | Decision |
|---|---|---|---|---|
| Separate authentication broker | Separate process/credentials and network policy can isolate hashes and platform identities; ordinary runtime needs no cross-tenant lookup. Broker still needs tightly restricted identity data access, current authorization and capability validation. | Stronger blast-radius separation but network/service discovery, credential rotation, HA, monitoring, rate-limit storage and incident response add ongoing operational complexity and hosting cost. Compromise of broker remains high impact. | HTTP integration is plausible but not tested. | Viable alternative; not selected for minimal feasibility proof. Reconsider for stricter process isolation. |
| SECURITY DEFINER functions | Fixed functions verify credentials and resolve only an unguessable session capability; a separate NOLOGIN owner can see limited user columns through a policy targeted only to it. Platform identity with NULL college works. The ordinary runtime RLS policy stays as-is. | No extra service, lower hosting cost, but PostgreSQL owner/grants, migrations, search path, side channels, SQL injection and the existing forgeable GUC demand expert review. Database CPU for bcrypt enables denial of service. One process compromise can call exposed functions. | Tested below with Auth.js v5 handlers in-process and PostgreSQL 16; no Next production deployment tested. | Conditional candidate for further review, **not approved**. |
| External OIDC provider plus local mapping | IdP verifies identity and handles passwords/MFA. A verified `(issuer, subject)` needs a trusted local account mapping, including current status, role and college; this lookup still requires a safe privileged interface. IdP or token claims cannot directly grant local tenant authority. | Potentially less local password handling and better MFA/recovery; adds vendor trust, configuration, outage/recovery handling, subject lifecycle and possible per-user/provider cost. A bad mapping or stale role remains dangerous. | Auth.js supports OIDC in principle; no provider, callback, costs or compatibility tested here. | Plausible alternative; not experimentally verified, no provider chosen. |

## Disposable proof: exact privilege model

`experiments/auth-boundary/setup.sql` is **not a migration** and must only run on
a fresh isolated PostgreSQL 16 test cluster. It creates `cc_auth_poc` and a
private pgcrypto schema, test credential/session tables and a NOLOGIN role
`cc_auth_poc_owner` with no role memberships, superuser, BYPASSRLS, CREATEDB,
CREATEROLE or REPLICATION. Tables are owned by the test administrator, not the
function owner or ordinary runtime. ENABLE and FORCE RLS protect proof tables.

- The existing `public.users` runtime policy is not changed; the proof adds one
  **experimental** SELECT policy targeted only at `cc_auth_poc_owner`, with
  column SELECT grants for `id`, `email`, `college_id`, `role`. This is
  cross-tenant visibility for the privileged function owner and is a major
  trust boundary, not a tenant policy. No new unrestricted SELECT is granted to
  `campusconnect_runtime`; that role already has its Phase 1A RLS-limited SELECT.
- The owner can SELECT password hashes and dummy hash internally and can
  SELECT/INSERT/UPDATE proof sessions. It has no user-table mutation, schema
  CREATE, login or role membership. PostgreSQL administrators and function
  owners with DDL power are trusted; DB superusers still bypass all RLS.
- Only `login(email,password)`, `resolve(capability)` and `revoke(capability)`
  are executable by the runtime. EXECUTE is revoked from PUBLIC; crypto helper
  execution and table/hash access are not granted to runtime. All three are
  owned by the NOLOGIN owner, SECURITY DEFINER, use fixed
  `search_path=pg_catalog`, qualified application/crypto objects and no dynamic
  SQL. The proof uses parameterized Prisma calls; never concatenate input.
- `login` checks bcrypt (`pgcrypto`, cost 12 in synthetic fixtures), performs a
  dummy hash comparison for unknown names, and returns a random 256-bit bearer
  capability only on valid active credentials. It returns neither hash nor
  account record. `resolve` looks up a SHA-256 digest of the capability, checks
  fixed 15-minute expiry, revocation and active state, and reads the current
  role/college from `public.users`. It accepts no user or college ID as session
  proof. `revoke` revokes only the supplied capability. No client-selected
  tenant ID is used by the proof's session resolution.
- In CI, a separate superuser fixture administrator inserts synthetic data and
  controls time/status for tests; it is confined to the disposable service.
  The proof owner is privileged across users but is not a login principal.

## Actual Auth.js credentials/JWT behavior exercised

`next-auth@5.0.0-beta.32` is added as a **dev-only experimental dependency**.
`experiments/auth-boundary/authjs.test.ts` invokes actual NextAuth v5 `handlers`
with `NextRequest` in-process, using the PostgreSQL proof interface. It is not a
route installed in the app, a deployed Next.js server or an external browser.
The credentials `authorize` callback submits validated test inputs to `login`;
the `jwt` callback puts the returned capability inside Auth.js's encrypted JWT
(JWE) cookie and calls `resolve` on subsequent session checks. HTTPS-mode cookie
is `__Secure-authjs.session-token`, HttpOnly, Secure, SameSite=Lax; the test
checks these attributes and credential POST CSRF handling. The browser receives
an opaque bearer cookie; the capability is not included in browser-visible
session JSON. Protected server code in the proof decrypts with Auth.js `getToken`
and re-resolves current account status, role and college using the capability;
it ignores a supplied college ID. The JWT's role/tenant is not trusted.

A test signs out using the actual handler and confirms replay of the old cookie
fails after server-side revocation. **Important:** Auth.js catches sign-out event
errors and may still clear the browser cookie if the database revocation fails;
a production design must explicitly handle revocation failures and not claim
that cookie deletion revokes stolen cookies. Auth.js reissues rolling JWT expiry,
while this proof has an absolute database expiry; the database check must always
win. Session reactivation, individual/all-session invalidation, credential
changes, token rotation, signing-key rotation and multiple concurrent requests
need additional design and tests. This experiment uses an in-process synthetic
HTTPS origin, not real browser/TLS/Next proxy behavior. Auth.js is beta; assess
future version compatibility, cookie chunking and server-context behavior.

## Rate limiting, audit and other required controls (not implemented)

Before any login route exists, use a shared, atomic, distributed limiter in a
trusted gateway/broker: per trusted source IP/network **and** HMAC-normalized
account key, with bounded bursts and sustained limits, backoff, global CPU
concurrency caps and fail-closed behavior when the limiter is unavailable. Do
not trust raw forwarded IP headers except through configured proxies. Restrict
DB credentials/network access so arbitrary callers cannot bypass that gateway;
the current proof's runtime can call `login` directly and does not meet this
requirement. Assess denial-of-service and account-lockout abuse, constant-time
failure behavior, IPv6 and distributed attacks. No rate-limit or load test has
been run.

Write structured append-only security events for attempts, successful login,
logout, revocation, administrative changes and platform tenant selection, with
server-generated correlation ID, timestamp, outcome and a privacy-preserving
account key; never log passwords, hashes, capability, JWT, session cookie or
SQL parameters. Use a separately permissioned sink, retention/access controls,
alerts and monitoring; define failure behavior without turning a transient
logging error into credential disclosure. Neither audit sink nor strategy has
been tested. Dummy bcrypt reduces one timing distinction but does not prove
constant-time behavior; input normalization/uniqueness (`lower(email)`), bcrypt
72-byte limit, recovery, enumeration/timing and backend CPU exhaustion require
review. The proof has no account-creation policy or MFA.

## Reproduction and evidence

Only on a **fresh disposable PostgreSQL 16 cluster** (role creation is
cluster-wide), follow `DATABASE_STRATEGY.md` to create the runtime role and
apply the existing migration. Supply the restricted runtime and test-only admin
URLs as `TEST_RUNTIME_DATABASE_URL` and `TEST_ADMIN_DATABASE_URL`; the admin must
bypass RLS for synthetic fixtures. Then:

```sh
npm ci
npx prisma generate
# Run existing integration suite before setup: it asserts only Phase 1A policies.
npm run test:integration
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f experiments/auth-boundary/setup.sql
npm run test:auth-poc
```

No reset, drop, truncate, production data or real account is used. Test fixtures
are random and synthetic. GitHub Actions runs the proof after the existing RLS
suite on its disposable service. As of run
[41482874697](https://github.com/anassan05/campusconnect/actions/runs/41482874697)
on `b8838b36ce2fce17c987f774fdee071ac72af525`, the proof suite was
**18 passed, 0 failed, 0 pending**, and the existing PostgreSQL suite was
**15 passed, 0 failed, 0 pending**. A subsequent documentation-only commit
triggers a fresh final-head run. Local PostgreSQL,
Docker and real Prisma engine downloads are unavailable in this sandbox.

## Dependency and approval status

The post-addition audit reported 23 findings: 17 moderate, 4 high, 2 critical.
High/critical paths remain Prisma -> @prisma/config -> deepmerge-ts, Vitest ->
tinypool and Vite; see `DEPENDENCY_SECURITY.md` and open
[issue #4](https://github.com/anassan05/campusconnect/issues/4). A green CI run
is not security clearance. No forced dependency upgrade was performed. Review
role/grant provisioning, database-verified tenant identity, audit, rate limiting,
Auth.js beta behavior and all remaining risks before approving Phase 1B.
