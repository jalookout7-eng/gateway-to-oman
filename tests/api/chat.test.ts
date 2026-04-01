import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/provider", () => ({
  chat: vi
    .fn()
    .mockResolvedValue(
      "Welcome! [SEGMENT:investor] [CAPTURE_READY] How can I help?"
    ),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ rows: [{ id: "conv-1" }] }),
    batch: vi.fn().mockResolvedValue([]),
  }),
}));

describe("POST /api/chat", () => {
  it("strips signals from AI response", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hi, I'm interested in investing",
        sessionId: "test-session",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.message).not.toContain("[CAPTURE_READY]");
    expect(data.message).not.toContain("[SEGMENT:");
    expect(data.signals.captureReady).toBe(true);
    expect(data.signals.segment).toBe("investor");
  });
});
