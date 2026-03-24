import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { departmentId } = await params;

  const isAdmin = session.user.role === "STRATEGY_MANAGER";
  const assignment = session.user.assignments?.find((a) => a.departmentId === departmentId);

  if (!isAdmin && (!assignment || assignment.permission !== "EDIT")) {
    return NextResponse.json({ error: "Forbidden — no edit access" }, { status: 403 });
  }

  const period = await prisma.period.findFirst({ where: { isActive: true } });
  if (!period) {
    return NextResponse.json({ error: "No active period" }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({
    where: { departmentId_periodId: { departmentId, periodId: period.id } },
  });

  if (!submission) {
    return NextResponse.json({ error: "No submission found" }, { status: 404 });
  }

  if (!isAdmin) {
    if (submission.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Already submitted" },
        { status: 400 }
      );
    }
    if (new Date() > period.deadline) {
      return NextResponse.json(
        { error: "Deadline has passed" },
        { status: 400 }
      );
    }
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
