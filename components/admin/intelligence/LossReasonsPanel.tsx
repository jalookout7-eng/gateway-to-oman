const LABEL: Record<string, string> = {
  won: "Won", lost_not_qualified: "Lost — not qualified (Omar)", lost_execution: "Lost — our execution",
  lost_external: "Lost — external", lost_unresponsive: "Lost — unresponsive", nurturing: "Nurturing",
};

export function LossReasonsPanel({ rows }: { rows: { reason: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <section className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <h2 className="font-heading text-base font-semibold text-navy">Loss / outcome reasons</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 mt-2">No reasons recorded yet — set them when resolving leads.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.reason} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{LABEL[r.reason] ?? r.reason}</span>
              <span className="font-semibold text-navy">{r.count}{total ? ` · ${Math.round((r.count / total) * 100)}%` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
