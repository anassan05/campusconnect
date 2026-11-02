# Phase 1B authentication design — proposed, not implemented

## Baseline and problem

Phase 1A was merged in PR #3 (`dd789f9f58579eaea7b1e804dc9b1eb3393edc53`).
The ordinary `campusconnect_runtime` role is subject to forced RLS on `users`;
it cannot look up an email before a trusted tenant is known and cannot see a
platform super-admin whose `college_id` is NULL. A client-provided college ID or
a mutable PostgreSQL custom GUC cannot establish identity. Giving the ordinary
runtime role cross-tenant SELECT or BYPASSRLS is not an acceptable solution.

## Candidate: isolated capability-based authentication broker

A separately privileged authentication broker, not the ordinary tenant runtime
role, is a candidate. Its public interface must be limited to credential
verification and session validation/revocation; it must not expose password
hashes or an unrestricted cross-tenant user lookup. A possible PostgreSQL
implementation is carefully audited `SECURITY DEFINER` functions owned by a
NOLOGIN, non-superuser, non-BYPASSRLS principal with only required privileges
and an explicit narrowly targeted RLS policy. Credential verification must
occur within the privileged boundary: returning a hash to an ordinary caller
would permit offline attacks and cross-tenant credential enumeration. Functions
must use fixed safe search paths, schema-qualified objects, strictly bounded
inputs, no dynamic SQL, and EXECUTE revoked from PUBLIC; provisioning and role
ownership require independent review.

Successful verification may return a cryptographically random, high-entropy,
short-lived capability bound to one account; store only its digest server-side.
A session lookup must require that capability, not an arbitrary user ID or
email, and return only the current active flag, current role and current
college for that capability's account. Revocation must invalidate the capability
and all protected requests must validate it on the server. A normal tenant
session cannot request another actor or college. Platform identities are
resolved via the same credential/capability path, not via a tenant RLS bypass;
platform-wide actions and explicit tenant selection remain separate. Even this
broker becomes a high-value privileged component: stolen valid credentials or
capabilities, arbitrary SQL, leaked DB secrets, compromised broker code, timing
side channels, missing rate limits, and untrusted migrations remain threats.
Access must be audited and login attempts rate-limited before production.

Auth.js v5 credentials is compatible with the declared Next 15 / React 19 peer
ranges according to the npm registry, but its beta behavior, JWT callback
lifecycle, cookie settings, sign-out/revocation semantics and compatibility
with this capability interface still require implementation and integration
verification. Browser-visible session JSON must never contain a password hash,
capability, database credentials, or authorization claims treated as current
truth. Signed/encrypted bounded sessions do not replace live database checks.

## Authorization and tenant access requirements

Use a centralized default-deny server-only matrix for the five roles; grant only
permissions explicitly implemented in Phase 1B. Resolve the actor's current
role, status and college through the verified capability on every protected
request. Reject inactive, revoked, expired and malformed identities. Tenant
users derive the only permitted college from the actor; platform administrators
must pass a separately authorized explicit tenant selection. No tenant data
endpoint is in scope. Any future tenant query must use the transaction callback
client from `withTenantTransaction` and an explicit trusted college filter;
the helper alone does not authenticate, and its custom GUC is forgeable.

## Verification and unresolved security gate

Before implementation can be treated as safe, demonstrate on disposable
PostgreSQL 16 that the broker's restricted caller cannot directly read hashes,
select platform/other-tenant users, invoke unintended functions, forge another
actor's session, or bypass ordinary tenant RLS. Test all function owners,
policies, privileges, forced RLS, immutable search paths, password rejection,
expiry, deactivation, role changes, revocation, and pool reuse. Separately test
Auth.js HTTP cookie/session callbacks, CSRF/sign-in/sign-out, and default-deny
RBAC. PostgreSQL superusers and BYPASSRLS roles bypass FORCE RLS and must never
be used by the application.

**Status: design candidate only; not yet a demonstrated safe boundary.** The
existing repository contains no authentication broker, credential store or
capability store. A production-quality implementation requires reviewing how
administrative setup transfers function ownership and grants without granting
the app an escalation path, and executing the tests above. Do not expose an
authentication route or tenant-data endpoint until those properties have been
established; see `IMPLEMENTATION_STATUS.md` for actual verification.
