import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const phoneIdx = headers.indexOf("phone");

    if (nameIdx === -1 || emailIdx === -1) {
      return NextResponse.json(
        { error: "CSV must have 'name' and 'email' columns" },
        { status: 400 }
      );
    }

    const db = getDb();
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[nameIdx];
      const email = cols[emailIdx];
      const phone = phoneIdx >= 0 ? cols[phoneIdx] : null;

      if (name && email) {
        await db.execute({
          sql: "INSERT INTO leads (name, email, phone) VALUES (?, ?, ?)",
          args: [name, email, phone],
        });
        imported++;
      }
    }

    return NextResponse.json({ imported });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
