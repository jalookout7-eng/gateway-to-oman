import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

let db: Client;

async function applySchema(client: Client) {
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try { await client.execute(stmt); }
    catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
}

describe("intelligence_notes schema", () => {
  beforeAll(async () => {
    db = createClient({ url: "file::memory:" });
    await applySchema(db);
  });

  it("has the expected columns", async () => {
    const cols = await db.execute("PRAGMA table_info(intelligence_notes)");
    const names = cols.rows.map((r) => r.name);
    for (const c of ["id", "kind", "title", "body", "status", "created_at", "updated_at"]) {
      expect(names).toContain(c);
    }
  });

  it("rejects an invalid kind and accepts a valid one", async () => {
    await expect(
      db.execute({ sql: "INSERT INTO intelligence_notes (kind, title) VALUES ('bogus','x')", args: [] })
    ).rejects.toThrow();
    await db.execute({ sql: "INSERT INTO intelligence_notes (kind, title) VALUES ('hypothesis','x')", args: [] });
    const rows = await db.execute("SELECT status FROM intelligence_notes");
    expect(rows.rows[0].status).toBe("open");
  });
});
