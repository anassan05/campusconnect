# Role Model (planned target)

> Status: 📋 **planned.** Phase 0 contains no role code. This is the required
> five-role model for the product.

| Role | Scope | Key abilities (planned) |
|---|---|---|
| `PLATFORM_SUPER_ADMIN` | Platform, cross-tenant (explicit tenant selection required) | Approve colleges, platform settings, audit access |
| `COLLEGE_ADMIN` | One college | Workspace settings, user management, audit |
| `PLACEMENT_OFFICER` | One college | Companies, drives, applications, rounds, offers, reports |
| `COORDINATOR` | One college (department/section scope) | Student management, drive coordination workflows |
| `STUDENT` | One college | Own profile/documents, drive registration, own applications & offers |

Rules:
- A user belongs to at most one college (except PLATFORM_SUPER_ADMIN).
- Authorization is always enforced server-side against a central permission
  matrix; client-side role checks are UX only.

Note: an earlier in-progress draft used a six-role variant; that code was
removed from Phase 0 per review, and this five-role model is the target.
