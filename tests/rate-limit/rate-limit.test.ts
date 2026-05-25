import { describe, it, expect, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { rateLimit } from "@/lib/rate-limit";

async function makeTestDb(): Promise<Client> {
  const db = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await db.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return db;
}

describe("rateLimit", () => {
  let db: Client;

  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("allows requests that are under the limit", async () => {
    const result = await rateLimit("test", "192.0.2.1", 3, 60, db);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1 used
  });

  it("blocks the (limit+1)th request in the same window", async () => {
    const bucket = "test_block";
    const id = "192.0.2.2";
    const limit = 3;
    const windowSec = 60;

    // Use up all 3 allowed slots
    for (let i = 0; i < limit; i++) {
      const r = await rateLimit(bucket, id, limit, windowSec, db);
      expect(r.allowed).toBe(true);
    }

    // The (limit+1)th call must be blocked
    const blocked = await rateLimit(bucket, id, limit, windowSec, db);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("treats different identifiers independently", async () => {
    const bucket = "test_independent";
    const limit = 2;
    const windowSec = 60;

    // Exhaust limit for ip-A
    for (let i = 0; i < limit; i++) {
      await rateLimit(bucket, "ip-A", limit, windowSec, db);
    }
    const blockedA = await rateLimit(bucket, "ip-A", limit, windowSec, db);
    expect(blockedA.allowed).toBe(false);

    // ip-B should still be allowed
    const allowedB = await rateLimit(bucket, "ip-B", limit, windowSec, db);
    expect(allowedB.allowed).toBe(true);
  });

  it("fails open when the DB client throws", async () => {
    // Create a broken db client (invalid URL will never connect)
    const brokenDb = createClient({ url: "file::memory:" });
    // Drop the rate_limits table so every query fails
    await brokenDb.execute("DROP TABLE IF EXISTS rate_limits");

    const result = await rateLimit("test_fail_open", "1.2.3.4", 5, 60, brokenDb);
    // Should fail open — allow the request
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.retryAfterSec).toBe(0);
  });

  it("retryAfterSec is positive and within the window", async () => {
    const windowSec = 60;
    const result = await rateLimit("test_retry", "192.0.2.3", 10, windowSec, db);
    expect(result.retryAfterSec).toBeGreaterThanOrEqual(0);
    expect(result.retryAfterSec).toBeLessThanOrEqual(windowSec);
  });
});
