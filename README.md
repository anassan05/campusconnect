# CampusConnect

Multi-tenant **college placement management SaaS** for engineering colleges in
India. One shared PostgreSQL database serves many colleges; tenant isolation is
enforced server-side per request and (planned) by PostgreSQL Row-Level Security.

## Key capabilities (roadmap)
College onboarding & approval, student profiles & documents, companies and
placement drives, **deterministic** eligibility evaluation, drive registration,
recruitment rounds & offers, student portal, coordinator workflows, analytics,
notifications, audit logging. See `architecture/DEVELOPMENT_ROADMAP.md`.

## Technology stack
Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS ·
PostgreSQL 16 + Prisma · Auth.js v5 (JWT) · Zod · Vitest · Playwright · Docker ·
GitHub Actions CI

## Prerequisites
- Node.js 22+, npm
- Docker (for local PostgreSQL) or any PostgreSQL 16+ instance

## Local setup
```bash
cp .env.example .env.local        # fill DATABASE_URL, AUTH_SECRET (openssl rand -base64 32)
docker compose up -d postgres      # local Postgres only
npm ci
npx prisma generate
npm run db:push                    # dev schema sync (use prisma migrate dev before prod)
npm run db:seed                    # synthetic demo data only
npm run dev                        # http://localhost:3000
```
Demo login: college slug `demo-it`, `admin@demo.edu` / `Password123!`.

## Environment configuration
All config via environment variables; see `.env.example`. Never commit `.env*`.

## Development commands
| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | strict `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e (starts dev server) |
| `npm run db:*` | Prisma helpers (generate/push/migrate/seed/studio) |

## Project structure
```
src/app/        # pages, layouts, /api route handlers
src/lib/        # prisma, auth, tenant scoping, rbac, validation, audit, errors
prisma/         # schema, seed, migrations
tests/          # unit (Vitest) + e2e (Playwright)
architecture/   # SYSTEM_ARCHITECTURE, MULTI_TENANCY, SECURITY_MODEL, ROLE_MODEL,
                # DATABASE_STRATEGY, DEVELOPMENT_ROADMAP
.github/workflows/ci.yml
AGENTS.md       # instructions for AI coding agents
IMPLEMENTATION_STATUS.md
```

## CI
`.github/workflows/ci.yml` runs on PRs to `main`: `npm ci` (lockfile),
Prisma generate, lint, strict typecheck, Vitest, production build, with an
isolated ephemeral Postgres service available for future DB-backed checks.
Playwright e2e is not yet in CI (needs seeded DB + browsers) — documented as
unverified there.

## Security notes
- Server-side auth only; bcrypt passwords; JWT sessions; RBAC matrix enforced
  server-side; Zod validation; audit logging; security headers.
- Honest limitations: RLS not yet enabled, no rate limiting yet, no email
  verification yet. Details in `architecture/SECURITY_MODEL.md`.
- Never commit secrets or real student data.

## Docker
```bash
AUTH_SECRET=$(openssl rand -base64 32) docker compose up -d --build
```
