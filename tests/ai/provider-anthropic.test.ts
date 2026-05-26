import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk before importing provider
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts?: unknown) {}
  }
  return { default: MockAnthropic };
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("provider — Anthropic branch", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so each test gets a fresh client singleton
    vi.resetModules();
    mockCreate.mockReset();

    // Set Anthropic env vars
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.ANTHROPIC_MODEL;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  // 1. Routes to Anthropic when AI_PROVIDER=anthropic
  it("routes to Anthropic when AI_PROVIDER=anthropic", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("Hello from Claude"));

    const { chat } = await import("@/lib/ai/provider");
    const result = await chat([
      { role: "user", content: "Hi" },
    ]);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result).toBe("Hello from Claude");
  });

  // 2. System prompt is passed in the `system` field, NOT as a message
  it("passes the system prompt in the top-level `system` field", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("OK"));

    const { chat } = await import("@/lib/ai/provider");
    await chat([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is Oman?" },
    ]);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.system).toBe("You are a helpful assistant.");
  });

  // 3. Messages with role "system" are NOT included in the messages array
  it("strips system-role messages from the messages array sent to Anthropic", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("OK"));

    const { chat } = await import("@/lib/ai/provider");
    await chat([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
      { role: "user", content: "Tell me about Oman." },
    ]);

    const callArg = mockCreate.mock.calls[0][0];
    const roles = callArg.messages.map((m: { role: string }) => m.role);
    expect(roles).not.toContain("system");
    expect(roles).toEqual(["user", "assistant", "user"]);
  });

  // 4. Response shape matches the Groq branch (plain string)
  it("returns a plain string matching the Groq branch contract", async () => {
    const expectedText = "Oman is a beautiful country on the Arabian Peninsula.";
    mockCreate.mockResolvedValue(makeAnthropicResponse(expectedText));

    const { chat } = await import("@/lib/ai/provider");
    const result = await chat([{ role: "user", content: "Tell me about Oman." }]);

    expect(typeof result).toBe("string");
    expect(result).toBe(expectedText);
  });

  // 5. Throws a clear error when ANTHROPIC_API_KEY is missing
  it("throws a clear error when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const { chat } = await import("@/lib/ai/provider");
    await expect(chat([{ role: "user", content: "Hi" }])).rejects.toThrow(
      "ANTHROPIC_API_KEY must be set when AI_PROVIDER=anthropic",
    );
  });

  // 6. Uses custom ANTHROPIC_MODEL when set
  it("uses ANTHROPIC_MODEL env var when provided", async () => {
    process.env.ANTHROPIC_MODEL = "claude-opus-4-5";
    mockCreate.mockResolvedValue(makeAnthropicResponse("Custom model response"));

    const { chat } = await import("@/lib/ai/provider");
    await chat([{ role: "user", content: "Hello" }]);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.model).toBe("claude-opus-4-5");
  });

  // 7. Uses default model when ANTHROPIC_MODEL is not set
  it("defaults to claude-haiku-4-5-20251001 when ANTHROPIC_MODEL is unset", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("Default model response"));

    const { chat } = await import("@/lib/ai/provider");
    await chat([{ role: "user", content: "Hello" }]);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.model).toBe("claude-haiku-4-5-20251001");
  });

  // 8. max_tokens mirrors the Groq branch value (300)
  it("sends max_tokens: 300 matching the Groq branch", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("OK"));

    const { chat } = await import("@/lib/ai/provider");
    await chat([{ role: "user", content: "Hello" }]);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.max_tokens).toBe(300);
  });
});

describe("provider — Groq explicit routing (regression guard)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
    // Explicitly set Groq as primary so Anthropic path is NOT triggered
    process.env.AI_PROVIDER = "groq";
    process.env.AI_PROVIDER_FALLBACK = "";
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does NOT call Anthropic when AI_PROVIDER=groq", async () => {
    // Import the module — if it tries to use Anthropic without a key it would
    // throw. Groq will fail too (no real key), but the test is about routing.
    const { chat } = await import("@/lib/ai/provider");

    // Anthropic mock must not have been called even if Groq throws
    try {
      await chat([{ role: "user", content: "Hello" }]);
    } catch {
      // Groq will throw because there's no real API key — that's expected
    }

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
