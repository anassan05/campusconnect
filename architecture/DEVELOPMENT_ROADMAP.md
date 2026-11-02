# Development Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Engineering foundation & architecture docs | ✅ complete and merged (PR #1, merge commit `992c313af60a7126fd716ad2e3eb2642709f1e9f`) |
| 1A | Identity and tenant database foundation (schema, RLS, role separation) | 🚧 PostgreSQL CI passed; independent review and approval pending |
| 1B | Authentication, session-derived tenant authorization, five-role RBAC | 📋 planned; awaits Phase 1A review and approval |
| 2 | College onboarding & platform approval | 📋 |
| 3 | Student management & document handling | 📋 |
| 4 | Company & placement drive management | 📋 |
| 5 | Deterministic eligibility engine (no AI decisions) | 📋 |
| 6 | Student drive registration | 📋 |
| 7 | Recruitment rounds, results & offers | 📋 |
| 8 | Student placement portal | 📋 |
| 9 | Coordinator functionality | 📋 |
| 10 | Reporting & analytics | 📋 |
| 11 | Notifications (with trusted delivery evidence) | 📋 |
| 12 | Production readiness & deployment | 📋 |

Rules:
- A phase starts only after the previous phase's PR is reviewed and approved.
- Never merge your own PR; never push to `main`; no destructive DB ops.
- Verification claims must come from executed commands, recorded in
  `IMPLEMENTATION_STATUS.md`.
