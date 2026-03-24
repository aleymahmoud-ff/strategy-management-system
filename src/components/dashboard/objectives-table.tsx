type Objective = {
  id: string;
  division: string;
  statement: string;
  progress: number;
  status: string;
  completedActions: number;
  totalActions: number;
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETE: { bg: "bg-info-bg", text: "text-info", label: "Complete" },
  ON_TRACK: { bg: "bg-green-bg", text: "text-green", label: "On Track" },
  AT_RISK: { bg: "bg-amber-bg", text: "text-amber", label: "At Risk" },
  OFF_TRACK: { bg: "bg-red-bg", text: "text-red", label: "Off Track" },
  NOT_STARTED: { bg: "bg-bg-mid", text: "text-text-mut", label: "Not Started" },
};

function progressColor(progress: number) {
  if (progress >= 100) return "bg-info";
  if (progress >= 70) return "bg-green";
  if (progress >= 50) return "bg-amber";
  return "bg-red";
}

export function ObjectivesTable({ objectives }: { objectives: Objective[] }) {
  return (
    <div className="animate-fade-in-up delay-3 overflow-hidden rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
      <div className="border-b border-border px-6 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">
          Divisional Objectives
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">
                Division
              </th>
              <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">
                Objective
              </th>
              <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">
                Progress
              </th>
              <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">
                Status
              </th>
              <th className="border-b border-border bg-bg-mid/50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1px] text-text-mut">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {objectives.map((obj) => {
              const badge = STATUS_BADGE[obj.status] || STATUS_BADGE.NOT_STARTED;
              return (
                <tr key={obj.id} className="transition-colors duration-150 hover:bg-bg-mid/30">
                  <td className="border-b border-border/50 px-4 py-3 font-medium text-text-bd">
                    {obj.division}
                  </td>
                  <td className="border-b border-border/50 px-4 py-3 text-text-bd">
                    {obj.statement}
                  </td>
                  <td className="border-b border-border/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-deep">
                        <div
                          className={`h-full rounded-full ${progressColor(obj.progress)} transition-all`}
                          style={{ width: `${Math.min(100, obj.progress)}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-text-sub">{obj.progress}%</span>
                    </div>
                  </td>
                  <td className="border-b border-border/50 px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="border-b border-border/50 px-4 py-3 tabular-nums text-text-sub">
                    {obj.completedActions}/{obj.totalActions}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
