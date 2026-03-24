const ACTION_STATUSES = [
  { value: "COMPLETE", label: "Complete", color: "border-l-info" },
  { value: "ON_TRACK", label: "On Track", color: "border-l-green" },
  { value: "AT_RISK", label: "At Risk", color: "border-l-amber" },
  { value: "NOT_STARTED", label: "Not Started", color: "border-l-text-mut" },
  { value: "BLOCKED", label: "Blocked", color: "border-l-red" },
  { value: "DEFERRED", label: "Deferred", color: "border-l-blush-dk" },
];

type Action = {
  id: string;
  code: string;
  description: string;
  dueDate: string;
  owner: string;
  frequency: string;
  status: string;
  progress: string;
  nextPriority: string;
  blockers: string;
};

type Props = {
  actions: Action[];
  readOnly: boolean;
  onUpdate: (
    id: string,
    field: "status" | "progress" | "nextPriority" | "blockers",
    value: string
  ) => void;
};

export function ActionsSection({ actions, readOnly, onUpdate }: Props) {
  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blush/15 text-[13px] font-bold text-blush">
          2
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-text-hd">
            Key Actions
          </h3>
          <p className="text-[12px] text-text-sub">
            Update status and provide narrative for each action
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {actions.map((action, idx) => {
          const statusDef =
            ACTION_STATUSES.find((s) => s.value === action.status) ||
            ACTION_STATUSES[3];
          return (
            <div
              key={action.id}
              className={`card-glow rounded-xl border border-border border-l-[3px] ${statusDef.color} bg-bg-card p-5 shadow-[0_1px_6px_rgba(0,0,0,0.25)]`}
            >
              {/* Action Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-deep text-[10px] font-bold text-text-sub">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-[13px] font-medium text-text-hd">
                      {action.description}
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-text-sub">
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 font-semibold ${action.frequency === "QUARTERLY" ? "bg-sand/15 text-sand" : "bg-teal/15 text-teal"}`}>
                        {action.frequency === "QUARTERLY" ? "Quarterly" : "Monthly"}
                      </span>
                      <span>Due: {new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>Owner: {action.owner}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Dropdown */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                  Status
                </label>
                <select
                  value={action.status}
                  onChange={(e) => onUpdate(action.id, "status", e.target.value)}
                  disabled={readOnly}
                  className="w-48 rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] text-text-hd transition-all duration-200 focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10 disabled:opacity-40"
                >
                  {ACTION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Narrative Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                    Progress This Month
                  </label>
                  <textarea
                    value={action.progress}
                    onChange={(e) =>
                      onUpdate(action.id, "progress", e.target.value)
                    }
                    disabled={readOnly}
                    placeholder="What was accomplished this month?"
                    rows={2}
                    className="resize-y rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] leading-relaxed text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10 disabled:opacity-40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                    Next Priority Actions
                  </label>
                  <textarea
                    value={action.nextPriority}
                    onChange={(e) =>
                      onUpdate(action.id, "nextPriority", e.target.value)
                    }
                    disabled={readOnly}
                    placeholder="What will be done next month?"
                    rows={2}
                    className="resize-y rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] leading-relaxed text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10 disabled:opacity-40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-sub">
                    Blockers / Risks
                  </label>
                  <textarea
                    value={action.blockers}
                    onChange={(e) =>
                      onUpdate(action.id, "blockers", e.target.value)
                    }
                    disabled={readOnly}
                    placeholder="Any dependencies or issues?"
                    rows={2}
                    className="resize-y rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-[13px] leading-relaxed text-text-hd transition-all duration-200 placeholder:text-text-mut focus:border-brown/40 focus:outline-none focus:ring-2 focus:ring-brown/10 disabled:opacity-40"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
