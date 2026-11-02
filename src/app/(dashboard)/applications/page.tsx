import { requireTenant, isStaff } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function ApplicationsPage() {
  const { session, tenant } = await requireTenant();
  const staff = isStaff(session.user.role);

  const applications = await prisma.application.findMany({
    where: {
      tenantId: tenant.id,
      ...(staff ? {} : { student: { userId: session.user.id } }),
    },
    include: {
      job: { include: { company: true } },
      student: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { appliedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Applications</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Company</th>
              {staff && <th className="px-4 py-3">Student</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Applied</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{a.job.title}</td>
                <td className="px-4 py-3">{a.job.company.name}</td>
                {staff && <td className="px-4 py-3">{a.student.user.name}</td>}
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{a.status}</span>
                </td>
                <td className="px-4 py-3">{a.appliedAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
