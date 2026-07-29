import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { parseCsv } from "@/lib/import/legacy-clients";

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Real CSV parsing. This used to be `text.split("\n")` then
    // `line.split(",")`, which silently shredded any row containing a comma
    // inside a quoted field (e.g. "Salalah (Coastal, peaceful)") into the
    // wrong columns, and stored values with their quote marks still attached.
    // Both produced corrupt leads with no error shown to the admin.
    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
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
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      const name = (cols[nameIdx] ?? "").trim();
      const email = (cols[emailIdx] ?? "").trim();
      const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? "").trim() || null : null;

      if (!name || !email) { skipped++; continue; }

      await db.execute({
        sql: "INSERT INTO leads (name, email, phone) VALUES (?, ?, ?)",
        args: [name, email, phone],
      });
      imported++;
    }

    // `skipped` is reported so a mostly-failed upload is visible rather than
    // looking like a success with a small number.
    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
