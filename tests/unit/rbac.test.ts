import { describe, it, expect } from "vitest";
import { can, PERMISSIONS } from "@/lib/rbac";
import { Role } from "@prisma/client";

describe("RBAC permission matrix", () => {
  it("students cannot manage jobs or companies", () => {
    expect(can(Role.STUDENT, "jobs:manage")).toBe(false);
    expect(can(Role.STUDENT, "companies:manage")).toBe(false);
    expect(can(Role.STUDENT, "applications:manage")).toBe(false);
  });

  it("students can read open jobs", () => {
    expect(can(Role.STUDENT, "jobs:read")).toBe(true);
  });

  it("TPO can manage companies, jobs, applications, offers", () => {
    expect(can(Role.TPO, "companies:manage")).toBe(true);
    expect(can(Role.TPO, "jobs:manage")).toBe(true);
    expect(can(Role.TPO, "applications:manage")).toBe(true);
    expect(can(Role.TPO, "offers:manage")).toBe(true);
  });

  it("faculty is read-only for students and jobs", () => {
    expect(can(Role.FACULTY, "students:read")).toBe(true);
    expect(can(Role.FACULTY, "students:write")).toBe(false);
    expect(can(Role.FACULTY, "jobs:manage")).toBe(false);
  });

  it("only admin/super-admin can manage users and read audit logs", () => {
    expect(can(Role.TPO, "users:manage")).toBe(false);
    expect(can(Role.ADMIN, "users:manage")).toBe(true);
    expect(can(Role.SUPER_ADMIN, "audit:read")).toBe(true);
    expect(can(Role.TPO, "audit:read")).toBe(false);
  });

  it("every permission has at least one allowed role", () => {
    for (const roles of Object.values(PERMISSIONS)) {
      expect(roles.length).toBeGreaterThan(0);
    }
  });
});
