import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { apiErrorResponse, forbidden } from "@/lib/errors";

export async function GET() {
  try {
    const { session, tenant } = await requireTenant();
    if (!can(session.user.role, "students:read")) throw forbidden();
    const students = await prisma.studentProfile.findMany({
      where: { tenantId: tenant.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ batch: "desc" }, { rollNumber: "asc" }],
    });
    return NextResponse.json({ students });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
