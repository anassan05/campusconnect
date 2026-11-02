# Security Model

> Phase 1A RLS and the tenant helper were merged in PR #3. Authentication and
> RBAC remain unimplemented; the Phase 1B lookup candidate is documented but not
> demonstrated in `PHASE_1B_AUTH_DESIGN.md`. Other controls below remain planned
> unless marked ✅.

## Planned authentication (Phase 1)
- Auth.js / NextAuth v5, credentials provider, **JWT sessions** with bounded
  max age; passwords hashed with **bcrypt (cost ≥ 12)**; minimum password
  length policy; email verification and single-use reset tokens.

## Planned authorization (Phase 1)
- Central server-side RBAC matrix keyed to the five-role model
  (ROLE_MODEL.md); enforced in route handlers and server components.
  Client-side checks are UX only, never a boundary.

## Planned transport & headers
- Security headers (X-Frame-Options DENY, nosniff, Referrer-Policy) ✅ already
  set in `next.config.ts`; `poweredByHeader` disabled ✅. HTTPS at the edge in
  deployment.

## Planned input/output & audit
- Zod validation on all API input; generic error responses, no stack traces;
  audit log of actor/tenant/action/entity for security-relevant mutations.

## Planned hardening
- Rate limiting on auth and mutating endpoints; CSRF-safe mutations; private
  document storage with signed URLs for resumes/offer letters; secrets only via
  environment (`.env*` gitignored); CI uses non-secret dummy values.

## Honest risk statement
The system is **not** "completely secure" and has no auth yet. RLS is defense
in depth against accidental missing tenant filters and connection-pool context
leakage, not authentication. The runtime role can forge its custom tenant GUC.
It does not protect against arbitrary SQL execution, SQL injection, or stolen
runtime credentials. Before exposing any tenant-data endpoint, Phase 1B must
verify a server-controlled identity, check current authorization, and derive a
trusted tenant. Every tenant query must use the callback transaction client and
an explicit filter for that trusted tenant. RLS does not replace RBAC.
Recorded gaps: no RBAC, no rate limiting, no email verification, no
breach-password screening, no private document storage. Each has an owner phase
in DEVELOPMENT_ROADMAP.md.
