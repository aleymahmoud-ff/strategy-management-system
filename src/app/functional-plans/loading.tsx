export default function FunctionalPlansLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 p-8">
      <div className="mb-8">
        <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
        <div className="mt-2 h-4 w-96 rounded-lg skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-border skeleton-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </main>
  );
}
