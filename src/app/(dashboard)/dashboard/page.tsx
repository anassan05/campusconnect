import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/tenant";

export default async function DashboardPage() {
  const { session, tenant } = await requireTenant();
  const tid = tenant.id;
  const staff = isStaff(session.user.role);

  const [students, companies, openJobs, applications, offers] = await Promise.all([
    staff ? prisma.studentProfile.count({ where: { tenantId: tid } }) : prisma.studentProfile.count({ where: { tenantId: tid, userId: session.user.id } }),
    staff ? prisma.company.count({ where: { tenantId: tid } }) : 0,
    prisma.jobPosting.count({ where: { tenantId: tid, status: "OPEN" } }),
    staff
      ? prisma.application.count({ where: { tenantId: tid } })
      : prisma.application.count({ where: { tenantId: tid, student: { userId: session.user.id } } }),
    staff ? prisma.offer.count({ where: { tenantId: tid } }) : prisma.offer.count({ where: { tenantId: tid, student: { userId: session.user.id } } }),
  ]);

  const cards = [
    staff && { label: "Students", value: students },
    staff && { label: "Companies", value: companies },
    { label: "Open job postings", value: openJobs },
    { label: "Applications", value: applications },
    { label: "Offers", value: offers },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Welcome, {session.user.name}</h1>
      <p className="mb-8 text-slate-600">{tenant.name} — placement overview</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
