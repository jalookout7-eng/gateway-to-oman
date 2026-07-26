// tests/chat/chat-widget-idle.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { STARTER_CHIPS } from "@/components/chat/ChatIdlePanel";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

// The widget consumes ChatModalContext. Most tests want it inert, but the
// opportunity-card bypass test (below) needs to flip it to an "open with
// context" state — so the mock factory reads a mutable, hoisted object
// instead of returning a fixed value.
const chatModalMock = vi.hoisted(() => ({
  current: {
    isOpen: false,
    config: null as { intent: string; topic?: string } | null,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  },
}));

vi.mock("@/lib/context/ChatModalContext", () => ({
  useChatModal: () => chatModalMock.current,
}));

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

// Snapshot the real jsdom descriptors once, before any test mutates them, so
// the badge/scroll tests can restore them afterwards and can't leak state
// into whichever test runs next (ordering-independence).
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
const originalScrollHeight = Object.getOwnPropertyDescriptor(
  document.documentElement,
  "scrollHeight",
);

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

afterEach(() => {
  cleanup();
  chatModalMock.current = {
    isOpen: false,
    config: null,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  };
  if (originalInnerHeight) Object.defineProperty(window, "innerHeight", originalInnerHeight);
  else delete (window as unknown as Record<string, unknown>).innerHeight;
  if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
  else delete (window as unknown as Record<string, unknown>).scrollY;
  if (originalScrollHeight) {
    Object.defineProperty(document.documentElement, "scrollHeight", originalScrollHeight);
  } else {
    delete (document.documentElement as unknown as Record<string, unknown>).scrollHeight;
  }
});

async function openWidget() {
  const { ChatWidget } = await import("@/components/chat/ChatWidget");
  render(<ChatWidget />);
  fireEvent.click(screen.getByRole("button", { name: /chat with omar/i }));
}

/** Drives the real 30%-scroll-depth teaser trigger (unchanged ChatWidget logic). */
function triggerScrollTeaser() {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 2000,
  });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 400 });
  fireEvent.scroll(window);
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
    triggerScrollTeaser();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Chat with Omar — 1 new message" })).toBeTruthy(),
    );
  });

  it("dismissing the teaser clears the badge and suppresses it for the session", async () => {
    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    render(<ChatWidget />);

    triggerScrollTeaser();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Chat with Omar — 1 new message" })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    // Teaser copy is gone from the DOM…
    await waitFor(() =>
      expect(screen.queryByText(/connect you with a GTO representative/i)).toBeNull(),
    );
    // …and the floating button's accessible name drops the "new message" suffix.
    expect(screen.getByRole("button", { name: "Chat with Omar" })).toBeTruthy();
  });

  it("sending a message from the idle panel's header input transitions to the conversation view", async () => {
    await openWidget();
    await waitFor(() => screen.getByText("Ask Omar"));

    const input = screen.getByPlaceholderText("Ask a question");
    fireEvent.change(input, { target: { value: "What visas are available?" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.queryByText(/Want help getting started\?/i)).toBeNull());
    expect(screen.getByText("What visas are available?")).toBeTruthy();
  });

  it("preserves the conversation across minimize and reopen", async () => {
    await openWidget();
    await waitFor(() => screen.getByText("Ask Omar"));

    fireEvent.click(screen.getByRole("button", { name: STARTER_CHIPS[0] }));
    await waitFor(() => expect(screen.getByText(STARTER_CHIPS[0])).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Minimize chat" }));
    // Widget fully unmounts while minimized (isOpen: false).
    await waitFor(() => expect(screen.queryByText(STARTER_CHIPS[0])).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Chat with Omar" }));

    // Back to the conversation view, not idle — and the earlier message survived.
    await waitFor(() => expect(screen.queryByText(/Want help getting started\?/i)).toBeNull());
    expect(screen.getByText(STARTER_CHIPS[0])).toBeTruthy();
  });

  it("bypasses the idle panel when opened via an opportunity card (ChatModalContext bridge)", async () => {
    chatModalMock.current = {
      isOpen: true,
      config: { intent: "opportunity", topic: "Businesses for Sale" },
      openModal: vi.fn(),
      closeModal: vi.fn(),
    };

    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    render(<ChatWidget />);

    // Seeded topic greeting for "Businesses for Sale" (TOPIC_GREETINGS in
    // ChatWidget), proving the conversation view rendered directly.
    await waitFor(() =>
      expect(screen.getByText(/wide range here from OMR/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/Want help getting started\?/i)).toBeNull();
  });

  it("lets 'Connect with a representative' open the capture form before any conversationId exists", async () => {
    // Reproduces the reachable gap from Task 4's follow-up: an
    // opportunity-card open seeds a greeting directly (conversation view
    // renders, bypassing the idle panel) without ever calling /api/chat, so
    // conversationId is still null when the header menu is available. The
    // Connect action must still surface the form (connectRequested lets the
    // render gate through even with conversationId === null).
    chatModalMock.current = {
      isOpen: true,
      config: { intent: "opportunity", topic: "Businesses for Sale" },
      openModal: vi.fn(),
      closeModal: vi.fn(),
    };

    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    render(<ChatWidget />);

    // Conversation view rendered directly from the seeded topic greeting —
    // no message was sent, so no /api/chat round trip has happened yet and
    // conversationId is still null.
    await waitFor(() => expect(screen.getByText(/wide range here from OMR/i)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /connect with a representative/i }));

    await waitFor(() => expect(screen.getByPlaceholderText("Your name")).toBeTruthy());
  });

  it("does not render at all on admin routes", async () => {
    pathnameMock.mockReturnValue("/admin/leads");
    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    const { container } = render(<ChatWidget />);
    expect(container.innerHTML).toBe("");
  });
});
