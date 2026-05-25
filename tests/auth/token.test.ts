import { describe, it, expect } from "vitest";

describe("Token auth", () => {
  it("validateToken is no longer exported from lib/auth/token", async () => {
    const mod = await import("@/lib/auth/token");
    expect((mod as Record<string, unknown>).validateToken).toBeUndefined();
  });
});
