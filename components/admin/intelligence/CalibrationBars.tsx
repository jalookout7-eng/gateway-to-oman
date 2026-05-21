type C = { category: string; successAvg: number | null; nonSuccessAvg: number | null };
const MAX: Record<string, number> = { budget: 30, timeline: 25, decisionAuthority: 15, objectiveClarity: 15, mindsetIndicator: 15 };
const NAME: Record<string, string> = { budget: "Budget", timeline: "Timeline", decisionAuthority: "Decision auth", objectiveClarity: "Objective", mindsetIndicator: "Mindset" };

export function CalibrationBars({ calibration }: { calibration: C[] }) {
  const hasData = calibration.some((c) => c.successAvg !== null || c.nonSuccessAvg !== null);
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
      <h2 className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-1">Score-category calibration</h2>
      <p className="text-[11px] text-gray-400 mb-3">gold = avg points among successes · navy tick = among non-successes</p>
      {calibration.map((c) => {
        const max = MAX[c.category] ?? 30;
        const sw = c.successAvg === null ? 0 : (c.successAvg / max) * 100;
        const nw = c.nonSuccessAvg === null ? null : (c.nonSuccessAvg / max) * 100;
        return (
          <div key={c.category} className="mb-2">
            <div className="flex justify-between text-xs text-gray-600"><span>{NAME[c.category] ?? c.category}</span><span>{c.successAvg ?? "—"} / {c.nonSuccessAvg ?? "—"}</span></div>
            <div className="relative h-2.5 rounded bg-gray-100 mt-0.5">
              <div className="absolute inset-y-0 left-0 rounded bg-gold" style={{ width: `${sw}%` }} />
              {nw !== null && <div className="absolute inset-y-0 w-0.5 bg-navy" style={{ left: `${nw}%` }} />}
            </div>
          </div>
        );
      })}
      {!hasData && <p className="text-sm text-gray-400 italic mt-2">Not enough data yet.</p>}
    </div>
  );
}
