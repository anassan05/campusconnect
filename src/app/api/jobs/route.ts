import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { jobPostingSchema } from "@/lib/validation";
import { auditLog } from "@/lib/audit";
import { apiErrorResponse, badRequest, forbidden } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "jobs:read")) throw forbidden();
    const status = req.nextUrl.searchParams.get("status");
    const jobs = await prisma.jobPosting.findMany({
      where: {
        tenantId: tenant.id,
        ...(session.user.role === "STUDENT" ? { status: "OPEN" } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ jobs });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "jobs:manage")) throw forbidden();
    const body = jobPostingSchema.parse(await req.json());
    const company = await prisma.company.findFirst({ where: { id: body.companyId, tenantId: tenant.id } });
    if (!company) throw badRequest("Company not found in this tenant");
    const job = await prisma.jobPosting.create({
      data: { ...body, tenantId: tenant.id, status: "OPEN" },
    });
    await auditLog({ tenantId: tenant.id, userId: session.user.id, action: "job.create", entity: "JobPosting", entityId: job.id });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
