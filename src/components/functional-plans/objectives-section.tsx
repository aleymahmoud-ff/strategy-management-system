const UNIT_FORMATS: Record<string, { prefix: string; suffix: string; decimals: number }> = {
  "%": { prefix: "", suffix: "%", decimals: 1 },
  "SAR": { prefix: "SAR ", suffix: "", decimals: 0 },
  "USD": { prefix: "$", suffix: "", decimals: 0 },
  "count": { prefix: "", suffix: "", decimals: 0 },
  "days": { prefix: "", suffix: " days", decimals: 1 },
  "score": { prefix: "", suffix: " pts", decimals: 0 },
  "ratio": { prefix: "", suffix: "x", decimals: 2 },
  "hours": { prefix: "", suffix: " hrs", decimals: 1 },
  "incidents": { prefix: "", suffix: "", decimals: 0 },
  "leads": { prefix: "", suffix: "", decimals: 0 },
  "clients": { prefix: "", suffix: "", decimals: 0 },
};

function fmtVal(val: string, unit: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  const fmt = UNIT_FORMATS[unit] || { prefix: "", suffix: "", decimals: 2 };
  const formatted = fmt.decimals === 0 ? Math.round(n).toString() : n.toFixed(fmt.decimals);
  return `${fmt.prefix}${formatted}${fmt.suffix}`;
}

type Objective = {
  id: string;
  code: string;
  statement: string;
  target: string;
  unit: string;
  baseline: string;
  targetDirection: string;
  achievedValue: string;
  note: string;
};

type Props = {
  objectives: Objective[];
  readOnly: boolean;
  onUpdate: (id: string, field: "achievedValue" | "note", value: string) => void;
};

export function ObjectivesSection({ objectives, readOnly, onUpdate }: Props) {
  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 text-[13px] font-bold text-teal">
          1
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-text-hd">
            Strategic Objectives
          </h3>
          <p className="text-[12px] text-text-sub">
            Update achieved values for each objective this period
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {objectives.map((obj, idx) => (
          <div
            key={obj.id}
            className="card-glow rounded-xl border border-border bg-bg-card p-5 shadow-[0_1px_6px_rgba(0,0,0,0.25)]"
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brown/10 text-[11px] font-bold text-brown">
                {String.fromCharCode(65 + idx)}
              </span>
              <div>
                <div className="text-[13px] font-medium text-text-hd">
                  {obj.statement}
                </div>
                <div className="mt-1 flex gap-4 text-[11px] text-text-sub">
                  <span>
                    Target: <strong className="text-text-bd">{obj.targetDirection} {fmtVal(obj.target, obj.unit)}</strong>
                  </span>
                  <span>
                    Baseline: <strong className="text-text-bd">{fmtVal(obj.baseline, obj.unit)}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                  Achieved This Month
                </label>
                <input
                  type="text"
                  value={obj.achievedValue}
                  onChange={(e) =>
                    onUpdate(obj.id, "achievedValue", e.target.value)
                  }
                  disabled={readOnly}
                  placeholder="e.g. 8.9"
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10 disabled:opacity-40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                  Additional Note
                </label>
                <input
                  type="text"
                  value={obj.note}
                  onChange={(e) => onUpdate(obj.id, "note", e.target.value)}
                  disabled={readOnly}
                  placeholder="Optional comment..."
                  className="rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10 disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
