# Omar Chat Widget — AWS-Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Omar widget to the AWS "Ask AWS" pattern — teaser bar with unread badge, an idle panel with an embedded input and three starter chips, disclaimer footer, minimize — in GTO navy/gold, without touching Omar's conversation logic.

**Architecture:** The idle screen becomes its own component (`ChatIdlePanel`) so `ChatWidget.tsx` (650 lines) doesn't grow further; it receives a single `onStart(text)` callback and owns no conversation state. "Idle" is derived, not stored: `messages.length === 0`. The teaser's fixed copy moves into `lib/ai/prompts.ts` so the A/B plumbing and its variant-id contract stay in one place.

**Tech Stack:** Next.js 14 client components, framer-motion (already in use), Tailwind, vitest + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-chat-widget-aws-redesign-design.md` — read it; JA edited it directly and those notes are binding.
- Baselines: **259/259 tests across 43 files** · `npx tsc --noEmit` = exactly **3 pre-existing** test-file errors (2× `tests/admin/lead-update.test.ts`, 1× `tests/api/chat.test.ts`) · `npm run build` = **85 routes**. Add nothing to any of these.
- **This is a reskin, not a rebuild.** Do NOT modify: the conversation state machine (capture opt-in, keep-chat, HOT-lead CTAs, `[LEAD CAPTURED]`), `sendMessage`, `/api/chat` or `/api/chat/event` calls, lead scoring, `lib/ai/prompts.ts` prompt text, or `ChatMessages`/`ChatInput`/`LeadCaptureForm`.
- **All existing GA events keep firing with identical names and params**: `chat_opened`, `chat_message_sent`, `lead_submit`, `whatsapp_click`, `calendly_click`, `booking_button_click`.
- **JA note (2026-07-25): the floating chat BUTTON keeps its current design.** Do not restyle it to a navy square. The only change to it is the unread badge.
- **JA note (2026-07-25): GTO navy/gold throughout.** No AWS purple. Use `bg-navy`, `text-gold`, `gold-gradient` — no raw hex.
- WhatsApp floating button is untouched and stays stacked beside Omar's.
- Widget must still return null on `/admin` and the two auth paths (existing guard at `ChatWidget.tsx:440-442`).
- Both floating buttons carry `gto-floating-action` (the consent banner's lift hook) — preserve that class.
- Measurement contract: the fixed teaser copy replaces the 5-variant rotation, so `hook_variant_id` becomes `<surface>-aws-1`. The existing `conversations.hook_variant_id` column and the HANDOVER's A/B SQL keep working; prior variant data stays comparable.
- Stage only your task's files; never `git add -A`; never stage `HANDOVER.md`.
- Commits: conventional, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **NO DEPLOY.** Three features are already built and held for JA's single production deploy; this joins them.

---

### Task 1: Fixed teaser copy + variant id

**Files:**
- Modify: `lib/ai/prompts.ts` (`pickTeaserVariant`, ~line 339)
- Test: `tests/ai/teaser-variant.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `pickTeaserVariant(section?: string)` returns the SAME object every call: `{ text: AWS_TEASER_TEXT, variantId: "<section>-aws-1" }`. `TEASER_VARIANTS` and `getContextualTeaser` keep their current exports and behavior (other call sites and tests depend on them).

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/teaser-variant.test.ts
import { describe, it, expect } from "vitest";
import { pickTeaserVariant, getContextualTeaser } from "@/lib/ai/prompts";

describe("pickTeaserVariant (AWS-style fixed teaser)", () => {
  it("returns the same copy every call — the rotation is suspended", () => {
    const a = pickTeaserVariant("default");
    const b = pickTeaserVariant("default");
    expect(a.text).toBe(b.text);
    expect(a.variantId).toBe(b.variantId);
  });

  it("uses JA's approved teaser copy", () => {
    const { text } = pickTeaserVariant("default");
    expect(text).toBe(
      "Hi, I can connect you with a GTO representative or answer questions you have on your move to Oman or business search in Oman.",
    );
  });

  it("tags the variant id per surface so the A/B query keeps working", () => {
    expect(pickTeaserVariant("default").variantId).toBe("default-aws-1");
    expect(pickTeaserVariant("businesses").variantId).toBe("businesses-aws-1");
  });

  it("falls back to the default surface key when none is given", () => {
    expect(pickTeaserVariant().variantId).toBe("default-aws-1");
  });

  it("leaves getContextualTeaser (used elsewhere) untouched", () => {
    expect(typeof getContextualTeaser("default")).toBe("string");
    expect(getContextualTeaser("default").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/teaser-variant.test.ts`
Expected: FAIL — copy/variantId assertions fail (currently random rotation).

- [ ] **Step 3: Replace the picker body**

In `lib/ai/prompts.ts`, replace the body of `pickTeaserVariant` (keep the signature and the existing doc comment above it, adding to it):

```ts
/**
 * The teaser shown above the Omar button.
 *
 * 2026-07-26: the 5-variant A/B rotation is SUSPENDED in favour of one fixed
 * line (AWS-style widget redesign, JA's approved copy). The variant id keeps
 * the `<surface>-<n>` shape so `conversations.hook_variant_id` and the
 * conversion query in HANDOVER §Hook A/B keep working, and earlier variant
 * data stays comparable. TEASER_VARIANTS below is intentionally left in place
 * for when the experiment resumes — do not delete it.
 */
export const AWS_TEASER_TEXT =
  "Hi, I can connect you with a GTO representative or answer questions you have on your move to Oman or business search in Oman.";

export function pickTeaserVariant(section?: string): {
  text: string;
  variantId: string;
} {
  const key = section ?? "default";
  return { text: AWS_TEASER_TEXT, variantId: `${key}-aws-1` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/teaser-variant.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Confirm no neighbour broke**

Run: `npx vitest run tests/ai/`
Expected: all green (some existing tests exercise `TEASER_VARIANTS`/`getContextualTeaser` — those must be unaffected).

- [ ] **Step 6: Commit**

```bash
git add lib/ai/prompts.ts tests/ai/teaser-variant.test.ts
git commit -m "feat(chat): fixed AWS-style teaser copy, suspends hook A/B rotation"
```

---

### Task 2: ChatIdlePanel component

**Files:**
- Create: `components/chat/ChatIdlePanel.tsx`
- Test: `tests/chat/chat-idle-panel.test.tsx` (create dir)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `ChatIdlePanel({ onStart, onMinimize }: { onStart: (text: string) => void; onMinimize: () => void })`.
- `STARTER_CHIPS` is exported from this file so Task 3's tests can reference the copy without duplicating strings.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/chat/chat-idle-panel.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChatIdlePanel, STARTER_CHIPS } from "@/components/chat/ChatIdlePanel";

afterEach(cleanup);

describe("ChatIdlePanel", () => {
  it("shows the title, subtitle and the AI-advisor badge", () => {
    render(<ChatIdlePanel onStart={() => {}} onMinimize={() => {}} />);
    expect(screen.getByText("Ask Omar")).toBeTruthy();
    expect(screen.getByText(/AI advisor/i)).toBeTruthy();
    expect(screen.getByText(/guidance on investing, relocating/i)).toBeTruthy();
  });

  it("renders exactly three starter chips with the approved copy", () => {
    render(<ChatIdlePanel onStart={() => {}} onMinimize={() => {}} />);
    expect(STARTER_CHIPS).toHaveLength(3);
    STARTER_CHIPS.forEach((chip) => {
      expect(screen.getByRole("button", { name: chip })).toBeTruthy();
    });
  });

  it("sends the chip text through onStart when a chip is clicked", () => {
    const onStart = vi.fn();
    render(<ChatIdlePanel onStart={onStart} onMinimize={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: STARTER_CHIPS[1] }));
    expect(onStart).toHaveBeenCalledWith(STARTER_CHIPS[1]);
  });

  it("sends typed text on submit and clears the field", () => {
    const onStart = vi.fn();
    render(<ChatIdlePanel onStart={onStart} onMinimize={() => {}} />);
    const input = screen.getByPlaceholderText("Ask a question") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Can I get residency?" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(onStart).toHaveBeenCalledWith("Can I get residency?");
    expect(input.value).toBe("");
  });

  it("ignores an empty or whitespace-only submit", () => {
    const onStart = vi.fn();
    render(<ChatIdlePanel onStart={onStart} onMinimize={() => {}} />);
    const input = screen.getByPlaceholderText("Ask a question");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("calls onMinimize from the minimize control", () => {
    const onMinimize = vi.fn();
    render(<ChatIdlePanel onStart={() => {}} onMinimize={onMinimize} />);
    fireEvent.click(screen.getByRole("button", { name: /minimi[sz]e/i }));
    expect(onMinimize).toHaveBeenCalledOnce();
  });

  it("links the disclaimer to /terms", () => {
    render(<ChatIdlePanel onStart={() => {}} onMinimize={() => {}} />);
    const link = screen.getByRole("link", { name: /disclaimer/i });
    expect(link.getAttribute("href")).toBe("/terms");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chat/chat-idle-panel.test.tsx`
Expected: FAIL — cannot resolve `@/components/chat/ChatIdlePanel`

- [ ] **Step 3: Write the component**

```tsx
// components/chat/ChatIdlePanel.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Minus } from "lucide-react";

/**
 * The idle screen shown when Omar is opened with no conversation yet
 * (AWS "Ask AWS" pattern in GTO navy/gold — spec 2026-07-25).
 *
 * Deliberately stateless beyond its own input: `onStart` hands the text to
 * ChatWidget, which owns every piece of conversation state. Once a message
 * exists this panel is gone for the session, so it never competes with the
 * message list for control.
 */

/**
 * Chip copy maps onto Omar's qualification segments (entrepreneur/investor,
 * professional, retiree), so the first click already advances qualification
 * instead of costing an exchange.
 */
export const STARTER_CHIPS = [
  "I want to explore business or investment opportunities",
  "I'm considering relocating or working in Oman",
  "I'm planning retirement in Oman",
] as const;

export function ChatIdlePanel({
  onStart,
  onMinimize,
}: {
  onStart: (text: string) => void;
  onMinimize: () => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onStart(text);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header block — navy gradient with a gold underline accent. */}
      <div className="bg-gradient-to-b from-navy to-[#252542] px-5 pt-4 pb-6 border-b-2 border-gold/60 flex-shrink-0">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize chat"
            className="text-white/80 hover:text-white p-1 -m-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2.5">
          <h2 className="text-white text-2xl font-bold leading-none">Ask Omar</h2>
          <span className="inline-flex items-center rounded-md border border-white/40 px-2 py-0.5 text-[11px] font-medium text-white/90">
            AI advisor
          </span>
        </div>

        <p className="mt-2.5 text-sm text-white/80 leading-relaxed">
          Get guidance on investing, relocating, and doing business in Oman.
        </p>

        <form onSubmit={submit} className="mt-4 relative">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question"
            aria-label="Ask a question"
            className="w-full rounded-lg bg-white py-3 pl-4 pr-12 text-sm text-navy placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gold/50"
          />
          <button
            type="submit"
            aria-label="Send"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full gold-gradient text-white flex items-center justify-center hover:shadow-md transition-shadow"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Starter chips */}
      <div className="flex-1 px-5 py-5">
        <h3 className="text-navy font-semibold text-base">Want help getting started?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Tell us a little bit about what you&apos;re looking for.
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {STARTER_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onStart(chip)}
              className="text-left rounded-xl border border-gold/40 bg-gradient-to-r from-gold/10 to-navy/5 px-4 py-3 text-sm text-navy hover:border-gold hover:shadow-sm transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <p className="flex-shrink-0 px-5 pb-4 text-center text-xs text-gray-400">
        By chatting, you agree to this{" "}
        <Link href="/terms" className="text-gray-500 underline hover:text-navy transition-colors">
          disclaimer
        </Link>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chat/chat-idle-panel.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatIdlePanel.tsx tests/chat/chat-idle-panel.test.tsx
git commit -m "feat(chat): AWS-style idle panel with starter chips"
```

---

### Task 3: Wire the idle panel, teaser bar and unread badge into ChatWidget

**Files:**
- Modify: `components/chat/ChatWidget.tsx` (button block ~448-463, teaser block ~465-513, chat window header ~529-552, and the panel body)
- Test: `tests/chat/chat-widget-idle.test.tsx` (create)

**Interfaces:**
- Consumes: `pickTeaserVariant` (Task 1, already imported), `ChatIdlePanel` + `STARTER_CHIPS` (Task 2).
- Produces: nothing downstream.

**Behavioral contract (read carefully — this is the risky task):**
1. **Idle is derived, not stored:** the idle panel shows when `isOpen && messages.length === 0`. The conversation view shows otherwise. No new "hasStarted" state.
2. **`handleOpen` must STOP seeding the greeting message.** Today it sets `messages[0]` to `getContextualGreeting(...)`; delete that seeding from `handleOpen` only, so opening from the floating button lands on the idle panel. Keep the `trackEvent("chat_opened", …)` call exactly as-is.
3. **The opportunity-card path is UNCHANGED** — its `useEffect` still seeds the topic greeting, so `messages.length > 0` and the visitor skips idle straight into conversation. Do not touch that effect.
4. **Starting from idle** (chip click or header input) calls the existing `sendMessage(text)`. Do not write a new send path; `sendMessage` already fires `chat_message_sent`, creates the conversation, and appends the user message.
5. **Unread badge:** a small red badge with "1" overlays the floating button when the teaser is showing (`showTeaser && !teaserDismissed && !isOpen`). It disappears when the chat opens or the teaser is dismissed — both already flip those flags, so derive it, don't store it.
6. **Teaser bar restyle:** navy rounded bar, chat icon with gold accent, the fixed copy, × dismiss. Keep the existing trigger (30% scroll), the existing dismiss handler, and the existing `handleOpen` on click.
7. **Minimize:** the conversation header's X becomes a minimize dash calling the SAME `setIsOpen(false)` (conversation already persists). Keep `aria-label` meaningful ("Minimize chat").

- [ ] **Step 1: Write the failing test**

```tsx
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

  it("does not render at all on admin routes", async () => {
    pathnameMock.mockReturnValue("/admin/leads");
    const { ChatWidget } = await import("@/components/chat/ChatWidget");
    const { container } = render(<ChatWidget />);
    expect(container.innerHTML).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chat/chat-widget-idle.test.tsx`
Expected: FAIL — opening seeds a greeting; no "Ask Omar" idle panel exists.

- [ ] **Step 3: Apply the four edits to `ChatWidget.tsx`**

**(a) Import the panel.** Add near the other component imports:

```tsx
import { ChatIdlePanel } from "@/components/chat/ChatIdlePanel";
```

**(b) Stop seeding the greeting in `handleOpen`.** Replace the whole `handleOpen` callback with:

```tsx
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    trackEvent("chat_opened", {
      surface: resolveSurface(pathname ?? "/").page,
      hook_variant: teaserVariant.variantId,
    });
    // No greeting is seeded here any more: with zero messages the widget
    // shows ChatIdlePanel, which is the greeting now. The opportunity-card
    // effect below still seeds its topic greeting, so that path skips idle.
  }, [pathname, teaserVariant.variantId]);
```

(Note the dependency array drops `messages.length` — it is no longer read.)

**(c) Add the unread badge to the floating button.** Replace the `<motion.button>`'s children (currently just the `MessageCircle`) with:

```tsx
            <MessageCircle className="h-6 w-6" strokeWidth={2} />
            {showTeaser && !teaserDismissed && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-md bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow"
              >
                1
              </span>
            )}
```

and add `relative` to that button's className (keep every other class, including `gto-floating-action`, and keep the button's existing gold-gradient design — JA's note).

**(d) Restyle the teaser bar.** Replace the teaser `motion.div`'s className and inner markup (keep the `AnimatePresence`, the condition, the motion props, and the dismiss/`handleOpen` handlers exactly):

```tsx
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)]
              rounded-2xl bg-navy shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <button
              onClick={() => setTeaserDismissed(true)}
              aria-label="Dismiss"
              className="absolute top-2.5 right-2.5 p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <button onClick={handleOpen} className="w-full text-left flex gap-3 p-4 pr-9">
              <MessageCircle className="h-6 w-6 text-gold flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-sm text-white leading-relaxed">{teaserVariant.text}</p>
            </button>
          </motion.div>
```

**(e) Render idle vs conversation.** Inside the chat-window `motion.div`, replace everything from the `{/* Header */}` block through the closing of the input line with:

```tsx
            {messages.length === 0 ? (
              <ChatIdlePanel onStart={sendMessage} onMinimize={() => setIsOpen(false)} />
            ) : (
              <>
                {/* Header */}
                <div className="bg-navy px-4 py-3.5 flex items-center justify-between flex-shrink-0 border-b-2 border-gold/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="leading-tight min-w-0">
                      <p className="text-white font-semibold text-sm truncate">Ask Omar</p>
                      <p className="text-white/70 text-xs flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Gateway to Oman
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label="Minimize chat"
                    className="text-white/80 hover:text-white p-1.5 -m-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                </div>

                {/* ...ALL existing children unchanged, in order: ChatMessages,
                    capture prompt, LeadCaptureForm, post-capture choice,
                    HOT-lead CTAs, WhatsApp handoff, ChatInput... */}
              </>
            )}
```

**Critical:** move the existing children (ChatMessages, capture prompt, capture form, post-capture choice, HOT-lead CTAs, WhatsApp handoff, ChatInput) inside the `<>…</>` **verbatim** — do not edit their props, conditions, or order. Import `Minus` from `lucide-react` alongside the existing icon imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chat/chat-widget-idle.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatWidget.tsx tests/chat/chat-widget-idle.test.tsx
git commit -m "feat(chat): AWS-style idle panel, teaser bar and unread badge"
```

---

### Task 4: Full verification (NO deploy)

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: **277 passing** (259 baseline + 18 new: 5 + 7 + 6). Report the real number if it differs.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exactly the 3 pre-existing test-file errors, nothing new.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean, 85 routes.

- [ ] **Step 4: Regression sweep of the untouched conversation machinery**

Run: `npx vitest run tests/ai/ tests/integration/ tests/api/chat.test.ts`
Expected: all green — this is the check that the reskin didn't disturb Omar's logic.

- [ ] **Step 5: STOP — no deploy**

Report to the controller. This ships with the mobile nav, Batch 16 and the consent banner in JA's single production deploy, and needs a visual click-test on both mobile and desktop first.

---

## Self-review notes (done at write time)

- Spec coverage: fixed teaser + variant-id contract ✓ (T1), teaser bar restyle ✓ (T3d), unread badge ✓ (T3c), idle header with embedded input ✓ (T2), three segment-mapped chips ✓ (T2), disclaimer → `/terms` ✓ (T2), minimize preserving conversation ✓ (T2/T3e), conversation view unchanged ✓ (T3e verbatim-move instruction), opportunity-card path bypasses idle ✓ (T3 contract item 3), GA events preserved ✓ (T3 contract items 2 and 4), button design kept per JA ✓ (Global Constraints + T3c), navy/gold only ✓.
- Deviation, documented: spec described the AWS "built-in" chip as a badge; implemented as "AI advisor" since "built-in" is meaningless off AWS.
- Risk called out where it lives: Task 3 is the only task that can break live behavior, so its contract is spelled out as seven numbered rules and the child-elements move is marked verbatim.
- Type consistency: `STARTER_CHIPS` exported from Task 2 and imported by Task 3's tests; `onStart`/`onMinimize` signatures identical in T2's code, T2's tests and T3's usage. Test counts sum to Task 4's 277.
