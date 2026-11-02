import { z } from "zod";

export const slugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Slug may contain only lowercase letters, numbers and dashes");

export const registerTenantSchema = z.object({
  collegeName: z.string().min(3).max(120),
  slug: slugSchema,
  adminName: z.string().min(2).max(80),
  adminEmail: z.string().email(),
  password: z.string().min(10).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(),
});

export const companySchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().max(80).optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
});

export const jobPostingSchema = z.object({
  companyId: z.string().cuid(),
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(8000),
  jobType: z.enum(["FULL_TIME", "INTERNSHIP", "CONTRACT"]),
  location: z.string().max(120).optional(),
  packageCTC: z.coerce.number().positive().max(1_000_000_000).optional(),
  minCgpa: z.coerce.number().min(0).max(10).optional(),
  eligibleBatches: z.array(z.number().int().min(2000).max(2100)).min(1),
  eligibleDepts: z.array(z.string().min(1)).min(1),
  skillsRequired: z.array(z.string().min(1)).default([]),
  applicationDeadline: z.coerce.date().optional(),
});

export const studentProfileSchema = z.object({
  rollNumber: z.string().min(2).max(30),
  department: z.string().min(2).max(20),
  batch: z.number().int().min(2000).max(2100),
  cgpa: z.coerce.number().min(0).max(10).optional(),
  tenthPercent: z.coerce.number().min(0).max(100).optional(),
  twelfthPercent: z.coerce.number().min(0).max(100).optional(),
  backlogs: z.number().int().min(0).max(20).default(0),
  skills: z.array(z.string().min(1)).default([]),
});

export const applicationStatusSchema = z.enum([
  "APPLIED",
  "SHORTLISTED",
  "REJECTED",
  "WITHDRAWN",
  "OFFERED",
]);

export const interviewSchema = z.object({
  applicationId: z.string().cuid(),
  roundId: z.string().cuid().optional(),
  scheduledAt: z.coerce.date(),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
  venueOrLink: z.string().max(500).optional(),
});

export const offerSchema = z.object({
  applicationId: z.string().cuid(),
  ctc: z.coerce.number().positive().max(1_000_000_000),
  joiningDate: z.coerce.date().optional(),
  letterUrl: z.string().url().optional().or(z.literal("")),
});

export type JobPostingInput = z.infer<typeof jobPostingSchema>;
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
