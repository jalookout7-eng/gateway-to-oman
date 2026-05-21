import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function makeTestDb(): Promise<Client> {
  const db = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try { await db.execute(stmt); }
    catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return db;
}

/** Insert a lead with the fields the intelligence queries read. */
export async function seedLead(
  db: Client,
  opts: { qualification: string; outcome: string; source?: string; createdAt?: string; breakdown?: Record<string, number> },
) {
  await db.execute({
    sql: `INSERT INTO leads (name, email, qualification, outcome, source, created_at, score_breakdown)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      "Test", "t" + Math.random().toString(36).slice(2) + "@x.com",
      opts.qualification, opts.outcome, opts.source ?? "main",
      opts.createdAt ?? "2026-05-15 10:00:00",
      opts.breakdown ? JSON.stringify(opts.breakdown) : null,
    ],
  });
}
