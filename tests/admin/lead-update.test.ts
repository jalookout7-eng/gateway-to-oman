/**
 * Tests for PATCH /api/admin/leads/[id]
 *
 * Strategy: vi.mock the db client so getDb() returns a real in-memory
 * SQLite db (via @libsql/client), and vi.mock the auth module so we
 * can control auth state per test group.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// 1. Build in-memory db
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. Mock modules BEFORE any imports of the route handler
// ---------------------------------------------------------------------------
vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}));

// Default: authenticated as admin "admin-test-id"
vi.mock("@/lib/auth/token", () => ({
  requireAuth: vi.fn().mockResolvedValue(null), // null = no error = authenticated
  getRequestUser: vi.fn().mockResolvedValue({ id: "admin-test-id", email: "admin@test.com", role: "admin", full_name: null }),
}));

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------
function makeRequest(leadId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedLead(opts: {
  id?: string;
  status?: string;
  qualification?: string;
  segment?: string;
  admin_notes?: string;
}): Promise<string> {
  const id = opts.id ?? "lead-" + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO leads (id, name, email, status, qualification, segment, admin_notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      "Test Lead",
      `t${Math.random().toString(36).slice(2)}@test.com`,
      opts.status ?? "new",
      opts.qualification ?? "warm",
      opts.segment ?? null,
      opts.admin_notes ?? null,
    ],
  });
  return id;
}

// ---------------------------------------------------------------------------
// 4. Tests
// ---------------------------------------------------------------------------
describe("PATCH /api/admin/leads/[id]", () => {
  // Import the handler lazily (after mocks are registered)
  let PATCH: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    db = await makeTestDb();
    const mod = await import("@/app/api/admin/leads/[id]/route");
    PATCH = mod.PATCH;
  });

  // Reseed admin_users + admin_sessions so activity_log FK doesn't fail
  // (activity_log.actor_id has no FK constraint — just a TEXT field — so no seed needed)

  // -------------------------------------------------------------------------
  // Test 1: Allowed fields are persisted
  // -------------------------------------------------------------------------
  describe("allowed fields are persisted", () => {
    it("PATCHing qualification updates the row", async () => {
      const leadId = await seedLead({ qualification: "cold" });

      const req = makeRequest(leadId, { qualification: "warm" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);

      const row = await db.execute({ sql: "SELECT qualification FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].qualification).toBe("warm");
    });

    it("PATCHing status updates the row", async () => {
      const leadId = await seedLead({ status: "new" });

      const req = makeRequest(leadId, { status: "contacted" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const row = await db.execute({ sql: "SELECT status FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].status).toBe("contacted");
    });

    it("PATCHing segment updates the row", async () => {
      const leadId = await seedLead({ segment: "investor" });

      const req = makeRequest(leadId, { segment: "entrepreneur" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const row = await db.execute({ sql: "SELECT segment FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].segment).toBe("entrepreneur");
    });

    it("PATCHing admin_notes updates the row", async () => {
      const leadId = await seedLead({ admin_notes: null });

      const req = makeRequest(leadId, { admin_notes: "Follow up next week" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const row = await db.execute({ sql: "SELECT admin_notes FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].admin_notes).toBe("Follow up next week");
    });

    it("PATCHing admin_notes to empty string clears the field", async () => {
      const leadId = await seedLead({ admin_notes: "existing note" });

      const req = makeRequest(leadId, { admin_notes: "" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const row = await db.execute({ sql: "SELECT admin_notes FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].admin_notes).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: Disallowed fields are silently dropped
  // -------------------------------------------------------------------------
  describe("disallowed fields are silently dropped", () => {
    it("PATCHing email does NOT change the email column", async () => {
      const leadId = await seedLead({});
      const before = await db.execute({ sql: "SELECT email FROM leads WHERE id = ?", args: [leadId] });
      const originalEmail = before.rows[0].email as string;

      // We also pass a valid field so the request isn't rejected as empty
      const req = makeRequest(leadId, { email: "hacked@evil.com", qualification: "hot" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const after = await db.execute({ sql: "SELECT email FROM leads WHERE id = ?", args: [leadId] });
      expect(after.rows[0].email).toBe(originalEmail);
    });

    it("PATCHing lead_score does NOT change the lead_score column", async () => {
      const leadId = await seedLead({});
      // lead_score is NULL by default
      const req = makeRequest(leadId, { lead_score: 999, status: "new" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(200);
      const row = await db.execute({ sql: "SELECT lead_score FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].lead_score).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: Invalid values return 400 and do NOT update the row
  // -------------------------------------------------------------------------
  describe("invalid values are rejected with 400", () => {
    it("invalid qualification returns 400 and does NOT update the row", async () => {
      const leadId = await seedLead({ qualification: "cold" });

      const req = makeRequest(leadId, { qualification: "super-hot" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid qualification");

      const row = await db.execute({ sql: "SELECT qualification FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].qualification).toBe("cold"); // unchanged
    });

    it("invalid status returns 400 and does NOT update the row", async () => {
      const leadId = await seedLead({ status: "new" });

      const req = makeRequest(leadId, { status: "archived" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(400);
      const row = await db.execute({ sql: "SELECT status FROM leads WHERE id = ?", args: [leadId] });
      expect(row.rows[0].status).toBe("new"); // unchanged
    });

    it("admin_notes exceeding 5000 chars returns 400", async () => {
      const leadId = await seedLead({});
      const req = makeRequest(leadId, { admin_notes: "x".repeat(5001) });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });
      expect(res.status).toBe(400);
    });

    it("body with no recognized fields returns 400", async () => {
      const leadId = await seedLead({});
      const req = makeRequest(leadId, { name: "Hacker", phone: "123" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Test 4: activity_log is written with correct shape (only when changed)
  // -------------------------------------------------------------------------
  describe("activity_log", () => {
    it("writes an activity_log row with the correct changes JSON shape", async () => {
      const leadId = await seedLead({ qualification: "cold", status: "new" });

      // Clear any previous activity_log rows for this lead to isolate the check
      await db.execute({ sql: "DELETE FROM activity_log WHERE target_id = ?", args: [leadId] });

      const req = makeRequest(leadId, { qualification: "hot" });
      await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      const logRows = await db.execute({
        sql: "SELECT * FROM activity_log WHERE target_id = ? ORDER BY created_at DESC LIMIT 1",
        args: [leadId],
      });

      expect(logRows.rows.length).toBe(1);
      const log = logRows.rows[0];
      expect(log.actor_type).toBe("admin");
      expect(log.actor_id).toBe("admin-test-id");
      expect(log.action).toBe("lead_update");
      expect(log.target_type).toBe("lead");
      expect(log.target_id).toBe(leadId);

      const metadata = JSON.parse(log.metadata_json as string);
      expect(metadata.changes.qualification).toEqual({ before: "cold", after: "hot" });
      // status was not passed, so should not appear in changes
      expect(metadata.changes.status).toBeUndefined();
    });

    it("does NOT write activity_log if no field actually changed", async () => {
      const leadId = await seedLead({ qualification: "warm" });

      await db.execute({ sql: "DELETE FROM activity_log WHERE target_id = ?", args: [leadId] });

      // PATCH with the same value that's already set
      const req = makeRequest(leadId, { qualification: "warm" });
      await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      const logRows = await db.execute({
        sql: "SELECT COUNT(*) as cnt FROM activity_log WHERE target_id = ?",
        args: [leadId],
      });
      expect(logRows.rows[0].cnt).toBe(0);
    });

    it("only logs fields that actually changed in the changes object", async () => {
      const leadId = await seedLead({ qualification: "warm", status: "new" });
      await db.execute({ sql: "DELETE FROM activity_log WHERE target_id = ?", args: [leadId] });

      // Send both fields but only status is different
      const req = makeRequest(leadId, { qualification: "warm", status: "contacted" });
      await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      const logRows = await db.execute({
        sql: "SELECT metadata_json FROM activity_log WHERE target_id = ? ORDER BY created_at DESC LIMIT 1",
        args: [leadId],
      });
      expect(logRows.rows.length).toBe(1);
      const metadata = JSON.parse(logRows.rows[0].metadata_json as string);
      expect(metadata.changes.status).toEqual({ before: "new", after: "contacted" });
      expect(metadata.changes.qualification).toBeUndefined(); // same value, not logged
    });
  });

  // -------------------------------------------------------------------------
  // Test 5: Auth guard — no session returns 401
  // -------------------------------------------------------------------------
  describe("auth guard", () => {
    it("returns 401 when requireAuth returns an error response", async () => {
      // Override the mock for this test to simulate unauthenticated
      const { requireAuth } = await import("@/lib/auth/token");
      vi.mocked(requireAuth).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
      );

      const leadId = await seedLead({});
      const req = makeRequest(leadId, { status: "contacted" });
      const res = await PATCH(req, { params: Promise.resolve({ id: leadId }) });

      expect(res.status).toBe(401);

      // Restore default mock
      vi.mocked(requireAuth).mockResolvedValue(null);
    });
  });
});
