type DepartmentStatus = {
  departmentId: string;
  departmentName: string;
  headName: string;
  initials: string;
  submitted: boolean;
  submittedAt: string | null;
};

export function SubmissionStatus({
  departments,
}: {
  departments: DepartmentStatus[];
}) {
  return (
    <div className="animate-fade-in-up delay-4 overflow-hidden rounded-xl border border-border bg-bg-card shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
      <div className="border-b border-border px-6 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-sub">
          Submission Status
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3">
        {departments.map((d) => (
          <div
            key={d.departmentId}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-bg-mid/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-deep text-[10px] font-bold text-brown">
                {d.initials}
              </div>
              <div>
                <div className="text-[13px] font-medium text-text-bd">
                  {d.departmentName}
                </div>
                <div className="text-[11px] text-text-sub">{d.headName}</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                d.submitted
                  ? "bg-green-bg text-green"
                  : "bg-amber-bg text-amber"
              }`}
            >
              {d.submitted ? "Submitted" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
