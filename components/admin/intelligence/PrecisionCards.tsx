type P = { tier: string; resolved: number; convertedPct: number | null; engagedPct: number | null };
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);
const LABEL: Record<string, string> = { hot: "🔥 Hot", warm: "Warm", cold: "Cold" };

export function PrecisionCards({ precision }: { precision: P[] }) {
  const hasData = precision.some((p) => p.resolved > 0);
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Sales conversion by predicted tier (resolved leads)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {precision.map((p) => (
          <div key={p.tier} className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{LABEL[p.tier] ?? p.tier}</p>
            <p className="mt-1 text-2xl font-heading font-semibold text-navy">
              {pct(p.convertedPct)} <span className="text-gold">|</span> {pct(p.engagedPct)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">converted | engaged · {p.resolved} resolved</p>
          </div>
        ))}
      </div>
      {!hasData && <p className="text-sm text-gray-400 italic mt-2">Not enough data yet — needs leads with resolved outcomes.</p>}
    </section>
  );
}
