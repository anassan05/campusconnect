import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { forbidden } from "@/lib/errors";

export default async function StudentsPage() {
  const { session, tenant } = await requireTenant();
  if (!can(session.user.role, "students:read")) throw forbidden();

  const students = await prisma.studentProfile.findMany({
    where: { tenantId: tenant.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ batch: "desc" }, { rollNumber: "asc" }],
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Students</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Roll no.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Dept</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">CGPA</th>
              <th className="px-4 py-3">Backlogs</th>
              <th className="px-4 py-3">Eligible</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{s.rollNumber}</td>
                <td className="px-4 py-3">{s.user.name}</td>
                <td className="px-4 py-3">{s.department}</td>
                <td className="px-4 py-3">{s.batch}</td>
                <td className="px-4 py-3">{s.cgpa?.toString() ?? "—"}</td>
                <td className="px-4 py-3">{s.backlogs}</td>
                <td className="px-4 py-3">{s.isEligible ? "✅" : "—"}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No students yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
