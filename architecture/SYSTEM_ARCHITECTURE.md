# System Architecture

## Status legend
- ✅ Implemented and verified in this repository (Phase 0)
- 📋 Planned (documented, not yet implemented)

## Implemented in Phase 0 (✅)
- Next.js 15 App Router scaffold with React 19, strict TypeScript, Tailwind CSS
- ESLint (flat config) + scripts: dev / lint / typecheck / test / build
- Prisma configuration (`prisma/schema.prisma`: datasource + generator only —
  deliberately no business models yet)
- PostgreSQL 16 via docker-compose for local development
- Secure `.gitignore`, placeholder-only `.env.example`
- GitHub Actions CI: `npm ci` → prisma generate → lint → strict typecheck →
  Vitest → production build (ephemeral Postgres service available)
- Minimal app shell (landing page) and `GET /api/health`
- One Vitest unit test (health endpoint) — executed, passing

## Phase 1A database foundation (PostgreSQL CI passed; review pending)
- College and User models, five-role enum, tenant constraints and initial migration
- Forced PostgreSQL RLS, restricted runtime role provisioning, transaction-local
  context helper; see MULTI_TENANCY.md for its security boundary.
- No authentication or authorization; no business workflows.

## Planned architecture (📋)

```
Browser ──▶ Next.js App Router (pages + /api route handlers + server actions)
                │
                ▼
        Auth.js v5 JWT sessions (Phase 1) — server-side auth, bcrypt passwords
                │
                ▼
        Prisma ORM ──▶ PostgreSQL 16 (shared DB, tenant column + RLS, Phase 1+)
```

- REST API under `src/app/api/*` with Zod input validation (Phase 2+ domains)
- Centralized RBAC permission matrix enforced server-side (Phase 1)
- Audit logging of security-relevant actions (Phase 1+)
- Dashboards and domain pages (Phases 2–11)

## Non-goals / integrity rules (binding for all phases)
- Eligibility and placement decisions are always deterministic configured
  rules — AI must never make them.
- Recruitment selection, offer issuance, offer acceptance and actual placement
  are distinct states.
- Never claim notification delivery without trusted delivery evidence.
- Never claim a control is implemented unless it exists and was verified.
