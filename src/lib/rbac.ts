import { Role } from "@prisma/client";

/**
 * Role-based permission matrix. Each entry lists roles allowed to perform the
 * action. Used by API routes and server components.
 */
export const PERMISSIONS = {
  "tenant:manage": [Role.SUPER_ADMIN, Role.ADMIN],
  "users:manage": [Role.SUPER_ADMIN, Role.ADMIN],
  "students:read": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO, Role.FACULTY],
  "students:write": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO],
  "companies:manage": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO],
  "jobs:manage": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO, Role.COMPANY],
  "jobs:read": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO, Role.FACULTY, Role.STUDENT, Role.COMPANY],
  "applications:manage": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO, Role.COMPANY],
  "applications:own": [Role.STUDENT],
  "interviews:manage": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO, Role.COMPANY],
  "offers:manage": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO],
  "reports:read": [Role.SUPER_ADMIN, Role.ADMIN, Role.TPO],
  "audit:read": [Role.SUPER_ADMIN, Role.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
