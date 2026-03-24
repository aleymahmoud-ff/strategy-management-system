import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeProgress, computeDeviations, deriveStatus } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "FUNCTION_HEAD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodParam = req.nextUrl.searchParams.get("period");

  // Find period
  let period;
  if (periodParam) {
    const [y, m] = periodParam.split("-").map(Number);
    period = await prisma.period.findUnique({ where: { year_month: { year: y, month: m } } });
  } else {
    period = await prisma.period.findFirst({ where: { isActive: true } });
  }

  if (!period) {
    return NextResponse.json({ error: "No active period found" }, { status: 404 });
  }

  // Get all divisions
  const divisions = await prisma.division.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      objectives: { orderBy: { sortOrder: "asc" } },
      keyActions: { orderBy: { sortOrder: "asc" } },
      submissions: {
        where: { periodId: period.id },
        include: {
          objectiveEntries: { include: { objective: true } },
          actionEntries: { include: { keyAction: true } },
        },
      },
    },
  });

  // Compute KPIs
  const totalDivisions = divisions.length;
  const submittedDivisions = divisions.filter(
    (d) => d.submissions[0]?.status === "SUBMITTED"
  );
  const submissionsCount = submittedDivisions.length;

  let totalObjectives = 0;
  let onTrackCount = 0;
  let totalScore = 0;
  let scoredCount = 0;

  const objectivesData: Array<{
    id: string;
    division: string;
    statement: string;
    progress: number;
    status: string;
    completedActions: number;
    totalActions: number;
  }> = [];

  const allEntries: Array<{
    achievedValue: string;
    objective: { statement: string; target: string; division: { name: string } };
  }> = [];

  for (const div of divisions) {
    const submission = div.submissions[0];
    const completedDivActions = submission
      ? submission.actionEntries.filter((a) => a.status === "COMPLETE").length
      : 0;
    const totalDivActions = div.keyActions.length;

    for (const obj of div.objectives) {
      totalObjectives++;
      const entry = submission?.objectiveEntries.find(
        (e) => e.objectiveId === obj.id
      );
      const monthlyTarget = JSON.parse(obj.monthlyTarget) as number[];
      const currentMonthIdx = period!.month - 1;
      const target = String(monthlyTarget[currentMonthIdx] ?? 0);
      const progress = entry
        ? computeProgress(entry.achievedValue, target)
        : 0;
      const status = entry ? deriveStatus(progress) : "NOT_STARTED";

      if (status === "ON_TRACK" || status === "COMPLETE") onTrackCount++;
      if (entry && entry.achievedValue) {
        totalScore += progress;
        scoredCount++;
      }

      objectivesData.push({
        id: obj.id,
        division: div.name,
        statement: obj.statement,
        progress,
        status,
        completedActions: completedDivActions,
        totalActions: totalDivActions,
      });

      if (entry && submission?.status === "SUBMITTED") {
        allEntries.push({
          achievedValue: entry.achievedValue,
          objective: {
            statement: obj.statement,
            target,
            division: { name: div.name },
          },
        });
      }
    }
  }

  const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
  const deviations = computeDeviations(allEntries);

  const submissionStatus = divisions.map((d) => ({
    divisionId: d.id,
    divisionName: d.name,
    headName: d.headName,
    initials: d.initials,
    submitted: d.submissions[0]?.status === "SUBMITTED",
    submittedAt: d.submissions[0]?.submittedAt?.toISOString() || null,
  }));

  return NextResponse.json({
    period: {
      id: period.id,
      label: period.label,
      year: period.year,
      month: period.month,
      deadline: period.deadline.toISOString(),
    },
    kpis: {
      submissionsCount,
      totalDivisions,
      onTrackCount,
      totalObjectives,
      deviationsCount: deviations.length,
      avgScore,
    },
    objectives: objectivesData,
    submissionStatus,
    deviations,
  });
}
