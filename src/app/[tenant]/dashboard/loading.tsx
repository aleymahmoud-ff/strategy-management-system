export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8">
        <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
        <div className="mt-2 h-4 w-96 rounded-lg skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border skeleton-shimmer"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <div className="mt-6 h-96 rounded-xl border border-border skeleton-shimmer" style={{ animationDelay: "500ms" }} />
    </main>
  );
}
