import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("Token auth", () => {
  it("returns true for valid token", async () => {
    vi.stubEnv("ADMIN_TOKEN", "secret123");
    const { validateToken } = await import("@/lib/auth/token");
    expect(validateToken("secret123")).toBe(true);
  });

  it("returns false for invalid token", async () => {
    vi.stubEnv("ADMIN_TOKEN", "secret123");
    const { validateToken } = await import("@/lib/auth/token");
    expect(validateToken("wrong")).toBe(false);
  });

  it("returns false when ADMIN_TOKEN is not set", async () => {
    vi.stubEnv("ADMIN_TOKEN", "");
    const { validateToken } = await import("@/lib/auth/token");
    expect(validateToken("anything")).toBe(false);
  });
});
