// app/api/admin/intelligence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import {
  getTierPrecision, getReGradingMatrix, getCategoryCalibration,
  getDataCoverage, getConversionStats, getTopSource,
  getOmarPrecision, getLossReasonBreakdown,
} from "@/lib/intelligence/queries";
import { OMAR_VERSION, OMAR_CHANGELOG } from "@/lib/ai/version";
import type { IntelligenceStats } from "@/lib/intelligence/api-types";

/** Previous calendar month for a "YYYY-MM" string, else null. */
function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const authError = await requireOwner(request);
  if (authError) return authError;
  const db = getDb();
  const month = request.nextUrl.searchParams.get("month") || undefined;

  const [precision, regrading, calibration, coverage, conversionCurrent, topSource, omarPrecision, lossReasons] = await Promise.all([
    getTierPrecision(db, month), getReGradingMatrix(db, month), getCategoryCalibration(db, month),
    getDataCoverage(db, month), getConversionStats(db, month), getTopSource(db, month),
    getOmarPrecision(db, month), getLossReasonBreakdown(db, month),
  ]);
  const conversionPrevious = month ? await getConversionStats(db, prevMonth(month)) : null;

  const payload: IntelligenceStats = {
    month: month ?? null,
    precision, regrading, calibration, coverage, topSource,
    conversion: { current: conversionCurrent, previous: conversionPrevious },
    version: { current: OMAR_VERSION, changelog: OMAR_CHANGELOG },
    omarPrecision, lossReasons,
  };
  return NextResponse.json(payload);
}
