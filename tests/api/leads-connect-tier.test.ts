import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

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

vi.mock("@/lib/db/client", () => ({ getDb: () => db }));
vi.mock("@/lib/push/notify", () => ({ sendPushNotification: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/lead-summary", () => ({ summariseLead: vi.fn(async () => "summary") }));

const scoreLeadMock = vi.fn(async () => undefined);
vi.mock("@/lib/ai/scoring", () => ({
  scoreLead: (...args: unknown[]) => scoreLeadMock(...args),
}));

import { POST } from "@/app/api/leads/route";

function makeRequest(body: Record<string, unknown>, ip = "203.0.113.77"): NextRequest {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  await db.execute("DELETE FROM leads");
  scoreLeadMock.mockClear();
});

describe("connect qualification tier", () => {
  it("seeds 'connect' as a selectable qualification option", async () => {
    const rows = await db.execute(
      "SELECT label FROM lead_options WHERE kind = 'qualification' AND slug = 'connect'",
    );
    expect(rows.rows.length).toBe(1);
  });

  it("stores qualification 'connect' when the flag is sent", async () => {
    const res = await POST(
      makeRequest({ name: "Connect Person", email: "c@example.com", qualification: "connect" }),
    );
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT qualification FROM leads WHERE email = 'c@example.com'");
    expect(String(rows.rows[0].qualification)).toBe("connect");
  });

  it("does not run AI scoring for a connect lead", async () => {
    await POST(
      makeRequest({
        name: "Connect Person",
        email: "c2@example.com",
        qualification: "connect",
        conversationId: null,
      }),
    );
    expect(scoreLeadMock).not.toHaveBeenCalled();
  });

  it("ignores an unrecognised qualification value from the client", async () => {
    const res = await POST(
      makeRequest({ name: "Sneaky", email: "s@example.com", qualification: "platinum" }),
    );
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT qualification FROM leads WHERE email = 's@example.com'");
    expect(String(rows.rows[0].qualification)).not.toBe("platinum");
  });

  it("leaves normal leads on the default qualification", async () => {
    await POST(makeRequest({ name: "Normal", email: "n@example.com" }));
    const rows = await db.execute("SELECT qualification FROM leads WHERE email = 'n@example.com'");
    expect(String(rows.rows[0].qualification)).toBe("warm");
  });
});
