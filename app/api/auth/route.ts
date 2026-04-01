import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (validateToken(token)) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false }, { status: 401 });
}
