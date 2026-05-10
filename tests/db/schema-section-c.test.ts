import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

let db: Client;

async function applySchema(client: Client) {
  const schemaPath = resolve(__dirname, "../../lib/db/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("duplicate column") || msg.includes("UNIQUE constraint failed")) continue;
      console.error(`Failed statement:\n${statement.slice(0, 400)}\n---`);
      throw err;
    }
  }
}

describe("Schema — Section C (Phase 1 Marketplace + Layer 3 + Admin)", () => {
  beforeAll(async () => {
    db = createClient({ url: "file::memory:" });
    await applySchema(db);
  });

  describe("source column on existing tables", () => {
    it.each(["conversations", "leads", "bookings"])("%s has source column with default 'main'", async (table) => {
      const cols = await db.execute(`PRAGMA table_info(${table})`);
      const sourceCol = cols.rows.find((r) => r.name === "source");
      expect(sourceCol).toBeDefined();
      expect(sourceCol?.notnull).toBe(1);
      expect(sourceCol?.dflt_value).toBe("'main'");
    });
  });

  describe("Layer 3 fields on leads", () => {
    const expectedFields = [
      "lead_score",
      "referrer_name",
      "referrer_url",
      "qualification_path",
      "chatbot_responses",
      "special_filter_triggered",
      "score_breakdown",
      "outcome",
      "outcome_updated_at",
      "admin_notes",
      "session_duration_seconds",
      "device_type",
    ];

    it.each(expectedFields)("leads has column %s", async (col) => {
      const cols = await db.execute("PRAGMA table_info(leads)");
      const found = cols.rows.find((r) => r.name === col);
      expect(found, `column ${col} missing from leads`).toBeDefined();
    });

    it("outcome enum rejects invalid values", async () => {
      await db.execute({
        sql: "INSERT INTO leads (id, name, email) VALUES (?, ?, ?)",
        args: ["test-outcome-valid", "Test User", "valid@example.com"],
      });
      await expect(
        db.execute({
          sql: "UPDATE leads SET outcome = ? WHERE id = ?",
          args: ["invalid_value", "test-outcome-valid"],
        }),
      ).rejects.toThrow();
    });

    it("special_filter_triggered enforces 0/1 only", async () => {
      await db.execute({
        sql: "INSERT INTO leads (id, name, email) VALUES (?, ?, ?)",
        args: ["test-bool", "Bool Test", "bool@example.com"],
      });
      await expect(
        db.execute({
          sql: "UPDATE leads SET special_filter_triggered = 2 WHERE id = ?",
          args: ["test-bool"],
        }),
      ).rejects.toThrow();
    });
  });

  describe("categories table", () => {
    it("seeds 8 categories", async () => {
      const result = await db.execute("SELECT COUNT(*) as count FROM categories");
      expect(result.rows[0].count).toBe(8);
    });

    it("includes the three sample-listing-driven categories", async () => {
      const slugs = await db.execute("SELECT slug FROM categories ORDER BY sort_order");
      const slugList = slugs.rows.map((r) => r.slug);
      expect(slugList).toContain("laundry");
      expect(slugList).toContain("travel-agency");
      expect(slugList).toContain("industrial-commercial");
    });

    it("slug is unique", async () => {
      await expect(
        db.execute({
          sql: "INSERT INTO categories (slug, name) VALUES (?, ?)",
          args: ["gym", "Duplicate Gym"],
        }),
      ).rejects.toThrow();
    });
  });

  describe("sellers table", () => {
    it("allows creation without lead_id (admin-created seller)", async () => {
      const result = await db.execute({
        sql: "INSERT INTO sellers (id, name) VALUES (?, ?)",
        args: ["seller-1", "Manual Seller"],
      });
      expect(result.rowsAffected).toBe(1);
    });

    it("allows lead_id linkage when seller is also a lead", async () => {
      await db.execute({
        sql: "INSERT INTO leads (id, name, email) VALUES (?, ?, ?)",
        args: ["lead-for-seller", "Lead Seller", "leadseller@example.com"],
      });
      const result = await db.execute({
        sql: "INSERT INTO sellers (id, lead_id, name) VALUES (?, ?, ?)",
        args: ["seller-2", "lead-for-seller", "Lead Seller"],
      });
      expect(result.rowsAffected).toBe(1);
    });
  });

  describe("listings table", () => {
    let categoryId: string;

    beforeAll(async () => {
      const cat = await db.execute("SELECT id FROM categories WHERE slug = 'laundry'");
      categoryId = cat.rows[0].id as string;
    });

    it("requires title, slug, category_id", async () => {
      await expect(
        db.execute({
          sql: "INSERT INTO listings (id) VALUES (?)",
          args: ["listing-bad"],
        }),
      ).rejects.toThrow();
    });

    it("allows for_sale + for_rent combination (Project 3 pattern)", async () => {
      const result = await db.execute({
        sql: `INSERT INTO listings (id, category_id, title, slug, for_sale, for_rent, selling_price_omr, rental_price_omr)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: ["listing-hybrid", categoryId, "Industrial Factory", "industrial-factory-test", 1, 1, 250000, 3500],
      });
      expect(result.rowsAffected).toBe(1);
    });

    it("processing_fee_omr defaults to 500", async () => {
      await db.execute({
        sql: "INSERT INTO listings (id, category_id, title, slug) VALUES (?, ?, ?, ?)",
        args: ["listing-fee-default", categoryId, "Fee Test", "fee-default-test"],
      });
      const result = await db.execute({
        sql: "SELECT processing_fee_omr FROM listings WHERE id = ?",
        args: ["listing-fee-default"],
      });
      expect(result.rows[0].processing_fee_omr).toBe(500);
    });

    it("status enum rejects invalid values", async () => {
      await expect(
        db.execute({
          sql: "INSERT INTO listings (id, category_id, title, slug, status) VALUES (?, ?, ?, ?, ?)",
          args: ["listing-bad-status", categoryId, "Bad Status", "bad-status-test", "draft"],
        }),
      ).rejects.toThrow();
    });

    it("slug is unique", async () => {
      await db.execute({
        sql: "INSERT INTO listings (id, category_id, title, slug) VALUES (?, ?, ?, ?)",
        args: ["listing-slug-1", categoryId, "First", "duplicate-slug-test"],
      });
      await expect(
        db.execute({
          sql: "INSERT INTO listings (id, category_id, title, slug) VALUES (?, ?, ?, ?)",
          args: ["listing-slug-2", categoryId, "Second", "duplicate-slug-test"],
        }),
      ).rejects.toThrow();
    });
  });

  describe("inquiries table", () => {
    it("links a lead to a listing", async () => {
      const cat = await db.execute("SELECT id FROM categories WHERE slug = 'gym'");
      const categoryId = cat.rows[0].id;

      await db.execute({
        sql: "INSERT INTO leads (id, name, email) VALUES (?, ?, ?)",
        args: ["lead-inq", "Inq Lead", "inq@example.com"],
      });
      await db.execute({
        sql: "INSERT INTO listings (id, category_id, title, slug) VALUES (?, ?, ?, ?)",
        args: ["listing-inq", categoryId, "Gym Inq", "gym-inq-test"],
      });
      const result = await db.execute({
        sql: "INSERT INTO inquiries (id, lead_id, listing_id, message) VALUES (?, ?, ?, ?)",
        args: ["inq-1", "lead-inq", "listing-inq", "Interested in this gym"],
      });
      expect(result.rowsAffected).toBe(1);
    });

    it("source defaults to 'businesses'", async () => {
      const result = await db.execute("SELECT source FROM inquiries WHERE id = 'inq-1'");
      expect(result.rows[0].source).toBe("businesses");
    });
  });

  describe("admin_users table", () => {
    it("requires unique email", async () => {
      await db.execute({
        sql: "INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)",
        args: ["admin-1", "ahmed@example.com", "bcrypted-hash"],
      });
      await expect(
        db.execute({
          sql: "INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)",
          args: ["admin-2", "ahmed@example.com", "another-hash"],
        }),
      ).rejects.toThrow();
    });

    it("role enum rejects invalid values", async () => {
      await expect(
        db.execute({
          sql: "INSERT INTO admin_users (id, email, password_hash, role) VALUES (?, ?, ?, ?)",
          args: ["admin-bad", "bad@example.com", "hash", "superadmin"],
        }),
      ).rejects.toThrow();
    });
  });

  describe("admin_sessions table", () => {
    it("links to admin_users via FK", async () => {
      const result = await db.execute({
        sql: "INSERT INTO admin_sessions (id, admin_user_id, expires_at) VALUES (?, ?, ?)",
        args: ["session-token-1", "admin-1", "2026-12-31 23:59:59"],
      });
      expect(result.rowsAffected).toBe(1);
    });
  });

  describe("activity_log table", () => {
    it("accepts bot, admin, system, visitor actor types", async () => {
      for (const actorType of ["bot", "admin", "system", "visitor"]) {
        const result = await db.execute({
          sql: "INSERT INTO activity_log (id, actor_type, action) VALUES (?, ?, ?)",
          args: [`log-${actorType}`, actorType, "test_action"],
        });
        expect(result.rowsAffected).toBe(1);
      }
    });

    it("rejects invalid actor_type", async () => {
      await expect(
        db.execute({
          sql: "INSERT INTO activity_log (id, actor_type, action) VALUES (?, ?, ?)",
          args: ["log-bad", "hacker", "test_action"],
        }),
      ).rejects.toThrow();
    });

    it("source defaults to 'main'", async () => {
      const result = await db.execute("SELECT source FROM activity_log WHERE id = 'log-bot'");
      expect(result.rows[0].source).toBe("main");
    });
  });
});
