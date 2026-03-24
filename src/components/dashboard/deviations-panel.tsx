import type { Deviation } from "@/lib/utils";

export function DeviationsPanel({ deviations }: { deviations: Deviation[] }) {
  return (
    <div className="animate-fade-in-up delay-5 overflow-hidden rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
      <div className="border-b border-border px-6 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">
          Flagged Deviations
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {deviations.map((dev, i) => (
          <div
            key={i}
            className={`rounded-lg border-l-[3px] p-4 ${
              dev.severity === "red"
                ? "border-l-red bg-red-bg/50"
                : "border-l-amber bg-amber-bg/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[13px] font-medium text-text-bd">
                  {dev.objective}
                </div>
                <div className="mt-0.5 text-[11px] text-text-sub">
                  {dev.division}
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  dev.severity === "red"
                    ? "bg-red-bg text-red"
                    : "bg-amber-bg text-amber"
                }`}
              >
                {dev.severity === "red" ? "Critical" : "Warning"}
              </span>
            </div>
            <div className="mt-2.5 flex gap-5 text-[12px] text-text-sub">
              <span>
                Actual: <strong className="text-text-bd">{dev.actual}</strong>
              </span>
              <span>
                Target: <strong className="text-text-bd">{dev.target}</strong>
              </span>
              <span>
                Gap: <strong className={dev.severity === "red" ? "text-red" : "text-amber"}>{dev.gap}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
