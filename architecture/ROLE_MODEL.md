# Role Model

| Role | Scope | Key abilities |
|---|---|---|
| `SUPER_ADMIN` | Platform, cross-tenant (explicit slug required) | Tenant management, audit access |
| `ADMIN` | One college | User management, settings, audit |
| `TPO` | One college | Companies, drives/jobs, applications, interviews, offers, reports |
| `FACULTY` | One college | Read students/jobs (read-only) |
| `STUDENT` | One college | Own profile, apply to open jobs, view own applications/offers |
| `COMPANY` | One college | Manage own postings, drive participation |

The authoritative mapping is the permission matrix in `src/lib/rbac.ts`
(`PERMISSIONS` + `can()`), enforced server-side. Planned product roles
(`PLATFORM_SUPER_ADMIN`, `COLLEGE_ADMIN`, `PLACEMENT_OFFICER`, `COORDINATOR`,
`STUDENT`) map onto this model in later phases.

Rules:
- A user belongs to at most one tenant (except SUPER_ADMIN).
- Role checks never happen only on the client.
