"use client";

import { useEffect, useState, useCallback } from "react";
import { Rocket, Lock, Check, Loader2 } from "lucide-react";

interface PhaseDef {
  phase: 1 | 2 | 3;
  name: string;
  summary: string;
  capabilities: { minPhase: number; instruction: string }[];
  guardrails: string[];
  unlock: { precisionTarget: number | null; minResolvedLeads: number | null; notes: string };
}
interface RoadmapState {
  phases: PhaseDef[];
  activePhase: 1 | 2 | 3;
  resolvedLeads: number;
  precisionPct: number | null;
  nextTarget: number | null;
}

function authHeaders() {
  return { "Content-Type": "application/json" };
}

export function OmarRoadmap() {
  const [state, setState] = useState<RoadmapState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/omar-phase", { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error("Failed to load roadmap");
      setState(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function move(target: number) {
    if (!confirm(`Move Omar to Phase ${target}? This changes what Omar is allowed to do, live.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/omar-phase", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ phase: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to advance");
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to advance");
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 text-sm text-red-600">
        {error}
        <button
          onClick={() => { setError(null); setState(null); load(); }}
          className="ml-3 rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
        >
          Retry
        </button>
      </div>
    );
  if (!state) return <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 text-sm text-gray-500">Loading roadmap…</div>;

  return (
    <section className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-navy">Omar Roadmap</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {state.resolvedLeads} resolved leads · Omar precision{" "}
            {state.precisionPct === null ? "—" : `${state.precisionPct}%`}
            {state.nextTarget !== null ? ` (target ${state.nextTarget}%)` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {state.phases.map((p) => {
          const active = p.phase === state.activePhase;
          const done = p.phase < state.activePhase;
          return (
            <div
              key={p.phase}
              className={`rounded-lg border p-4 ${active ? "border-gold bg-gold/5" : "border-gray-200"}`}
            >
              <div className="flex items-center gap-2">
                {done ? <Check className="h-4 w-4 text-emerald-600" /> : active ? <Rocket className="h-4 w-4 text-gold" /> : <Lock className="h-4 w-4 text-gray-400" />}
                <span className="font-semibold text-navy text-sm">Phase {p.phase} — {p.name}</span>
                {active && <span className="text-[10px] uppercase tracking-wide text-gold font-bold">Active</span>}
              </div>
              <p className="mt-1 text-xs text-gray-600">{p.summary}</p>
              <ul className="mt-2 space-y-0.5">
                {p.capabilities.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700">• {c.instruction}</li>
                ))}
              </ul>
              {p.unlock.notes && <p className="mt-2 text-[11px] text-gray-400">Unlock: {p.unlock.notes}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        {state.activePhase > 1 && (
          <button
            disabled={busy}
            onClick={() => move(state.activePhase - 1)}
            className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Step back to Phase {state.activePhase - 1}
          </button>
        )}
        {state.activePhase < 3 && (
          <button
            disabled={busy}
            onClick={() => move(state.activePhase + 1)}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-light disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Advance to Phase {state.activePhase + 1}
          </button>
        )}
      </div>
    </section>
  );
}
