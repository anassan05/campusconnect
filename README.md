# CampusConnect

Multi-tenant **college placement management SaaS** for engineering colleges in
India. One shared PostgreSQL database serves many colleges; tenant isolation is
planned to be enforced by PostgreSQL Row-Level Security on top of mandatory
server-side, session-derived tenant filtering.

> **Status: Phase 0 — engineering foundation only (complete and merged via
> PR #1).** No business modules, authentication, or APIs are implemented yet.
> See `architecture/DEVELOPMENT_ROADMAP.md` and `IMPLEMENTATION_STATUS.md`.

## Planned key capabilities (not implemented)
College onboarding & platform approval, student profiles & documents, company
and placement-drive management, deterministic eligibility evaluation, drive
registration, recruitment rounds & offers, student portal, coordinator
workflows, analytics, notifications, audit logging.

## Technology stack
Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS ·
PostgreSQL 16 + Prisma · Vitest · Playwright · Docker · GitHub Actions CI.
Auth (Auth.js), Zod validation and the REST API layer are planned for Phase 1+.

## Prerequisites
- Node.js 22+, npm
- Docker (for local PostgreSQL) or any PostgreSQL 16+ instance

## Local setup
```bash
cp .env.example .env.local     # placeholder template; fill real values locally only
docker compose up -d           # local Postgres (development only)
npm ci
npx prisma generate
npm run dev                    # http://localhost:3000
```
The `db:push` / `db:migrate` / `db:generate` / `db:studio` scripts already exist
in `package.json`, but the Prisma schema currently contains **no domain models
and no migration history** — those arrive together with the first domain schema
in a later phase.

## Development commands
| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | strict `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e (requires installed browsers) |
| `npm run db:*` | Prisma helpers |

## Project structure
```
src/app/        # App Router pages + /api route handlers (foundation shell only)
src/lib/        # shared server utilities (Prisma client singleton)
prisma/         # schema.prisma (datasource/generator only — no business models yet)
tests/          # unit (Vitest) + e2e (Playwright)
architecture/   # SYSTEM_ARCHITECTURE, MULTI_TENANCY, SECURITY_MODEL, ROLE_MODEL,
                # DATABASE_STRATEGY, DEVELOPMENT_ROADMAP
.github/workflows/ci.yml
AGENTS.md       # instructions for AI coding agents
IMPLEMENTATION_STATUS.md
```

## CI
`.github/workflows/ci.yml` runs on PRs to `main`: `npm ci` (lockfile),
Prisma client generation, lint, strict typecheck, Vitest, production build,
with an ephemeral Postgres 16 service available for future DB-backed checks.
Playwright e2e is not yet wired into CI and has not been executed in the agent
sandbox (browser binaries blocked) — documented as unverified.

## Security notes
- No real production credentials or secrets are committed; `.env.example`
  contains placeholders only.
- `docker-compose.yml` contains **local development-only** PostgreSQL
  credentials (`campusconnect` / `campusconnect`). They must **never** be
  reused in staging or production. Production credentials must be supplied
  through deployment-provider environment variables or secrets managers.
- The compose Postgres port is bound to `127.0.0.1` only, so the local dev
  database is not exposed on other network interfaces.
- Planned security controls (RLS, RBAC, rate limiting, audit logging, private
  document storage) are documented in `architecture/SECURITY_MODEL.md` and are
  **not yet implemented**.
- Never commit real student data or credentials.
- Unverified in the agent sandbox: Docker image build (Docker unavailable) and
  Playwright e2e (browser binaries blocked).

## Docker
`docker-compose.yml` currently defines **only the local development PostgreSQL
service** — no application container/service has been added yet; the app
service is added together with the first runnable backend phase. (Docker image
build and Compose execution remain unverified in the agent sandbox, where
Docker is unavailable.)

```bash
docker compose up -d   # local development: Postgres service only (app service added in a later phase)
```
