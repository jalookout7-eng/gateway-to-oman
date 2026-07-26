import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

beforeAll(async () => {
  db = await makeTestDb();
});

const NEW_COLUMNS = [
  "country_of_residence",
  "investment_timeline",
  "investment_purpose",
  "preferred_location",
  "residency_interest",
  "services_needed",
  "additional_comments",
];

describe("intake columns on leads", () => {
  it("adds every intake column", async () => {
    const info = await db.execute("PRAGMA table_info(leads)");
    const names = info.rows.map((r) => String(r.name));
    for (const col of NEW_COLUMNS) {
      expect(names).toContain(col);
    }
  });

  it("leaves the new columns nullable so existing rows are unaffected", async () => {
    await db.execute({
      sql: "INSERT INTO leads (name, email) VALUES (?, ?)",
      args: ["Legacy Row", "legacy@example.com"],
    });
    const row = await db.execute("SELECT * FROM leads WHERE email = 'legacy@example.com'");
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].investment_timeline).toBeNull();
    expect(row.rows[0].services_needed).toBeNull();
  });

  it("round-trips a full intake row", async () => {
    await db.execute({
      sql: `INSERT INTO leads
              (name, email, source, qualification, country_of_residence, investment_timeline,
               investment_purpose, preferred_location, residency_interest, services_needed,
               additional_comments)
            VALUES (?, ?, 'intake', 'connect', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "Full Row", "full@example.com", "United Kingdom", "Within 6 months",
        "Business Setup", "Open / Flexible", "Yes, for myself only",
        JSON.stringify(["Business Registration and Licensing"]), "Some comments.",
      ],
    });
    const row = await db.execute("SELECT * FROM leads WHERE email = 'full@example.com'");
    expect(String(row.rows[0].source)).toBe("intake");
    expect(JSON.parse(String(row.rows[0].services_needed))).toEqual([
      "Business Registration and Licensing",
    ]);
  });
});

describe("intake constants", () => {
  it("contains no em dashes or en dashes in any option label", async () => {
    const c = await import("@/lib/intake/constants");
    const all = [
      ...c.INVESTMENT_TIMELINES,
      ...c.INVESTMENT_PURPOSES,
      ...c.PREFERRED_LOCATIONS,
      ...c.RESIDENCY_OPTIONS,
      ...c.SERVICES_OPTIONS,
    ];
    for (const label of all) {
      expect(label).not.toMatch(/[–—]/);
    }
  });

  it("maps every investment purpose to a valid lead segment", async () => {
    const c = await import("@/lib/intake/constants");
    const validSegments = ["entrepreneur", "investor", "professional", "retiree"];
    for (const purpose of c.INVESTMENT_PURPOSES) {
      expect(validSegments).toContain(c.PURPOSE_TO_SEGMENT[purpose]);
    }
  });
});
