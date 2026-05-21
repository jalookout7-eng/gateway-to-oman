type Cov = { total: number; resolved: number; pending: number; earliest: string | null; latest: string | null };
export function CoverageCard({ coverage }: { coverage: Cov }) {
  const fmt = (s: string | null) => (s ? s.slice(0, 10) : "—");
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Data coverage</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xl font-heading font-semibold text-navy">{coverage.total}</p><p className="text-[11px] text-gray-500">total</p></div>
        <div><p className="text-xl font-heading font-semibold text-emerald-600">{coverage.resolved}</p><p className="text-[11px] text-gray-500">resolved</p></div>
        <div><p className="text-xl font-heading font-semibold text-amber-600">{coverage.pending}</p><p className="text-[11px] text-gray-500">pending</p></div>
      </div>
      <p className="text-[11px] text-gray-500 mt-2">Range: {fmt(coverage.earliest)} → {fmt(coverage.latest)}</p>
    </div>
  );
}
