"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "./actions";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, { error: null });

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">College name</label>
        <input name="collegeName" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Tenant slug</label>
        <input name="slug" required placeholder="e.g. iit-demo" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Admin name</label>
        <input name="adminName" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Admin email</label>
        <input name="adminEmail" type="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password (min 10 chars)</label>
        <input name="password" type="password" required minLength={10} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create college workspace"}
      </button>
    </form>
  );
}
