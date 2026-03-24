import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeProgress, computeDeviations, deriveStatus } from "@/lib/utils";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ObjectivesTable } from "@/components/dashboard/objectives-table";
import { SubmissionStatus } from "@/components/dashboard/submission-status";
import { DeviationsPanel } from "@/components/dashboard/deviations-panel";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "FUNCTION_HEAD") redirect("/functional-plans");

  const period = await prisma.period.findFirst({ where: { isActive: true } });
  if (!period) {
    return (
      <main className="flex-1 p-8">
        <p className="text-text-sub">No active period found.</p>
      </main>
    );
  }

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

  // Compute all data
  const totalDivisions = divisions.length;
  const submissionsCount = divisions.filter(
    (d) => d.submissions[0]?.status === "SUBMITTED"
  ).length;

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

  const currentMonthIdx = period.month - 1;

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
      const target = String(monthlyTarget[currentMonthIdx] ?? 0);
      const progress = entry ? computeProgress(entry.achievedValue, target) : 0;
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

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="font-heading text-[32px] font-bold text-text-hd">
          Strategy Dashboard
        </h1>
        <p className="mt-1 text-[13px] text-text-sub">
          {period.label} &middot; Consolidated view across all divisions
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards
        submissionsCount={submissionsCount}
        totalDivisions={totalDivisions}
        onTrackCount={onTrackCount}
        totalObjectives={totalObjectives}
        deviationsCount={deviations.length}
        avgScore={avgScore}
      />

      {/* Main Grid */}
      <div className="mt-6 grid grid-cols-[1.7fr_1fr] gap-5">
        {/* Left: Objectives Table */}
        <ObjectivesTable objectives={objectivesData} />

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-5">
          <SubmissionStatus divisions={submissionStatus} />
        </div>
      </div>

      {/* Deviations */}
      {deviations.length > 0 && (
        <div className="mt-6">
          <DeviationsPanel deviations={deviations} />
        </div>
      )}
    </main>
  );
}
