import Link from "next/link";

type Division = {
  id: string;
  name: string;
  headName: string;
  initials: string;
  objectiveCount: number;
  submissionStatus: string | null;
  submittedAt: string | null;
  permission: string;
};

export function DivisionSelector({ divisions }: { divisions: Division[] }) {
  return (
    <div className="grid grid-cols-3 gap-5">
      {divisions.map((d, i) => (
        <Link
          key={d.id}
          href={`/functional-plans/${d.id}`}
          className={`animate-fade-in-up delay-${Math.min(i + 1, 6)} card-glow group rounded-xl border border-border bg-bg-card p-6 shadow-[0_1px_6px_rgba(0,0,0,0.25)] transition-all duration-300`}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-deep text-[12px] font-bold text-brown">
              {d.initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-text-hd transition-colors group-hover:text-brown">
                  {d.name}
                </span>
                {d.permission === "VIEW_ONLY" && (
                  <span className="inline-flex rounded-md bg-bg-deep px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-mut">
                    View Only
                  </span>
                )}
              </div>
              <div className="text-[12px] text-text-sub">{d.headName}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[12px] text-text-sub">
              {d.objectiveCount} objective{d.objectiveCount !== 1 ? "s" : ""}
            </span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                d.submissionStatus === "SUBMITTED"
                  ? "bg-green-bg text-green"
                  : d.submissionStatus === "DRAFT"
                    ? "bg-amber-bg text-amber"
                    : "bg-bg-mid text-text-mut"
              }`}
            >
              {d.submissionStatus === "SUBMITTED"
                ? "Submitted"
                : d.submissionStatus === "DRAFT"
                  ? "Draft"
                  : "Not Started"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
