import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 rounded-full bg-brand-50 px-4 py-1 text-sm font-medium text-brand-700">
        Multi-tenant placement platform for engineering colleges
      </p>
      <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
        Campus<span className="text-brand-600">Connect</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        Streamline campus placements: manage companies, job postings, student
        eligibility, applications, interviews and offers — all scoped securely
        per college.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow hover:bg-brand-700"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
        >
          Register your college
        </Link>
      </div>
    </main>
  );
}
