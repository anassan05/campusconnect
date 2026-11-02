import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface AuditInput {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function auditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress,
      },
    });
  } catch {
    // Audit logging must never break the primary operation.
    console.error("auditLog failed", input.action);
  }
}
