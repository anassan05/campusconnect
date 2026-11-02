import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { forbidden } from "@/lib/errors";

export default async function ReportsPage() {
  const { session, tenant } = await requireTenant();
  if (!can(session.user.role, "reports:read")) throw forbidden();

  const byStatus = await prisma.application.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: { _all: true },
  });

  const topCompanies = await prisma.company.findMany({
    where: { tenantId: tenant.id },
    include: { jobPostings: { include: { _count: { select: { applications: true } } } } },
    take: 10,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Placement reports</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Applications by status</h2>
          <ul className="space-y-2 text-sm">
            {byStatus.map((b) => (
              <li key={b.status} className="flex justify-between">
                <span>{b.status}</span>
                <span className="font-semibold">{b._count._all}</span>
              </li>
            ))}
            {byStatus.length === 0 && <li className="text-slate-500">No data yet.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Top companies by applications</h2>
          <ul className="space-y-2 text-sm">
            {topCompanies.map((c) => {
              const count = c.jobPostings.reduce((n, j) => n + j._count.applications, 0);
              return (
                <li key={c.id} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              );
            })}
            {topCompanies.length === 0 && <li className="text-slate-500">No data yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
