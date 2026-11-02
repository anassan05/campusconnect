"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const tenantSlug = String(formData.get("tenantSlug") ?? "") || undefined;

  try {
    await signIn("credentials", { email, password, tenantSlug, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Invalid email, password or college slug." };
    throw err;
  }
  redirect("/dashboard");
}
