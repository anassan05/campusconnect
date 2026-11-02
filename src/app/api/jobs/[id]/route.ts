import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { apiErrorResponse, forbidden, notFound } from "@/lib/errors";

const VALID_STATUSES = ["DRAFT", "OPEN", "CLOSED", "CANCELLED"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "jobs:manage")) throw forbidden();
    const { id } = await params;
    const body = await req.json();
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const existing = await prisma.jobPosting.findFirst({ where: { id, tenantId: tenant.id } });
    if (!existing) throw notFound("Job posting not found");
    const job = await prisma.jobPosting.update({
      where: { id },
      data: { ...(body.status ? { status: body.status } : {}), ...(body.title ? { title: body.title } : {}) },
    });
    await auditLog({ tenantId: tenant.id, userId: session.user.id, action: "job.update", entity: "JobPosting", entityId: job.id, metadata: { status: job.status } });
    return NextResponse.json({ job });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
