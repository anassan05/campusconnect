import { NextRequest, NextResponse } from "next/server";
import { requireTenant, isStaff } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { apiErrorResponse, badRequest, conflict, forbidden, notFound } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const { session, tenant } = await requireTenant();
    const staff = isStaff(session.user.role);
    const apps = await prisma.application.findMany({
      where: {
        tenantId: tenant.id,
        ...(staff ? {} : { student: { userId: session.user.id } }),
      },
      include: { job: { include: { company: true } }, student: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { appliedAt: "desc" },
    });
    return NextResponse.json({ applications: apps });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

/** Student self-apply to an open job (tenant-scoped, eligibility-checked). */
export async function POST(req: NextRequest) {
  try {
    const { session, tenant } = await requireTenant();
    if (session.user.role !== "STUDENT") throw forbidden("Only students can apply");
    const { jobId } = await req.json();
    if (!jobId) throw badRequest("jobId is required");

    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile || profile.tenantId !== tenant.id) throw notFound("Student profile not found");
    if (!profile.isEligible) throw forbidden("Your profile is currently not eligible");

    const job = await prisma.jobPosting.findFirst({ where: { id: jobId, tenantId: tenant.id } });
    if (!job) throw notFound("Job posting not found");
    if (job.status !== "OPEN") throw conflict("This job is not open for applications");
    if (job.minCgpa && profile.cgpa && Number(profile.cgpa) < Number(job.minCgpa)) {
      throw forbidden("CGPA below the minimum for this role");
    }
    if (!job.eligibleBatches.includes(profile.batch)) throw forbidden("Your batch is not eligible for this role");
    if (!job.eligibleDepts.includes(profile.department)) throw forbidden("Your department is not eligible for this role");

    const existing = await prisma.application.findUnique({ where: { jobId_studentId: { jobId, studentId: profile.id } } });
    if (existing) throw conflict("You have already applied to this job");

    const application = await prisma.application.create({
      data: { tenantId: tenant.id, jobId, studentId: profile.id },
    });
    await auditLog({ tenantId: tenant.id, userId: session.user.id, action: "application.create", entity: "Application", entityId: application.id });
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
