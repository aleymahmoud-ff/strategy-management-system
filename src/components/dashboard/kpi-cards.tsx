type Props = {
  submissionsCount: number;
  totalDepartments: number;
  onTrackCount: number;
  totalObjectives: number;
  deviationsCount: number;
  avgScore: number;
};

export function KpiCards({
  submissionsCount,
  totalDepartments,
  onTrackCount,
  totalObjectives,
  deviationsCount,
  avgScore,
}: Props) {
  const cards = [
    {
      label: "Submissions",
      value: `${submissionsCount}/${totalDepartments}`,
      sub: "Departments submitted",
      accent: "bg-brown",
      glow: "rgba(201, 162, 77, 0.12)",
    },
    {
      label: "On Track",
      value: totalObjectives > 0 ? `${Math.round((onTrackCount / totalObjectives) * 100)}%` : "0%",
      sub: `${onTrackCount} of ${totalObjectives} objectives`,
      accent: "bg-green",
      glow: "rgba(74, 222, 128, 0.12)",
    },
    {
      label: "Deviations",
      value: `${deviationsCount}`,
      sub: "Flagged this period",
      accent: "bg-red",
      glow: "rgba(248, 113, 113, 0.12)",
    },
    {
      label: "Avg Score",
      value: `${avgScore}`,
      sub: "Across submitted objectives",
      accent: "bg-teal-dk",
      glow: "rgba(76, 201, 192, 0.12)",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`animate-fade-in-up delay-${i + 1} card-glow relative overflow-hidden rounded-xl border border-border bg-bg-card p-5`}
          style={{ boxShadow: `0 1px 6px rgba(0,0,0,0.25)` }}
        >
          {/* Top accent bar with glow */}
          <div className={`absolute left-0 right-0 top-0 h-[2px] ${card.accent}`} />
          <div
            className="absolute left-0 right-0 top-0 h-8 opacity-50"
            style={{
              background: `linear-gradient(to bottom, ${card.glow}, transparent)`,
            }}
          />

          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-sub">
              {card.label}
            </div>
            <div className="my-1 font-heading text-[36px] font-bold text-text-hd">
              {card.value}
            </div>
            <div className="text-[12px] text-text-sub">{card.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
