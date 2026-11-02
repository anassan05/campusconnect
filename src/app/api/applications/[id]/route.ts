import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { applicationStatusSchema } from "@/lib/validation";
import { auditLog } from "@/lib/audit";
import { apiErrorResponse, forbidden, notFound } from "@/lib/errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "applications:manage")) throw forbidden();
    const { id } = await params;
    const body = applicationStatusSchema.parse(await req.json());

    const existing = await prisma.application.findFirst({ where: { id, tenantId: tenant.id } });
    if (!existing) throw notFound("Application not found");

    const app = await prisma.application.update({ where: { id }, data: { status: body } });
    await auditLog({ tenantId: tenant.id, userId: session.user.id, action: "application.status", entity: "Application", entityId: app.id, metadata: { status: body } });
    return NextResponse.json({ application: app });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
