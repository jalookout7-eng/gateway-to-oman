import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;
let authed = true;

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
  requireAuth: async () =>
    authed ? null : new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  getRequestUser: async () => (authed ? { id: "admin-1", role: "owner" } : null),
}));

import { GET } from "@/app/api/admin/leads/[id]/route";

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/leads/${id}`);
}

async function seedLead(): Promise<string> {
  const r = await db.execute({
    sql: `INSERT INTO leads
            (name, email, source, qualification, investment_timeline, investment_purpose,
             services_needed, score_breakdown)
          VALUES (?, ?, 'intake', 'connect', ?, ?, ?, ?)
          RETURNING id`,
    args: [
      "Jane Smith", "jane@example.com", "Within 6 months", "Business Setup",
      JSON.stringify(["Retirement Planning"]), JSON.stringify({ total: 55 }),
    ],
  });
  return String(r.rows[0].id);
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  authed = true;
  await db.execute("DELETE FROM leads");
  await db.execute("DELETE FROM messages");
  await db.execute("DELETE FROM conversations");
});

describe("GET /api/admin/leads/[id]", () => {
  it("requires authentication", async () => {
    authed = false;
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(401);
  });

  it("returns the lead with every intake field", async () => {
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead.name).toBe("Jane Smith");
    expect(body.lead.investment_timeline).toBe("Within 6 months");
    expect(body.lead.investment_purpose).toBe("Business Setup");
    expect(body.lead.source).toBe("intake");
  });

  it("does not leak score_breakdown to the browser", async () => {
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    const body = await res.json();
    expect(body.lead.score_breakdown).toBeUndefined();
  });

  it("returns 404 for an unknown lead", async () => {
    const res = await GET(makeRequest("nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });

  it("returns an empty transcript when the lead has no conversation", async () => {
    const id = await seedLead();
    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    const body = await res.json();
    expect(body.messages).toEqual([]);
  });

  it("returns the transcript in order when a conversation exists", async () => {
    const conv = await db.execute({
      sql: "INSERT INTO conversations (session_id, source) VALUES (?, 'main') RETURNING id",
      args: ["test-session"],
    });
    const convId = String(conv.rows[0].id);
    for (const [role, content] of [["user", "Hello"], ["assistant", "Hi there"]]) {
      await db.execute({
        sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        args: [convId, role, content],
      });
    }
    const r = await db.execute({
      sql: "INSERT INTO leads (name, email, conversation_id) VALUES (?, ?, ?) RETURNING id",
      args: ["Chat Lead", "chat@example.com", convId],
    });
    const id = String(r.rows[0].id);

    const res = await GET(makeRequest(id), { params: Promise.resolve({ id }) });
    const body = await res.json();
    expect(body.messages.length).toBe(2);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Hello");
  });
});
