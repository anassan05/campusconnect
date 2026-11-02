# Security Model

> Phase 1A adds database RLS and a tenant transaction helper; verification
> status is tracked in IMPLEMENTATION_STATUS.md. Authentication and RBAC remain
> unimplemented. Other controls below remain planned unless marked ✅.

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
The system is **not** "completely secure" and has no auth yet. RLS does not
replace authorization and its custom context is writable by the runtime role.
Recorded gaps: no RBAC, no rate limiting, no email verification, no
breach-password screening, no private document storage. Each has an owner phase
in DEVELOPMENT_ROADMAP.md.
