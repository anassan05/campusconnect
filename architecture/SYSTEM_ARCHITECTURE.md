# System Architecture

## Status legend
- ✅ Implemented and verified in this repository
- 🟡 Implemented, partially verified
- 📋 Planned (documented, not yet implemented)

## Overview

CampusConnect is a multi-tenant web application:

```
Browser ──▶ Next.js App Router (React 19, TS strict, Tailwind)
                │  ├─ Server Components (pages)
                │  ├─ Route Handlers (REST API under /api/*)
                │  └─ Server Actions (login/register forms)
                ▼
        Auth.js v5 (JWT sessions, credentials provider, bcrypt) ✅
                │
                ▼
        Prisma ORM ──▶ PostgreSQL 16 (shared DB, tenant-scoped tables) 🟡
```

## Implemented (✅/🟡)
- Next.js 15 App Router scaffold, strict TypeScript, Tailwind CSS ✅
- Auth.js v5 JWT sessions, credentials login with college-slug tenant
  resolution, bcrypt password hashing ✅
- Middleware route guard; security headers (X-Frame-Options, nosniff,
  referrer policy) ✅
- Prisma schema with `tenantId` on all tenant-scoped models; session-based
  tenant scoping helper `requireTenant()`; per-tenant unique constraints 🟡
  (app-level isolation only; RLS not yet enabled)
- RBAC permission matrix enforced in API routes and server components ✅
- Zod validation on all API inputs; centralized error responses ✅
- Audit logging of mutating API actions ✅
- REST API: health, companies, jobs, applications, students ✅
- Dashboard UI: overview, students, companies, jobs, applications, reports ✅
- Vitest unit tests (15 passing), Playwright specs written, Dockerfile +
  docker-compose (Postgres 16 + app) ✅

## Planned (📋)
- PostgreSQL Row-Level Security with FORCE on tenant-owned tables, transaction-local
  `SET LOCAL` tenant context, restricted app DB role, separate migration identity.
- Rate limiting, CSRF hardening beyond framework defaults, email verification.
- Private document storage for resumes/offer letters (currently URL fields).
- Email/in-app notifications with trusted delivery evidence.
- Playwright e2e executed in CI against a seeded test database.

## Non-goals / integrity rules
- Eligibility and placement decisions are always deterministic configured
  rules — AI must never make them.
- Selection, offer issuance, offer acceptance and placement are distinct states.
- Never claim notification delivery without delivery evidence.
