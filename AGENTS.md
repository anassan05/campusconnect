# AGENTS.md — CampusConnect engineering instructions for AI coding agents

Audience: Arena, Codex, ChatGPT or any future AI agent working in this
repository. Read this before making changes; follow it unless the human
operator explicitly overrides a rule in writing.

## 1. Project purpose & architecture

CampusConnect is a planned **multi-tenant SaaS platform for college placement
management** for engineering colleges in India. One shared PostgreSQL database
will serve many colleges ("tenants"); tenant-scoped records will carry a tenant
identifier and will be protected by PostgreSQL Row-Level Security **plus**
mandatory application-level tenant filtering. Currently (Phase 0) only the
engineering foundation exists — see `architecture/SYSTEM_ARCHITECTURE.md` for
what is implemented vs planned.

## 2. Technology stack & coding standards

- Next.js App Router, React, TypeScript **strict mode** (mandatory; avoid
  `any` unless justified with a comment), Tailwind CSS.
- PostgreSQL 16 + Prisma. Auth, Zod validation and REST APIs are planned for
  Phase 1+ — do not introduce them early.
- Server-side logic belongs in `src/lib` and `src/app/api`; never trust the
  client for authorization.
- Meaningful, logically grouped commits.

## 3. Directory conventions

```
src/app/          # App Router pages, layouts, API route handlers
src/lib/          # shared server utilities
prisma/           # schema.prisma, migrations/ (created with first domain schema)
tests/unit/       # Vitest
tests/e2e/        # Playwright
architecture/     # decision documents
.github/workflows # CI
```

## 4. Database & migration conventions

- Schema changes go through Prisma. Dev uses `db:push`; committed migration SQL
  via `prisma migrate dev` starts with the first domain schema.
- Use a **separate migration identity** from the restricted application runtime
  role (see `architecture/DATABASE_STRATEGY.md`).
- Never run destructive commands (`migrate reset`, `db drop`, DROP/TRUNCATE)
  without explicit human authorization. Never touch a production database.
- Seed data, when introduced, must be synthetic only — never real student data.

## 5. Multi-tenant security requirements (mandatory once domain code lands)

- Every tenant-scoped table gets a tenant column; every query filters by the
  tenant resolved **server-side from the session**, never from client input.
- RLS with FORCE on tenant-owned tables; transaction-local context via
  `SET LOCAL`, always reset. Application-level filtering alone is never enough.

## 6. Authentication & authorization standards (planned)

- Server-side authentication, secure password hashing, secure sessions.
- Centralized server-side RBAC against the five-role model in
  `architecture/ROLE_MODEL.md`. Client-side role checks are UX only.

## 7. Testing requirements

- Unit: Vitest (`npm test`). e2e: Playwright (`npm run test:e2e`).
- Tests must verify actual behavior. Report exact commands and real output;
  never fabricate results. If something cannot be executed in the environment,
  say so explicitly.

## 8. Git branching & PR workflow

- Never commit/push directly to `main`; never force-push; never rewrite history.
  Work on the session's assigned branch, open a PR to `main`, and **do not merge
  your own PR** — wait for independent review.
- PR descriptions must state what changed, why, what was verified, what remains
  unverified, and known risks.

## 9. Forbidden destructive operations

No database resets/drops/truncates, no production migrations, no credential
exposure, no real student data, no deployment, no PR self-merge, no
deleting/renaming the repo root or `.git`.

## 10. Implementation tracking

Maintain `IMPLEMENTATION_STATUS.md` after every phase: current phase, done /
pending tasks, architecture decisions, **actual verification results**, known
limitations, unverified functionality, next-phase prerequisites. Never mark work
complete without executed evidence.
