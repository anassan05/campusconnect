# CampusConnect

Multi-tenant **College Placement Management SaaS** for engineering colleges in India.

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, strict TypeScript, Tailwind CSS
- **Backend:** Next.js API routes + server actions, Zod validation
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Auth.js / NextAuth v5 (JWT sessions, credentials provider, bcrypt)
- **Tests:** Vitest (unit) + Playwright (e2e)
- **Ops:** Docker / docker-compose

## Multi-tenancy model

Every tenant-scoped table carries `tenantId`. The active tenant is resolved from
the authenticated session (or an explicit slug for `SUPER_ADMIN`) and **every**
query is filtered by it — see `src/lib/tenant.ts` (`requireTenant`). Row-level
isolation is additionally enforced by looking up records with
`findFirst({ where: { id, tenantId } })` before any mutation.

## Roles & RBAC

`SUPER_ADMIN`, `ADMIN`, `TPO`, `FACULTY`, `STUDENT`, `COMPANY`.
The permission matrix lives in `src/lib/rbac.ts` and is enforced in API routes
and server components.

## Getting started

```bash
cp .env.example .env.local       # set DATABASE_URL, AUTH_SECRET
docker compose up -d postgres     # local Postgres
npm run db:push                   # apply schema
npm run db:seed                   # demo tenant: demo-it
npm run dev                       # http://localhost:3000
```

Demo credentials (synthetic data only): `admin@demo.edu` / `Password123!`
with college slug `demo-it`.

## Tests

```bash
npm test                # Vitest unit tests
npm run test:e2e        # Playwright e2e (starts dev server automatically)
```

## Production / Docker

```bash
AUTH_SECRET=$(openssl rand -base64 32) docker compose up -d --build
```

Never commit `.env*` files or real student data.
