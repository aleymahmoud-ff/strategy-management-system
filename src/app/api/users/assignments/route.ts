import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignmentSchema = z.object({
  userId: z.string().min(1),
  departmentId: z.string().min(1),
  permission: z.enum(["EDIT", "VIEW_ONLY"]),
});

// PUT: Set all assignments for a user (replaces existing)
export async function PUT(req: NextRequest) {
  const { error, orgWhere } = await getTenantSession("STRATEGY_MANAGER");
  if (error) return error;

  const body = await req.json();
  const { userId, assignments } = body as {
    userId: string;
    assignments: { departmentId: string; permission: string }[];
  };

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Verify user belongs to org
  const user = await prisma.user.findFirst({ where: { id: userId, ...orgWhere } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Validate each assignment
  for (const a of assignments || []) {
    const parsed = assignmentSchema.safeParse({ userId, ...a });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assignment data" }, { status: 400 });
    }
  }

  // Verify all departmentIds belong to the org
  const departmentIds = (assignments || []).map((a: { departmentId: string }) => a.departmentId);
  if (departmentIds.length > 0) {
    const deptCount = await prisma.department.count({
      where: { id: { in: departmentIds }, ...orgWhere },
    });
    if (deptCount !== departmentIds.length) {
      return NextResponse.json({ error: "One or more departments not found" }, { status: 404 });
    }
  }

  // Replace all assignments for this user
  await prisma.$transaction([
    prisma.userDepartment.deleteMany({ where: { userId } }),
    ...((assignments || []).map((a: { departmentId: string; permission: string }) =>
      prisma.userDepartment.create({
        data: { userId, departmentId: a.departmentId, permission: a.permission },
      })
    )),
  ]);

  // Also update the legacy departmentId field (first EDIT assignment)
  const firstEdit = (assignments || []).find((a: { permission: string }) => a.permission === "EDIT");
  await prisma.user.update({
    where: { id: userId },
    data: { departmentId: firstEdit ? firstEdit.departmentId : null },
  });

  const updated = await prisma.userDepartment.findMany({
    where: { userId },
    select: { departmentId: true, permission: true, department: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}
