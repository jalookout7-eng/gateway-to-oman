import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { PHASES, setActivePhase, getPhaseProgress, type PhaseNumber } from "@/lib/ai/phase";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const progress = await getPhaseProgress(getDb());
  return NextResponse.json({ phases: PHASES, ...progress });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const target = Number(body?.phase);
  if (target !== 1 && target !== 2 && target !== 3) {
    return NextResponse.json({ error: "phase must be 1, 2, or 3" }, { status: 400 });
  }

  const db = getDb();
  const { activePhase } = await getPhaseProgress(db);
  // Only allow single-step moves (up or down) — no skipping.
  if (Math.abs(target - activePhase) > 1) {
    return NextResponse.json({ error: "can only move one phase at a time" }, { status: 400 });
  }

  await setActivePhase(db, target as PhaseNumber);
  const progress = await getPhaseProgress(db);
  return NextResponse.json({ phases: PHASES, ...progress });
}
