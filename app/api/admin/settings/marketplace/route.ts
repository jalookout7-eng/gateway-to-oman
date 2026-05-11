import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getMarketplaceAccessFee, setMarketplaceAccessFee } from "@/lib/businesses/settings";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const fee = await getMarketplaceAccessFee();
  return NextResponse.json({ marketplace_access_fee_omr: fee });
}

export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  let body: { marketplace_access_fee_omr?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const amount = Number(body.marketplace_access_fee_omr);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  await setMarketplaceAccessFee(amount);
  return NextResponse.json({ marketplace_access_fee_omr: Math.round(amount) });
}
