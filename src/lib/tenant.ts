import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * Resolves the active tenant for the current session.
 * SUPER_ADMIN must pass an explicit slug (platform console); tenant users get
 * their own tenant. Returns null when the session has no tenant context.
 */
export async function getSessionTenant(tenantSlugOverride?: string | null) {
  const session = await auth();
  if (!session?.user) return { session: null, tenant: null } as const;

  if (session.user.role === Role.SUPER_ADMIN) {
    if (!tenantSlugOverride) return { session, tenant: null } as const;
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlugOverride } });
    return { session, tenant } as const;
  }

  if (!session.user.tenantId) return { session, tenant: null } as const;
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
  return { session, tenant } as const;
}

/** Throws a 403-style error when the session is missing or has no tenant. */
export async function requireTenant() {
  const { session, tenant } = await getSessionTenant();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (!tenant) throw new Error("FORBIDDEN: no tenant in session");
  return { session, tenant };
}

export function isStaff(role: Role): boolean {
  return role === Role.ADMIN || role === Role.TPO || role === Role.FACULTY || role === Role.SUPER_ADMIN;
}
