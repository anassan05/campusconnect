# Security Model

## Authentication (implemented ✅)
- Auth.js / NextAuth v5, credentials provider, **JWT sessions (8h max age)**.
- Passwords hashed with **bcrypt (cost 12)**; minimum 10 chars at registration.
- Login endpoint resolves the tenant by college slug server-side.

## Authorization (implemented ✅, hardening planned 📋)
- Central permission matrix (`src/lib/rbac.ts`); enforced server-side in route
  handlers and server components. Client checks are UX-only.
- Roles: SUPER_ADMIN, ADMIN, TPO, FACULTY, STUDENT, COMPANY.

## Transport & headers (implemented ✅)
- Security headers on all routes: `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
- `poweredByHeader` disabled. HTTPS expected at the edge in deployment.

## Input & output
- All API input validated with Zod; errors return generic messages, no stack
  traces (500 handler logs server-side only). ✅
- Audit log records actor, tenant, action, entity, metadata for mutations. ✅

## Planned hardening (📋)
- Rate limiting on auth + mutating endpoints.
- Email verification / password reset flows with single-use tokens.
- CSRF: server actions are protected by Next.js; REST mutations should move to
  POST-only with origin checks.
- Private document storage (resumes, offer letters) with signed URLs —
  currently plain URL fields.
- Secrets only via environment; `.env*` gitignored; CI uses non-secret dummy
  values.

## Honest risk statement
The system is **not** "completely secure". Known gaps: no RLS yet (see
MULTI_TENANCY.md), no rate limiting, no email verification, no breach-password
screening, documents are URL-referenced not stored privately. Each is tracked
with a mitigation in the roadmap.
