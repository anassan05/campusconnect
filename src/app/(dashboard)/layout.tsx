import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isStaff } from "@/lib/tenant";
import { can } from "@/lib/rbac";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;
  const staff = isStaff(user.role);

  const links: { href: string; label: string }[] = [{ href: "/dashboard", label: "Overview" }];
  if (staff && can(user.role, "students:read")) links.push({ href: "/students", label: "Students" });
  if (staff && can(user.role, "companies:manage")) links.push({ href: "/companies", label: "Companies" });
  if (can(user.role, "jobs:read")) links.push({ href: "/jobs", label: "Jobs" });
  links.push({ href: "/applications", label: "Applications" });
  if (staff && can(user.role, "reports:read")) links.push({ href: "/reports", label: "Reports" });

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <Link href="/dashboard" className="mb-6 block text-xl font-extrabold text-brand-700">
          CampusConnect
        </Link>
        <p className="mb-4 text-xs text-slate-500">
          {user.name} · <span className="font-medium">{user.role}</span>
          {user.tenantSlug ? ` · ${user.tenantSlug}` : ""}
        </p>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
