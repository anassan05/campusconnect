"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerTenantSchema } from "@/lib/validation";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export type RegisterState = { error: string | null };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = registerTenantSchema.safeParse({
    collegeName: formData.get("collegeName"),
    slug: formData.get("slug"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { collegeName, slug, adminName, adminEmail, password } = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) return { error: "That college slug is already taken." };
  const existingUser = await prisma.user.findFirst({ where: { email: adminEmail.toLowerCase() } });
  if (existingUser) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: collegeName, slug } });
    await tx.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        name: adminName,
        passwordHash,
        role: Role.ADMIN,
        tenantId: tenant.id,
      },
    });
    await tx.tenantSetting.create({ data: { tenantId: tenant.id } });
  });

  redirect(`/login?tenant=${slug}`);
}
