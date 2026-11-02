# CampusConnect

Multi-tenant **college placement management SaaS** for engineering colleges in
India. One shared PostgreSQL database serves many colleges. PostgreSQL RLS is
only defense in depth for tenant isolation: verified identity, authorization and
server-side tenant filtering are required before tenant-data endpoints exist.

> **Status: Phase 1A in progress.** College/User schema, forced RLS, a
> transaction-local tenant helper and restricted DB role provisioning are
> implemented; verification and review are pending. No authentication, RBAC,
> business workflows or business-facing APIs exist. See
> `IMPLEMENTATION_STATUS.md` and `architecture/MULTI_TENANCY.md`.

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
An administrator must create the restricted runtime role **before** applying
`prisma migrate deploy` with a separate migration identity; then the administrator
applies runtime grants and provisions login separately. `db:push` is not safe for this schema:
it does not install custom RLS, checks or privileges. See
`architecture/DATABASE_STRATEGY.md` for setup and integration tests.

## Development commands
| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | strict `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:integration` | PostgreSQL RLS integration tests (disposable DB) |
| `npm run test:e2e` | Playwright e2e (requires installed browsers) |
| `npm run db:*` | Prisma helpers |

## Project structure
```
src/app/        # App Router pages + /api route handlers (foundation shell only)
src/lib/        # shared server utilities (Prisma client singleton)
prisma/         # identity schema, migration and runtime-role provisioning
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
and applies migrations and runs RLS integration tests on an ephemeral PostgreSQL 16 service.
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
- The runtime role can forge its custom tenant setting. RLS mitigates accidental
  missing filters and pool context leakage, but does not protect against arbitrary
  SQL execution, SQL injection, or stolen runtime credentials. Phase 1B must
  verify server-controlled identity, current authorization and trusted tenant
  derivation before any tenant-data endpoint is exposed. Every tenant query must
  use the transaction callback client and explicitly filter by the trusted tenant.
- RBAC, rate limiting, audit logging, and private document storage remain planned. See `architecture/SECURITY_MODEL.md`.
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
