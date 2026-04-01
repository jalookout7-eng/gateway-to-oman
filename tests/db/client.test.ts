import { describe, it, expect, vi } from "vitest";

vi.stubEnv("TURSO_DATABASE_URL", "file::memory:");
vi.stubEnv("TURSO_AUTH_TOKEN", "test-token");

describe("Database client", () => {
  it("exports a getDb function", async () => {
    const { getDb } = await import("@/lib/db/client");
    expect(typeof getDb).toBe("function");
  });

  it("returns a client with execute method", async () => {
    const { getDb } = await import("@/lib/db/client");
    const db = getDb();
    expect(typeof db.execute).toBe("function");
  });
});
