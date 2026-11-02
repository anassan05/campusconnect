# AGENTS.md — CampusConnect engineering instructions for AI coding agents

Audience: Arena, Codex, ChatGPT or any future AI agent working in this repository.
Read this file before making changes. Follow it unless the human operator
explicitly overrides a rule in writing.

## 1. Project purpose & architecture

CampusConnect is a **multi-tenant SaaS platform for college placement
management** for engineering colleges in India. One shared PostgreSQL
database serves many colleges ("tenants"); every tenant-scoped record carries
a tenant identifier and is protected by database-level Row-Level Security
(planned) plus mandatory application-level tenant filtering (implemented).

Architecture: Next.js App Router (server components + route handlers as the
backend), Prisma ORM over PostgreSQL, Auth.js (NextAuth v5) JWT sessions,
Zod input validation, Tailwind CSS for UI, Vitest for unit tests, Playwright
for e2e, Docker for containerization.

## 2. Technology stack & coding standards

- TypeScript **strict mode** is mandatory. Avoid `any` unless justified with a
  comment; ESLint warns on explicit `any`.
- Server-side logic lives in `src/lib` (services) and `src/app/api` (route
  handlers). Never trust the client for authorization.
- Validate **all** external input with Zod schemas in `src/lib/validation.ts`.
- Keep components small and reusable; no premature abstractions.
- Meaningful commit messages, logically grouped commits.

## 3. Directory conventions

```
src/app/          # App Router pages, layouts, API route handlers
src/lib/          # prisma client, auth, tenant scoping, rbac, validation, audit, errors
src/components/   # reusable React components (create when needed)
prisma/           # schema.prisma, seed.ts, migrations/
tests/unit/       # Vitest
tests/e2e/        # Playwright
architecture/     # decision documents (see README)
.github/workflows # CI
```

## 4. Database & migration conventions

- Schema changes go through Prisma. In development use `npm run db:push`;
  before any real deployment use `prisma migrate dev` and commit migration SQL.
- Use a **separate migration identity** from the restricted application runtime
  role (see `architecture/DATABASE_STRATEGY.md`).
- Never run destructive commands (`migrate reset`, `db drop`, `DROP TABLE`,
  `TRUNCATE`) without explicit human authorization.
- Never connect to or modify a production database from an agent session.
- Seed data must be synthetic only — never real student data.

## 5. Multi-tenant security requirements (mandatory)

- Every tenant-scoped table has a tenant column (`tenantId`, planned rename to
  `collegeId` in the RLS phase). Every query must filter by the tenant
  resolved **server-side from the session** (`src/lib/tenant.ts` →
  `requireTenant()`), never from client input.
- Mutations must re-verify row ownership with a tenant-scoped lookup.
- PostgreSQL Row-Level Security with FORCE is the planned defense-in-depth
  layer; application-level filtering alone is never sufficient.
- RLS context must be set transaction-locally (`SET LOCAL`) and cleared
  reliably.

## 6. Authentication & authorization standards

- Server-side authentication only (Auth.js v5, JWT sessions). Secure password
  hashing (bcrypt). Input validation on all auth endpoints.
- Centralized RBAC: the permission matrix in `src/lib/rbac.ts` is the single
  source of truth; API routes and server components must call `can(role, perm)`.
- Client-side role checks are UX only, never an authorization boundary.

## 7. Testing requirements

- Unit/integration: Vitest (`npm test`). e2e: Playwright (`npm run test:e2e`).
- Tests must verify actual behavior. Report the exact command and real output;
  never fabricate or assume results. If something cannot be executed in the
  environment (e.g. browser binaries blocked), say so explicitly.

## 8. Git branching & PR workflow

- Never commit or push directly to `main`; never force-push; never rewrite
  history. Work on the session's assigned feature branch and open a PR to
  `main`. Do not merge your own PR — wait for independent review.
- Keep the PR description honest: what changed, why, what was verified, what
  remains unverified, and known risks.

## 9. Forbidden destructive operations

No database resets/drops/truncates, no production migrations, no credential
exposure, no real student data, no deployment, no PR self-merge, no
deleting/renaming the repo root or `.git`.

## 10. Implementation tracking

Maintain `IMPLEMENTATION_STATUS.md` after every phase: current phase, done /
pending tasks, architecture decisions, **actual verification results**,
known limitations, unverified functionality, next-phase prerequisites. Never
mark work complete without executed evidence.
