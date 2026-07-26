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

const sendPushMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/push/notify", () => ({
  sendPushNotification: (...args: unknown[]) => sendPushMock(...args),
}));

const summariseMock = vi.fn(async (..._args: unknown[]) => "summary text");
vi.mock("@/lib/ai/lead-summary", () => ({
  summariseLead: (...args: unknown[]) => summariseMock(...args),
}));

import { POST } from "@/app/api/intake/route";

function makeRequest(body: unknown, ip = "198.51.100.5"): NextRequest {
  return new NextRequest("http://localhost/api/intake", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const base = {
  name: "Jane Smith",
  email: "jane@example.com",
  investmentPurpose: "Business Setup",
  investmentTimeline: "Within 6 months",
  servicesNeeded: ["Business Registration and Licensing"],
};

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  await db.execute("DELETE FROM leads");
  sendPushMock.mockClear();
  summariseMock.mockClear();
});

describe("POST /api/intake", () => {
  it("creates a lead with source intake and qualification intake", async () => {
    const res = await POST(makeRequest(base));
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT * FROM leads WHERE email = 'jane@example.com'");
    expect(rows.rows.length).toBe(1);
    expect(String(rows.rows[0].source)).toBe("intake");
    expect(String(rows.rows[0].qualification)).toBe("intake");
    expect(String(rows.rows[0].status)).toBe("new");
  });

  it("persists every intake column", async () => {
    await POST(
      makeRequest({
        ...base,
        countryOfResidence: "United Kingdom",
        preferredLocation: "Open / Flexible",
        residencyInterest: "Yes, for myself only",
        additionalComments: "Relocating next year.",
      }),
    );
    const row = (await db.execute("SELECT * FROM leads WHERE email = 'jane@example.com'")).rows[0];
    expect(String(row.country_of_residence)).toBe("United Kingdom");
    expect(String(row.investment_timeline)).toBe("Within 6 months");
    expect(String(row.investment_purpose)).toBe("Business Setup");
    expect(String(row.preferred_location)).toBe("Open / Flexible");
    expect(String(row.residency_interest)).toBe("Yes, for myself only");
    expect(JSON.parse(String(row.services_needed))).toEqual([
      "Business Registration and Licensing",
    ]);
    expect(String(row.additional_comments)).toBe("Relocating next year.");
  });

  it("derives segment and interests from the stated purpose", async () => {
    await POST(makeRequest(base));
    const row = (await db.execute("SELECT * FROM leads WHERE email = 'jane@example.com'")).rows[0];
    expect(String(row.segment)).toBe("entrepreneur");
    expect(String(row.interests)).toBe("Business Setup");
  });

  it("leaves segment null when no purpose was given", async () => {
    await POST(makeRequest({ name: "No Purpose", email: "np@example.com" }));
    const row = (await db.execute("SELECT * FROM leads WHERE email = 'np@example.com'")).rows[0];
    expect(row.segment).toBeNull();
  });

  it("sends a distinct intake push notification", async () => {
    await POST(makeRequest(base));
    expect(sendPushMock).toHaveBeenCalledTimes(1);
    const arg = sendPushMock.mock.calls[0][0] as { title: string; url: string };
    expect(arg.title).toContain("Intake");
    expect(arg.url).toBe("/admin/leads");
  });

  it("rejects an invalid payload with 400 and creates nothing", async () => {
    const res = await POST(makeRequest({ name: "J", email: "nope" }));
    expect(res.status).toBe(400);
    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(0);
  });

  it("returns success for a bot without creating a lead", async () => {
    const res = await POST(makeRequest({ ...base, _trap: "spam" }));
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(0);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("dedupes a repeat submission from the same email inside 24h", async () => {
    const first = await POST(makeRequest(base));
    const firstId = (await first.json()).id;
    sendPushMock.mockClear();

    const second = await POST(makeRequest(base));
    expect(second.status).toBe(201);
    expect((await second.json()).id).toBe(firstId);

    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(1);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("does not let an intake dedupe swallow a same-day lead from another source", async () => {
    await db.execute({
      sql: "INSERT INTO leads (name, email, source) VALUES (?, ?, 'main')",
      args: ["Chat Jane", "jane@example.com"],
    });
    const res = await POST(makeRequest(base));
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT source FROM leads WHERE email = 'jane@example.com'");
    expect(rows.rows.length).toBe(2);
  });

  it("caps burst submissions from one IP at 3 per 10 minutes", async () => {
    for (let i = 0; i < 3; i++) {
      const ok = await POST(makeRequest({ ...base, email: `burst${i}@example.com` }, "203.0.113.9"));
      expect(ok.status).toBe(201);
    }
    const blocked = await POST(makeRequest({ ...base, email: "burst4@example.com" }, "203.0.113.9"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not count a rate-limited attempt as a created lead", async () => {
    for (let i = 0; i < 4; i++) {
      await POST(makeRequest({ ...base, email: `x${i}@example.com` }, "203.0.113.10"));
    }
    const rows = await db.execute("SELECT id FROM leads");
    expect(rows.rows.length).toBe(3);
  });
});
