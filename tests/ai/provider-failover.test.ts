import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock both providers before importing provider
// ---------------------------------------------------------------------------

const mockAnthropicCreate = vi.fn();
const mockGroqCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockAnthropicCreate };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts?: unknown) {}
  }
  return { default: MockAnthropic };
});

vi.mock("groq-sdk", () => {
  class MockGroq {
    chat = {
      completions: {
        create: mockGroqCreate,
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts?: unknown) {}
  }
  return { default: MockGroq };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAnthropicResponse(text: string) {
  return {
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
  };
}

function makeGroqResponse(text: string) {
  return {
    choices: [{ message: { content: text } }],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("provider — failover behaviour", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockAnthropicCreate.mockReset();
    mockGroqCreate.mockReset();

    // Base environment: Anthropic primary (default), Groq fallback (default)
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_PROVIDER_FALLBACK = "groq";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.AI_BACKEND_MODE = "groq-direct";
    delete process.env.ANTHROPIC_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // 1. Default primary is Anthropic (no env override)
  it("default primary is Anthropic when AI_PROVIDER is unset", async () => {
    delete process.env.AI_PROVIDER;
    mockAnthropicCreate.mockResolvedValue(makeAnthropicResponse("Hello from Claude"));

    const { chat } = await import("@/lib/ai/provider");
    const result = await chat([{ role: "user", content: "Hi" }]);

    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
    expect(mockGroqCreate).not.toHaveBeenCalled();
    expect(result).toBe("Hello from Claude");
  });

  // 2. Failover happens on Anthropic 529 (overloaded)
  it("fails over to Groq on Anthropic 529 (overloaded)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const overloadedError = Object.assign(new Error("Service overloaded"), { status: 529 });
    mockAnthropicCreate.mockRejectedValue(overloadedError);
    mockGroqCreate.mockResolvedValue(makeGroqResponse("Hello from Groq fallback"));

    const { chat } = await import("@/lib/ai/provider");
    const result = await chat([{ role: "user", content: "Hi" }]);

    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
    expect(mockGroqCreate).toHaveBeenCalledOnce();
    expect(result).toBe("Hello from Groq fallback");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/primary "anthropic" failed/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/failing over to "groq"/);

    warnSpy.mockRestore();
  });

  // 3. Failover happens on a network/connection error
  it("fails over to Groq on APIConnectionError from primary", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const connError = Object.assign(new Error("Connection failed"), { name: "APIConnectionError" });
    mockAnthropicCreate.mockRejectedValue(connError);
    mockGroqCreate.mockResolvedValue(makeGroqResponse("Groq responded after failover"));

    const { chat } = await import("@/lib/ai/provider");
    const result = await chat([{ role: "user", content: "Hi" }]);

    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
    expect(mockGroqCreate).toHaveBeenCalledOnce();
    expect(result).toBe("Groq responded after failover");
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });

  // 4. No failover on 400 bad request — rethrow primary error
  it("does NOT fail over on 400 bad request — rethrows primary error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const badRequestError = Object.assign(new Error("bad request"), { status: 400 });
    mockAnthropicCreate.mockRejectedValue(badRequestError);

    const { chat } = await import("@/lib/ai/provider");
    await expect(chat([{ role: "user", content: "Hi" }])).rejects.toThrow("bad request");

    expect(mockGroqCreate).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // 5. No failover when AI_PROVIDER_FALLBACK="" (disabled)
  it("does NOT fail over when AI_PROVIDER_FALLBACK is empty string", async () => {
    process.env.AI_PROVIDER_FALLBACK = "";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const overloadedError = Object.assign(new Error("Service overloaded"), { status: 529 });
    mockAnthropicCreate.mockRejectedValue(overloadedError);

    const { chat } = await import("@/lib/ai/provider");
    await expect(chat([{ role: "user", content: "Hi" }])).rejects.toThrow("Service overloaded");

    expect(mockGroqCreate).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // 6. No failover when primary === fallback (prevents self-loop)
  it("does NOT fail over when primary and fallback are the same provider", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.AI_PROVIDER_FALLBACK = "groq";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rateLimitError = Object.assign(new Error("rate limited"), { status: 429 });
    mockGroqCreate.mockRejectedValue(rateLimitError);

    const { chat } = await import("@/lib/ai/provider");
    await expect(chat([{ role: "user", content: "Hi" }])).rejects.toThrow("rate limited");

    // Groq is called exactly once — no self-retry
    expect(mockGroqCreate).toHaveBeenCalledOnce();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // 7. Both fail → fallback error is surfaced (not primary error)
  it("surfaces the fallback error when both primary and fallback throw", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const primaryError = Object.assign(new Error("primary 529"), { status: 529 });
    const fallbackError = Object.assign(new Error("fallback 500"), { status: 500 });
    mockAnthropicCreate.mockRejectedValue(primaryError);
    mockGroqCreate.mockRejectedValue(fallbackError);

    const { chat } = await import("@/lib/ai/provider");
    await expect(chat([{ role: "user", content: "Hi" }])).rejects.toThrow("fallback 500");

    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
    expect(mockGroqCreate).toHaveBeenCalledOnce();
    // warn was called for the initial failover
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });
});
