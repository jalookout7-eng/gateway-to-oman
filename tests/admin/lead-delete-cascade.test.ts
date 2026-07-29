import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
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
  // The cascade relies on FK enforcement to be meaningful: without this the
  // old buggy code would have "passed" this test, because SQLite ignores
  // foreign keys unless they are switched on per connection.
  await client.execute("PRAGMA foreign_keys = ON");
  return client;
}

vi.mock("@/lib/db/client", () => ({ getDb: () => db }));

import { deleteLeadCascade } from "@/lib/admin/lead-delete";

async function seedLead(name: string, email: string): Promise<string> {
  const r = await db.execute({
    sql: "INSERT INTO leads (name, email) VALUES (?, ?) RETURNING id",
    args: [name, email],
  });
  return String(r.rows[0].id);
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  // Teardown only: drop FK enforcement so the wipe order does not matter,
  // then switch it straight back on. The tests themselves always run with
  // foreign keys ON, which is the whole point of this file.
  await db.execute("PRAGMA foreign_keys = OFF");
  for (const t of ["marketplace_users", "sellers", "lead_notes", "inquiries", "emails", "bookings", "messages", "conversations", "leads", "activity_log"]) {
    await db.execute(`DELETE FROM ${t}`);
  }
  await db.execute("PRAGMA foreign_keys = ON");
});

describe("deleteLeadCascade with marketplace relationships", () => {
  it("deletes a lead that has a marketplace account (regression: was blocked by the FK)", async () => {
    const leadId = await seedLead("JA Lookout", "jalookout7@example.com");
    await db.execute({
      sql: "INSERT INTO marketplace_users (full_name, email, lead_id) VALUES (?, ?, ?)",
      args: ["JA Lookout", "jalookout7@example.com", leadId],
    });

    const result = await deleteLeadCascade(leadId, "admin-1", null, null);
    expect(result.deleted).toBe(true);

    const leads = await db.execute("SELECT id FROM leads");
    expect(leads.rows.length).toBe(0);
  });

  it("keeps the marketplace account alive and merely detaches it", async () => {
    const leadId = await seedLead("JA", "ja@example.com");
    await db.execute({
      sql: "INSERT INTO marketplace_users (full_name, email, lead_id) VALUES (?, ?, ?)",
      args: ["JA", "ja@example.com", leadId],
    });

    await deleteLeadCascade(leadId, "admin-1", null, null);

    const users = await db.execute("SELECT email, lead_id FROM marketplace_users");
    expect(users.rows.length).toBe(1);
    expect(users.rows[0].lead_id).toBeNull();
    expect(String(users.rows[0].email)).toBe("ja@example.com");
  });

  it("detaches a seller record rather than deleting it", async () => {
    const leadId = await seedLead("Seller Person", "seller@example.com");
    await db.execute({
      sql: "INSERT INTO sellers (lead_id, name) VALUES (?, ?)",
      args: [leadId, "Seller Person"],
    });

    const result = await deleteLeadCascade(leadId, "admin-1", null, null);
    expect(result.deleted).toBe(true);

    const sellers = await db.execute("SELECT lead_id FROM sellers");
    expect(sellers.rows.length).toBe(1);
    expect(sellers.rows[0].lead_id).toBeNull();
  });

  it("handles a lead carrying every relationship at once", async () => {
    const conv = await db.execute({
      sql: "INSERT INTO conversations (session_id, source) VALUES (?, 'main') RETURNING id",
      args: ["sess-1"],
    });
    const convId = String(conv.rows[0].id);
    const r = await db.execute({
      sql: "INSERT INTO leads (name, email, conversation_id) VALUES (?, ?, ?) RETURNING id",
      args: ["Everything", "all@example.com", convId],
    });
    const leadId = String(r.rows[0].id);

    await db.execute({ sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', 'hi')", args: [convId] });
    await db.execute({ sql: "INSERT INTO lead_notes (lead_id, author_type, author_name, body) VALUES (?, 'admin', 'A', 'note')", args: [leadId] });
    await db.execute({ sql: "INSERT INTO emails (lead_id, to_address, subject, body, status) VALUES (?, 'a@b.c', 's', 'b', 'draft')", args: [leadId] });
    await db.execute({ sql: "INSERT INTO marketplace_users (full_name, email, lead_id) VALUES (?, ?, ?)", args: ["Everything", "all@example.com", leadId] });
    await db.execute({ sql: "INSERT INTO sellers (lead_id, name) VALUES (?, 'Everything')", args: [leadId] });

    const result = await deleteLeadCascade(leadId, "admin-1", null, null);
    expect(result.deleted).toBe(true);

    expect((await db.execute("SELECT id FROM leads")).rows.length).toBe(0);
    expect((await db.execute("SELECT id FROM messages")).rows.length).toBe(0);
    expect((await db.execute("SELECT id FROM conversations")).rows.length).toBe(0);
    expect((await db.execute("SELECT id FROM lead_notes")).rows.length).toBe(0);
    expect((await db.execute("SELECT id FROM emails")).rows.length).toBe(0);
    // Survivors, detached.
    expect((await db.execute("SELECT lead_id FROM marketplace_users")).rows[0].lead_id).toBeNull();
    expect((await db.execute("SELECT lead_id FROM sellers")).rows[0].lead_id).toBeNull();
  });

  it("reports not_found for an unknown id instead of throwing", async () => {
    const result = await deleteLeadCascade("does-not-exist", null, null, null);
    expect(result.deleted).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("writes an activity_log entry capturing the lead before it goes", async () => {
    const leadId = await seedLead("Audited", "audit@example.com");
    await deleteLeadCascade(leadId, "admin-9", "1.2.3.4", "agent");
    const log = await db.execute("SELECT action, target_id, metadata_json FROM activity_log WHERE action = 'lead_delete'");
    expect(log.rows.length).toBe(1);
    expect(String(log.rows[0].target_id)).toBe(leadId);
    expect(JSON.parse(String(log.rows[0].metadata_json)).email).toBe("audit@example.com");
  });
});
