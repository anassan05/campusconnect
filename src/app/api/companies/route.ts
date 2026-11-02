import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { companySchema } from "@/lib/validation";
import { auditLog } from "@/lib/audit";
import { apiErrorResponse, forbidden, unauthorized } from "@/lib/errors";

export async function GET() {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "companies:manage") && !can(session.user.role, "jobs:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companies = await prisma.company.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ companies });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return unauthorized().message ? NextResponse.json({ error: "Authentication required" }, { status: 401 }) : NextResponse.json({});
    return apiErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "companies:manage")) throw forbidden();
    const body = companySchema.parse(await req.json());
    const company = await prisma.company.create({
      data: { ...body, tenantId: tenant.id },
    });
    await auditLog({ tenantId: tenant.id, userId: session.user.id, action: "company.create", entity: "Company", entityId: company.id });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
