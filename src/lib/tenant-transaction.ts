import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Server-only boundary: collegeId MUST be resolved from a verified server-side
 * identity and authorization decision, never directly from request input.
 * Phase 1A provides no authentication or callers that establish that trust.
 * All tenant queries must also explicitly filter by this same collegeId.
 */
export async function withTenantTransaction<T>(
  client: PrismaClient,
  collegeId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collegeId)) {
    throw new Error("A valid trusted college ID is required");
  }
  const normalizedCollegeId = collegeId.toLowerCase();
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.college_id', ${normalizedCollegeId}, true)`;
    return operation(tx);
  });
}
