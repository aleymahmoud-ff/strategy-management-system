import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assignmentSchema = z.object({
  userId: z.string().min(1),
  divisionId: z.string().min(1),
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
    assignments: { divisionId: string; permission: string }[];
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
    prisma.userDivision.deleteMany({ where: { userId } }),
    ...((assignments || []).map((a: { divisionId: string; permission: string }) =>
      prisma.userDivision.create({
        data: { userId, divisionId: a.divisionId, permission: a.permission },
      })
    )),
  ]);

  // Also update the legacy divisionId field (first EDIT assignment)
  const firstEdit = (assignments || []).find((a: { permission: string }) => a.permission === "EDIT");
  await prisma.user.update({
    where: { id: userId },
    data: { divisionId: firstEdit ? firstEdit.divisionId : null },
  });

  const updated = await prisma.userDivision.findMany({
    where: { userId },
    select: { divisionId: true, permission: true, division: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}
