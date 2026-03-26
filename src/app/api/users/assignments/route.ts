import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session || session.user.role !== "STRATEGY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, assignments } = body as {
    userId: string;
    assignments: { departmentId: string; permission: string }[];
  };

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Validate each assignment
  for (const a of assignments || []) {
    const parsed = assignmentSchema.safeParse({ userId, ...a });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assignment data" }, { status: 400 });
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
