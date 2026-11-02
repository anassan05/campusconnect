import { describe, it, expect } from "vitest";
import {
  slugSchema,
  jobPostingSchema,
  studentProfileSchema,
  applicationStatusSchema,
  registerTenantSchema,
} from "@/lib/validation";

describe("slugSchema", () => {
  it("accepts valid slugs", () => {
    expect(slugSchema.safeParse("iit-demo-2026").success).toBe(true);
  });
  it("rejects uppercase, spaces, and short slugs", () => {
    expect(slugSchema.safeParse("IIT Demo").success).toBe(false);
    expect(slugSchema.safeParse("ab").success).toBe(false);
    expect(slugSchema.safeParse("has_underscore").success).toBe(false);
  });
});

describe("jobPostingSchema", () => {
  const valid = {
    companyId: "clx1234567890abcdefgh",
    title: "Software Engineer",
    description: "Work on our core platform team building delightful products.",
    jobType: "FULL_TIME",
    eligibleBatches: [2026],
    eligibleDepts: ["CSE"],
  };
  it("accepts a valid posting and coerces numbers", () => {
    const r = jobPostingSchema.safeParse({ ...valid, packageCTC: "12.5", minCgpa: "7.5" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.packageCTC).toBe(12.5);
      expect(r.data.minCgpa).toBe(7.5);
    }
  });
  it("rejects CGPA above 10", () => {
    expect(jobPostingSchema.safeParse({ ...valid, minCgpa: 11 }).success).toBe(false);
  });
  it("rejects too-short description", () => {
    expect(jobPostingSchema.safeParse({ ...valid, description: "short" }).success).toBe(false);
  });
});

describe("studentProfileSchema", () => {
  it("defaults backlogs to 0 and skills to []", () => {
    const r = studentProfileSchema.safeParse({
      rollNumber: "21CS001",
      department: "CSE",
      batch: 2026,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.backlogs).toBe(0);
      expect(r.data.skills).toEqual([]);
    }
  });
  it("rejects impossible batch year", () => {
    expect(studentProfileSchema.safeParse({ rollNumber: "X", department: "CSE", batch: 1999 }).success).toBe(false);
  });
});

describe("applicationStatusSchema", () => {
  it("accepts known statuses and rejects others", () => {
    expect(applicationStatusSchema.safeParse("SHORTLISTED").success).toBe(true);
    expect(applicationStatusSchema.safeParse("HIRED").success).toBe(false);
  });
});

describe("registerTenantSchema", () => {
  it("requires a strong-enough password", () => {
    const base = {
      collegeName: "Demo Institute of Technology",
      slug: "demo-it",
      adminName: "Admin One",
      adminEmail: "admin@demo.edu",
    };
    expect(registerTenantSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(registerTenantSchema.safeParse({ ...base, password: "longenoughpassword" }).success).toBe(true);
  });
});
