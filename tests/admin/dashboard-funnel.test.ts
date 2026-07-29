/**
 * Tests for GET /api/admin/stats — conversionRate and funnel bug fixes.
 *
 * Regression covered: production imported 94 historical leads with no
 * conversation_id, which inflated conversionRate to 872% (totalLeads /
 * totalConversations) and made the funnel show two identical "visitors"
 * and "conversations" bars. conversionRate must only count leads that
 * came from a conversation (conversation_id IS NOT NULL), and the funnel
 * must drop the fake "visitors" stage.
 */
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

vi.mock("@/lib/auth/token", () => ({
  requireAuth: vi.fn().mockResolvedValue(null),
}));

import { GET } from "@/app/api/admin/stats/route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/stats");
}

async function seedConversation(id: string): Promise<void> {
  await db.execute({
    sql: "INSERT INTO conversations (id, session_id) VALUES (?, ?)",
    args: [id, `session-${id}`],
  });
}

async function seedLead(opts: {
  id: string;
  conversationId?: string | null;
  status?: string;
}): Promise<void> {
  await db.execute({
    sql: `INSERT INTO leads (id, name, email, conversation_id, status)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      opts.id,
      "Test Lead",
      `${opts.id}@example.com`,
      opts.conversationId ?? null,
      opts.status ?? "new",
    ],
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  // Children before parents, to satisfy foreign key constraints.
  await db.execute("DELETE FROM emails");
  await db.execute("DELETE FROM bookings");
  await db.execute("DELETE FROM leads");
  await db.execute("DELETE FROM conversations");
});

describe("GET /api/admin/stats", () => {
  it("the exact production regression: 11 conversations, 96 leads all with null conversation_id -> conversionRate 0%, funnel.leads 0", async () => {
    for (let i = 0; i < 11; i++) await seedConversation(`conv-${i}`);
    for (let i = 0; i < 96; i++) await seedLead({ id: `lead-${i}`, conversationId: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.cards.conversionRate).toBe("0.0%");
    expect(json.funnel.leads).toBe(0);
    expect(json.funnel.conversations).toBe(11);
  });

  it("10 conversations, 4 leads with a conversation_id -> conversionRate 40.0%", async () => {
    for (let i = 0; i < 10; i++) await seedConversation(`conv-${i}`);
    for (let i = 0; i < 4; i++) {
      await seedLead({ id: `lead-${i}`, conversationId: `conv-${i}` });
    }
    // Some noise: leads without a conversation_id must not count toward the rate.
    for (let i = 0; i < 20; i++) {
      await seedLead({ id: `noise-${i}`, conversationId: null });
    }

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.cards.conversionRate).toBe("40.0%");
    expect(json.funnel.leads).toBe(4);
  });

  it("leads with a null conversation_id (imported or marketplace) never inflate the funnel or the rate", async () => {
    for (let i = 0; i < 5; i++) await seedConversation(`conv-${i}`);
    await seedLead({ id: "real-1", conversationId: "conv-0" });
    for (let i = 0; i < 50; i++) {
      await seedLead({ id: `imported-${i}`, conversationId: null });
    }

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.funnel.leads).toBe(1);
    expect(json.cards.conversionRate).toBe("20.0%");
  });

  it("zero conversations gives 0% and does not throw", async () => {
    await seedLead({ id: "lead-1", conversationId: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.cards.conversionRate).toBe("0%");
    expect(json.funnel.conversations).toBe(0);
  });

  it("funnel.meetings counts bookings rows, not sent emails", async () => {
    await seedConversation("conv-0");
    await seedLead({ id: "lead-1", conversationId: "conv-0" });

    // Insert a sent email tied to the lead: should NOT affect funnel.meetings.
    await db.execute({
      sql: `INSERT INTO emails (id, lead_id, subject, body, status)
            VALUES ('email-1', 'lead-1', 'Subject', 'Body', 'sent')`,
      args: [],
    });

    let res = await GET(makeRequest());
    let json = await res.json();
    expect(json.funnel.meetings).toBe(0);

    // Now insert a real booking: funnel.meetings should become 1.
    await db.execute({
      sql: `INSERT INTO bookings (id, lead_id, conversation_id, preferred_date, preferred_time)
            VALUES ('booking-1', 'lead-1', 'conv-0', '2026-08-01', '10:00')`,
      args: [],
    });

    res = await GET(makeRequest());
    json = await res.json();
    expect(json.funnel.meetings).toBe(1);
  });

  it("funnel is monotonically non-increasing across its four stages for realistic data", async () => {
    for (let i = 0; i < 20; i++) await seedConversation(`conv-${i}`);
    // 12 leads captured from conversations (some conversations have no lead).
    for (let i = 0; i < 12; i++) {
      await seedLead({ id: `lead-${i}`, conversationId: `conv-${i}` });
    }
    // Also seed some noise leads with no conversation_id.
    for (let i = 0; i < 30; i++) {
      await seedLead({ id: `noise-${i}`, conversationId: null });
    }
    // 5 bookings.
    for (let i = 0; i < 5; i++) {
      await db.execute({
        sql: `INSERT INTO bookings (id, lead_id, conversation_id, preferred_date, preferred_time)
              VALUES (?, ?, ?, '2026-08-01', '10:00')`,
        args: [`booking-${i}`, `lead-${i}`, `conv-${i}`],
      });
    }
    // 3 of the conversation-linked leads converted.
    for (let i = 0; i < 3; i++) {
      await db.execute({
        sql: "UPDATE leads SET status = 'converted' WHERE id = ?",
        args: [`lead-${i}`],
      });
    }

    const res = await GET(makeRequest());
    const json = await res.json();
    const { conversations, leads, meetings, converted } = json.funnel;

    expect(conversations).toBe(20);
    expect(leads).toBe(12);
    expect(meetings).toBe(5);
    expect(converted).toBe(3);

    expect(conversations).toBeGreaterThanOrEqual(leads);
    expect(leads).toBeGreaterThanOrEqual(meetings);
    expect(meetings).toBeGreaterThanOrEqual(converted);
  });
});
