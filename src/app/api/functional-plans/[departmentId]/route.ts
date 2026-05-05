import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { saveDraftSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// GET: Load form data for a department
export async function GET(
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

  // Check access: admin sees all, function heads need an assignment
  const isAdmin = session.user.role === "STRATEGY_MANAGER";
  const assignment = session.user.assignments?.find((a) => a.departmentId === departmentId);
  if (!isAdmin && !assignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userPermission = isAdmin ? "EDIT" : (assignment?.permission || "VIEW_ONLY");

  // Period selection: explicit periodId from query, otherwise the most recent active period.
  // Function heads may only target periods that are currently active. Admins may target any period in the org.
  const periodIdParam = req.nextUrl.searchParams.get("periodId");
  let period;
  if (periodIdParam) {
    const where = isAdmin
      ? { id: periodIdParam, ...orgWhere }
      : { id: periodIdParam, isActive: true, ...orgWhere };
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

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      objectives: { orderBy: { sortOrder: "asc" } },
      keyActions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  // Find or create submission
  let submission = await prisma.submission.findUnique({
    where: {
      departmentId_periodId: { departmentId, periodId: period.id },
    },
    include: {
      objectiveEntries: true,
      actionEntries: true,
    },
  });

  if (!submission) {
    submission = await prisma.submission.create({
      data: { departmentId, periodId: period.id, status: "DRAFT" },
      include: { objectiveEntries: true, actionEntries: true },
    });
  }

  // Determine lock state
  const now = new Date();
  const pastDeadline = now > period.deadline;
  const isSubmitted = submission.status === "SUBMITTED";
  // Locked if: VIEW_ONLY permission, OR function head past deadline/submitted
  // Admins: never locked
  const isLocked = userPermission === "VIEW_ONLY"
    ? true
    : isAdmin ? false : (pastDeadline || isSubmitted);

  return NextResponse.json({
    period: {
      id: period.id,
      label: period.label,
      deadline: period.deadline.toISOString(),
    },
    department: {
      id: department.id,
      name: department.name,
      headName: department.headName,
      initials: department.initials,
    },
    submission: {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString() || null,
    },
    isLocked,
    isAdmin,
    permission: userPermission,
    objectives: department.objectives.map((obj) => {
      const entry = submission!.objectiveEntries.find(
        (e) => e.objectiveId === obj.id
      );
      const monthlyTarget = JSON.parse(obj.monthlyTarget) as number[];
      const monthlyBaseline = JSON.parse(obj.monthlyBaseline) as number[];
      const currentMonthIdx = period.month - 1;
      return {
        id: obj.id,
        code: obj.code,
        statement: obj.statement,
        unit: obj.unit,
        targetDirection: obj.targetDirection,
        trackingPeriod: obj.trackingPeriod,
        target: String(monthlyTarget[currentMonthIdx] ?? 0),
        baseline: String(monthlyBaseline[currentMonthIdx] ?? 0),
        achievedValue: entry?.achievedValue || "",
        note: entry?.note || "",
      };
    }),
    actions: department.keyActions.map((action) => {
      const entry = submission!.actionEntries.find(
        (e) => e.keyActionId === action.id
      );
      return {
        id: action.id,
        code: action.code,
        description: action.description,
        dueDate: action.dueDate.toISOString(),
        owner: action.owner,
        frequency: action.frequency,
        status: entry?.status || "NOT_STARTED",
        progress: entry?.progress || "",
        nextPriority: entry?.nextPriority || "",
        blockers: entry?.blockers || "",
      };
    }),
  });
}

// PUT: Save draft
export async function PUT(
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

  // Must be admin or have EDIT assignment
  if (!isAdmin && (!assignment || assignment.permission !== "EDIT")) {
    return NextResponse.json({ error: "Forbidden — no edit access" }, { status: 403 });
  }

  // Period selection: explicit periodId from body, otherwise the most recent active period.
  // Function heads may only save against periods that are currently active.
  const body = await req.json();
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

  let submission = await prisma.submission.findUnique({
    where: { departmentId_periodId: { departmentId, periodId: period.id } },
  });

  // Auto-create submission if admin is editing a period that doesn't have one yet
  if (!submission && isAdmin) {
    submission = await prisma.submission.create({
      data: { departmentId, periodId: period.id, status: "DRAFT" },
    });
  }

  if (!submission) {
    return NextResponse.json({ error: "No submission found" }, { status: 404 });
  }

  // Function heads: can't edit after submission or past deadline
  if (!isAdmin) {
    if (submission.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Submission already submitted" },
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

  const parsed = saveDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { objectives, actions } = parsed.data;

  // Upsert objective entries
  for (const obj of objectives) {
    await prisma.objectiveEntry.upsert({
      where: {
        submissionId_objectiveId: {
          submissionId: submission.id,
          objectiveId: obj.objectiveId,
        },
      },
      update: {
        achievedValue: obj.achievedValue,
        note: obj.note,
      },
      create: {
        submissionId: submission.id,
        objectiveId: obj.objectiveId,
        achievedValue: obj.achievedValue,
        note: obj.note,
      },
    });
  }

  // Upsert action entries
  for (const action of actions) {
    await prisma.keyActionEntry.upsert({
      where: {
        submissionId_keyActionId: {
          submissionId: submission.id,
          keyActionId: action.keyActionId,
        },
      },
      update: {
        status: action.status,
        progress: action.progress,
        nextPriority: action.nextPriority,
        blockers: action.blockers,
      },
      create: {
        submissionId: submission.id,
        keyActionId: action.keyActionId,
        status: action.status,
        progress: action.progress,
        nextPriority: action.nextPriority,
        blockers: action.blockers,
      },
    });
  }

  return NextResponse.json({ success: true });
}
