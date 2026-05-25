// app/admin/intelligence/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { IntelligenceStats } from "@/lib/intelligence/api-types";
import { FileDown, Loader2 } from "lucide-react";
import { PrecisionCards } from "@/components/admin/intelligence/PrecisionCards";
import { ReGradingMatrix } from "@/components/admin/intelligence/ReGradingMatrix";
import { CalibrationBars } from "@/components/admin/intelligence/CalibrationBars";
import { CoverageCard } from "@/components/admin/intelligence/CoverageCard";
import { VersionCard } from "@/components/admin/intelligence/VersionCard";
import { NotesPanel } from "@/components/admin/intelligence/NotesPanel";
import { OmarRoadmap } from "@/components/admin/intelligence/OmarRoadmap";
import { OmarPrecisionCard } from "@/components/admin/intelligence/OmarPrecisionCard";
import { LossReasonsPanel } from "@/components/admin/intelligence/LossReasonsPanel";

function authHeaders() {
  return { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`, "Content-Type": "application/json" };
}

export default function IntelligencePage() {
  const [data, setData] = useState<IntelligenceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/intelligence", { headers: authHeaders(), credentials: "include" });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading intelligence…</div>;
  if (!data) return <p className="text-gray-500">Couldn&apos;t load intelligence data.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">Intelligence</h1>
          <p className="text-sm text-gray-500">Calibration &amp; system learning · internal</p>
        </div>
        <Link href="/admin/intelligence/one-pager" className="inline-flex items-center gap-2 rounded-lg gold-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow">
          <FileDown className="h-4 w-4" />Generate one-pager
        </Link>
      </div>

      <OmarPrecisionCard data={data.omarPrecision} />

      <PrecisionCards precision={data.precision} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReGradingMatrix matrix={data.regrading.matrix} />
        <LossReasonsPanel rows={data.lossReasons} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        <CalibrationBars calibration={data.calibration} />
      </div>

      <h2 className="text-xs uppercase tracking-wide font-bold text-gold pt-2">System state &amp; workflow</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VersionCard current={data.version.current} changelog={data.version.changelog} />
        <CoverageCard coverage={data.coverage} />
      </div>
      <OmarRoadmap />
      <NotesPanel />
    </div>
  );
}
