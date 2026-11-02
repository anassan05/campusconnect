"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm() {
  const params = useSearchParams();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {
    error: params.get("error") === "CredentialsSignin" ? "Invalid email, password or college slug." : null,
  });

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="tenantSlug" className="mb-1 block text-sm font-medium text-slate-700">
          College slug (leave blank for platform admin)
        </label>
        <input
          id="tenantSlug"
          name="tenantSlug"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          placeholder="e.g. iit-demo"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
