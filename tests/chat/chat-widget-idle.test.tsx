// tests/chat/chat-widget-idle.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { STARTER_CHIPS } from "@/components/chat/ChatIdlePanel";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

// The widget consumes ChatModalContext; provide an inert version.
vi.mock("@/lib/context/ChatModalContext", () => ({
  useChatModal: () => ({ isOpen: false, config: null, openModal: vi.fn(), closeModal: vi.fn() }),
}));

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

beforeEach(() => {
  pathnameMock.mockReturnValue("/");
  trackEventMock.mockClear();
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ reply: "Hello from Omar", conversationId: "c1" }),
  })) as unknown as typeof fetch;
  // jsdom doesn't implement scrollIntoView; ChatWidget's existing
  // scroll-to-bottom effect calls it once ChatMessages mounts (i.e. once a
  // chip click puts us into the conversation view). Stub it here only —
  // production code is untouched.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

async function openWidget() {
  const { ChatWidget } = await import("@/components/chat/ChatWidget");
  render(<ChatWidget />);
  fireEvent.click(screen.getByRole("button", { name: /chat with omar/i }));
}

describe("ChatWidget idle panel", () => {
  it("opens onto the idle panel instead of a seeded greeting bubble", async () => {
    await openWidget();
    await waitFor(() => expect(screen.getByText("Ask Omar")).toBeTruthy());
    expect(screen.getByText(/Want help getting started\?/i)).toBeTruthy();
  });

  it("still fires chat_opened with the aws variant id", async () => {
    await openWidget();
    await waitFor(() => expect(trackEventMock).toHaveBeenCalled());
    const call = trackEventMock.mock.calls.find((c) => c[0] === "chat_opened");
    expect(call).toBeTruthy();
    expect((call?.[1] as Record<string, unknown>).hook_variant).toBe("default-aws-1");
  });

  it("leaves the idle panel once a starter chip is clicked", async () => {
    await openWidget();
    await waitFor(() => screen.getByText("Ask Omar"));
    fireEvent.click(screen.getByRole("button", { name: STARTER_CHIPS[0] }));
    await waitFor(() => expect(screen.queryByText("Want help getting started?")).toBeNull());
  });

  it("shows the visitor's chip text as a message", async () => {
    await openWidget();
    await waitFor(() => screen.getByText("Ask Omar"));
    fireEvent.click(screen.getByRole("button", { name: STARTER_CHIPS[2] }));
    await waitFor(() => expect(screen.getByText(STARTER_CHIPS[2])).toBeTruthy());
  });

  it("renders the disclaimer link to /terms while idle", async () => {
    await openWidget();
    await waitFor(() => screen.getByText("Ask Omar"));
    expect(screen.getByRole("link", { name: /disclaimer/i }).getAttribute("href")).toBe("/terms");
  });

  it("shows an accessible unread cue on the floating button once the teaser fires", async () => {
    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    render(<ChatWidget />);

    // Before any scroll, the floating button's label carries no unread cue.
    expect(screen.getByRole("button", { name: "Chat with Omar" })).toBeTruthy();

    // Drive the existing 30%-scroll-depth trigger (unchanged logic in
    // ChatWidget) by giving jsdom a scrollable document, then dispatching a
    // scroll event past the 0.3 threshold.
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 400 });
    fireEvent.scroll(window);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Chat with Omar — 1 new message" })).toBeTruthy(),
    );
  });

  it("does not render at all on admin routes", async () => {
    pathnameMock.mockReturnValue("/admin/leads");
    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    const { container } = render(<ChatWidget />);
    expect(container.innerHTML).toBe("");
  });
});
