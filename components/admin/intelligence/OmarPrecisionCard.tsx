interface OmarPrecision { correct: number; wrong: number; excluded: number; precisionPct: number | null; }

export function OmarPrecisionCard({ data }: { data: { overall: OmarPrecision } }) {
  const o = data.overall;
  return (
    <section className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <h2 className="font-heading text-base font-semibold text-navy">Omar precision (attribution-adjusted)</h2>
      <p className="text-xs text-gray-500 mt-0.5">Excludes deals lost to sales execution / external factors.</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-navy">{o.precisionPct === null ? "—" : `${o.precisionPct}%`}</span>
        <span className="text-xs text-gray-500">
          {o.correct} correct · {o.wrong} wrong · {o.excluded} excluded
        </span>
      </div>
    </section>
  );
}
