import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      tenantId: string | null;
      tenantSlug: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    tenantId: string | null;
    tenantSlug: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    tenantId: string | null;
    tenantSlug: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "College slug", type: "text" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const email = String(creds.email).toLowerCase().trim();
        const tenantSlug = creds.tenantSlug ? String(creds.tenantSlug).toLowerCase().trim() : null;

        const tenant = tenantSlug
          ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
          : null;

        // SUPER_ADMIN signs in without a tenant slug.
        const user = await prisma.user.findFirst({
          where: tenantSlug
            ? { email, tenantId: tenant?.id ?? "__none__" }
            : { email, role: Role.SUPER_ADMIN },
          include: { tenant: true },
        });
        if (!user || !user.isActive || !user.passwordHash) return null;
        if (tenantSlug && !tenant) return null;
        if (!tenantSlug && user.role !== Role.SUPER_ADMIN) return null;

        const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
      return session;
    },
  },
});
