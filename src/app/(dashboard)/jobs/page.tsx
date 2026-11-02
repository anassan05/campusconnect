import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function JobsPage() {
  const { session, tenant } = await requireTenant();
  const isStudent = session.user.role === "STUDENT";

  const jobs = await prisma.jobPosting.findMany({
    where: { tenantId: tenant.id, ...(isStudent ? { status: "OPEN" } : {}) },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Job postings</h1>
      <div className="space-y-4">
        {jobs.map((j) => (
          <div key={j.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{j.title}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${j.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {j.status}
              </span>
            </div>
            <p className="text-sm font-medium text-brand-700">{j.company.name}</p>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{j.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {j.location && <span>📍 {j.location}</span>}
              {j.packageCTC && <span>💰 ₹{j.packageCTC.toString()} LPA</span>}
              {j.minCgpa && <span>🎓 min CGPA {j.minCgpa.toString()}</span>}
              <span>🏷 {j.jobType}</span>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-slate-500">No job postings found.</p>}
      </div>
    </div>
  );
}
