import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const { error, session, orgWhere } = await getTenantSession();
  if (error) return error;

  const { departmentId } = await params;

  // Verify department belongs to org
  const deptCheck = await prisma.department.findFirst({ where: { id: departmentId, ...orgWhere } });
  if (!deptCheck) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "STRATEGY_MANAGER";
  const assignment = session.user.assignments?.find((a) => a.departmentId === departmentId);

  if (!isAdmin && (!assignment || assignment.permission !== "EDIT")) {
    return NextResponse.json({ error: "Forbidden — no edit access" }, { status: 403 });
  }

  // Period selection: explicit periodId from body, otherwise the most recent active period.
  // Function heads may only submit against periods that are currently active.
  let body: { periodId?: string } = {};
  try { body = await req.json(); } catch {}
  const targetPeriodId = body.periodId || null;
  let period;
  if (targetPeriodId) {
    const where = isAdmin
      ? { id: targetPeriodId, ...orgWhere }
      : { id: targetPeriodId, isActive: true, ...orgWhere };
    period = await prisma.period.findFirst({ where });
    if (!period) {
      return NextResponse.json({ error: "Period not available" }, { status: 404 });
    }
  } else {
    period = await prisma.period.findFirst({
      where: { isActive: true, ...orgWhere },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    if (!period) {
      return NextResponse.json({ error: "No active period" }, { status: 404 });
    }
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
