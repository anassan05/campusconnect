import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { forbidden } from "@/lib/errors";

export default async function CompaniesPage() {
  const { session, tenant } = await requireTenant();
  if (!can(session.user.role, "companies:manage")) throw forbidden();

  const companies = await prisma.company.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { jobPostings: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Companies</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{c.name}</h2>
            {c.industry && <p className="text-sm text-slate-500">{c.industry}</p>}
            <p className="mt-2 text-sm text-slate-600">{c._count.jobPostings} job posting(s)</p>
          </div>
        ))}
        {companies.length === 0 && <p className="text-slate-500">No companies yet.</p>}
      </div>
    </div>
  );
}
