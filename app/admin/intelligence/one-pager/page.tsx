// app/admin/intelligence/one-pager/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { IntelligenceStats } from "@/lib/intelligence/api-types";
import type { IntelNote } from "@/lib/intelligence/notes";
import { ChevronLeft, Printer, Copy, Check } from "lucide-react";
import { renderOnePagerMarkdown } from "@/lib/intelligence/one-pager";

function authHeaders() {
  return { "Content-Type": "application/json" };
}
function periodLabel(month: string | null) {
  if (!month) return "All time";
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default function OnePagerPage() {
  const [data, setData] = useState<IntelligenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<IntelNote[]>([]);
  const [prose, setProse] = useState({ happened: "", omar: "", next: "" });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, notesRes] = await Promise.all([
        fetch("/api/admin/intelligence", { headers: authHeaders(), credentials: "include" }),
        fetch("/api/admin/intelligence/notes", { headers: authHeaders(), credentials: "include" }),
      ]);
      if (statsRes.ok) setData(await statsRes.json());
      if (notesRes.ok) setNotes((await notesRes.json()).notes ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!data) return <p className="text-gray-500">Couldn&apos;t load intelligence data.</p>;

  const learnings = notes
    .filter((n) => n.status === "confirmed")
    .map((n) => ({ title: n.title, body: n.body }));

  const input = {
    period: periodLabel(data.month),
    coverage: data.coverage,
    precision: data.precision,
    topSource: data.topSource,
    conversion: data.conversion,
    changelog: data.version.changelog,
    learnings,
    prose,
  };
  const md = renderOnePagerMarkdown(input);

  async function copy() {
    try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/intelligence" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gold"><ChevronLeft className="h-4 w-4" />Back</Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md bg-navy text-white text-sm px-3 py-2"><Printer className="h-4 w-4" />Print / Save PDF</button>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 text-gray-700 text-sm px-3 py-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy Markdown"}</button>
        </div>
      </div>

      {/* Editable prose (hidden in print) */}
      <div className="grid gap-2 print:hidden">
        {(["happened", "omar", "next"] as const).map((k) => (
          <textarea key={k} value={prose[k]} onChange={(e) => setProse((p) => ({ ...p, [k]: e.target.value }))}
            placeholder={`Prose for "${k}"…`} className="w-full rounded-md border border-gray-200 text-sm p-2" rows={2} />
        ))}
      </div>

      {/* Rendered one-pager (the printable surface) */}
      <article className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-8 whitespace-pre-wrap font-body text-sm leading-relaxed print:ring-0 print:shadow-none">
        {md}
      </article>
    </div>
  );
}
