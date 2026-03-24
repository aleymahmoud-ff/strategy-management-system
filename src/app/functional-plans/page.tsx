import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DepartmentSelector } from "@/components/functional-plans/department-selector";

export default async function FunctionalPlansPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "EXECUTIVE") redirect("/dashboard");

  // Function heads with exactly one EDIT assignment go directly to that department
  if (session.user.role === "FUNCTION_HEAD") {
    const editAssignments = session.user.assignments.filter((a) => a.permission === "EDIT");
    if (editAssignments.length === 1 && session.user.assignments.length === 1) {
      redirect(`/functional-plans/${editAssignments[0].departmentId}`);
    }
  }

  const period = await prisma.period.findFirst({ where: { isActive: true } });
  if (!period) {
    return (
      <main className="flex-1 p-8">
        <p className="text-text-sub">No active period found.</p>
      </main>
    );
  }

  // For FUNCTION_HEAD: only show assigned departments
  // For STRATEGY_MANAGER: show all departments
  const assignedDepartmentIds = session.user.assignments.map((a) => a.departmentId);
  const whereClause = session.user.role === "FUNCTION_HEAD"
    ? { id: { in: assignedDepartmentIds } }
    : {};

  const departments = await prisma.department.findMany({
    where: whereClause,
    orderBy: { sortOrder: "asc" },
    include: {
      objectives: true,
      submissions: {
        where: { periodId: period.id },
        select: { status: true, submittedAt: true },
      },
    },
  });

  // Build assignment permission map for the current user
  const permissionMap: Record<string, string> = {};
  for (const a of session.user.assignments) {
    permissionMap[a.departmentId] = a.permission;
  }

  const data = departments.map((d) => ({
    id: d.id,
    name: d.name,
    headName: d.headName,
    initials: d.initials,
    objectiveCount: d.objectives.length,
    submissionStatus: (d.submissions[0]?.status as string) || null,
    submittedAt: d.submissions[0]?.submittedAt?.toISOString() || null,
    permission: permissionMap[d.id] || (session.user.role === "STRATEGY_MANAGER" ? "EDIT" : "VIEW_ONLY"),
  }));

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="font-heading text-[32px] font-bold text-text-hd">
          Functional Plans
        </h1>
        <p className="mt-1 text-[13px] text-text-sub">
          {period.label} &middot; Select a department to view or submit their plan
        </p>
      </div>
      <DepartmentSelector departments={data} />
    </main>
  );
}
