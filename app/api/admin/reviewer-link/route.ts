import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getReviewerToken, regenerateReviewerToken } from "@/lib/businesses/reviewer";

function linkFor(request: NextRequest, token: string): string {
  return new URL(`/api/businesses/reviewer?key=${token}`, request.url).toString();
}

// GET — current reviewer link (created on first read if none exists yet).
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const token = await getReviewerToken();
  return NextResponse.json({ token, url: linkFor(request, token) });
}

// POST — shuffle the token; old links stop working immediately.
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const token = await regenerateReviewerToken();
  return NextResponse.json({ token, url: linkFor(request, token) });
}
