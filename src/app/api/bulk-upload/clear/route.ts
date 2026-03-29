import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Clear all objectives and actions for the org (used before "replace" upload)
export async function POST() {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const departments = await prisma.department.findMany({
    where: orgWhere,
    select: { id: true },
  });

  const deptIds = departments.map((d) => d.id);

  // Only delete objectives/actions that have no submission entries
  const deletedObjectives = await prisma.objective.deleteMany({
    where: {
      departmentId: { in: deptIds },
      entries: { none: {} },
    },
  });

  const deletedActions = await prisma.keyAction.deleteMany({
    where: {
      departmentId: { in: deptIds },
      entries: { none: {} },
    },
  });

  return NextResponse.json({
    cleared: {
      objectives: deletedObjectives.count,
      actions: deletedActions.count,
    },
  });
}
