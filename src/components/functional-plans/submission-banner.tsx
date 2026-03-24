type Props = {
  division: { name: string; headName: string; initials: string };
  period: { label: string; deadline: string };
  saving: boolean;
};

export function SubmissionBanner({ division, period, saving }: Props) {
  const deadline = new Date(period.deadline);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
      {/* Gradient accent bar */}
      <div className="h-[2px] bg-gradient-to-r from-brown via-peach to-brown" />

      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brown/10 text-[13px] font-bold text-brown">
            {division.initials}
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-text-hd">{division.name}</h2>
            <p className="text-[13px] text-text-sub">
              {division.headName} &middot; {period.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-[11px] text-text-mut">Saving...</span>
          )}
          <div className="rounded-lg border border-border bg-bg-mid px-4 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-mut">
              Deadline
            </div>
            <div className={`text-[14px] font-bold ${daysLeft > 0 ? "text-text-hd" : "text-red"}`}>
              {daysLeft > 0 ? `${daysLeft} days left` : "Past due"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
