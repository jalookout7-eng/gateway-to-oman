type Tier = "hot" | "warm" | "cold";
type Counts = Record<Tier, number>;
type Props = { matrix: Record<Tier, Counts> };
const TIERS: Tier[] = ["hot", "warm", "cold"];
const RANK: Record<Tier, number> = { cold: 1, warm: 2, hot: 3 };

function cellClass(pred: Tier, eff: Tier) {
  if (RANK[eff] > RANK[pred]) return "bg-emerald-50 text-emerald-700"; // promoted
  if (RANK[eff] < RANK[pred]) return "bg-red-50 text-red-700";          // demoted
  return "bg-amber-50 text-amber-700";                                   // held
}

export function ReGradingMatrix({ matrix }: Props) {
  const total = TIERS.reduce((s, p) => s + TIERS.reduce((t, e) => t + matrix[p][e], 0), 0);
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-3">Tier re-grading · predicted → effective</h2>
      <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr><th></th>{TIERS.map((e) => <th key={e} className="text-[10px] uppercase text-gray-400 font-semibold">→ {e}</th>)}</tr>
        </thead>
        <tbody>
          {TIERS.map((pred) => (
            <tr key={pred}>
              <th className="text-[10px] uppercase text-gray-400 font-semibold pr-1 text-right">{pred}</th>
              {TIERS.map((eff) => (
                <td key={eff} className={`text-center rounded-lg py-3 font-bold ${cellClass(pred, eff)}`}>
                  {matrix[pred][eff] || "·"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 text-[11px] text-gray-500 mt-2">
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-emerald-100 align-middle mr-1" />promoted</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber-100 align-middle mr-1" />held</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-red-100 align-middle mr-1" />demoted</span>
      </div>
      {total === 0 && <p className="text-sm text-gray-400 italic mt-2">Not enough data yet — needs leads with resolved outcomes.</p>}
    </div>
  );
}
