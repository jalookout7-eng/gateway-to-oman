# Mobile + Chat Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seven fixes from JA's preview click-test: kill em dashes in Omar's voice, render markdown instead of literal asterisks, make the mobile widget survive the keyboard, add a header menu with connect/close-session, add a `connect` qualification tier, and fix two mobile admin defects.

**Architecture:** Each fix lands in the smallest owning unit. Text normalisation joins the existing `stripSignals` chokepoint in `lib/ai/signals.ts` (the one place every model reply passes through before persist and display). Markdown becomes a pure parser module rendered by `ChatMessages`. The keyboard fix and header menu are contained inside `ChatWidget`/a new menu component. The `connect` tier is a `lead_options` row plus a scoring bypass — no migration.

**Tech Stack:** Next.js 14 client components, Turso/libsql, vitest + @testing-library/react + jsdom.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-mobile-chat-polish-design.md`. **§1 was deliberately removed** — do not reintroduce greeting seeding or any change to the idle→conversation transition.
- Baselines: **282/282 tests across 45 files** · `npx tsc --noEmit` = exactly **3 pre-existing** test-file errors (2× `tests/admin/lead-update.test.ts`, 1× `tests/api/chat.test.ts`) · `npm run build` = **85 routes**. Add nothing to any of these.
- Do NOT change: Omar's qualification logic (beyond the `connect` bypass), the conversation state machine, GA event names/params, the idle panel's layout or copy, the hook A/B decision.
- **No `dangerouslySetInnerHTML` anywhere in this batch.** Model output is untrusted; markdown must parse to React elements.
- **Do NOT add `maximum-scale=1` or `user-scalable=no`** — that breaks pinch-zoom accessibility. The zoom fix is font-size only.
- Brand tokens only (`bg-navy`, `text-gold`, `gold-gradient`); red for destructive actions may use `text-red-600`/`bg-red-*`.
- Stage only your task's files; never `git add -A`; never stage `HANDOVER.md`.
- Commits: conventional, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **NO DEPLOY.** Four features are already stacked awaiting JA's single production deploy; this joins them. Tasks 3 and 7 need a real-device check on a preview afterwards — they cannot be verified in jsdom.

---

### Task 1: Em-dash normalisation + prompt cleanup

**Files:**
- Modify: `lib/ai/signals.ts` (add normaliser, apply inside `stripSignals`)
- Modify: `lib/ai/prompts.ts` (remove em dashes from prompt copy, add the voice rule)
- Test: `tests/ai/normalise-dashes.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `normaliseDashes(text: string): string` exported from `lib/ai/signals.ts`. `stripSignals` applies it, so every persisted and displayed Omar reply is normalised at the existing chokepoint (`app/api/chat/route.ts:163`).

**Conversion rules** (deliberate, test-pinned):
- `word — word` / `word – word` (spaced dash) → `word, word`
- `word—word` (unspaced) → `word, word`
- A dash directly before terminal punctuation or end of string → drop the dash, keep spacing sane
- Never touch hyphens in compounds (`follow-up`, `co-founder`, `Al-Azizi`) or numeric ranges written with hyphens
- Idempotent: running it twice changes nothing

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/normalise-dashes.test.ts
import { describe, it, expect } from "vitest";
import { normaliseDashes, stripSignals } from "@/lib/ai/signals";

describe("normaliseDashes", () => {
  it("replaces a spaced em dash with a comma", () => {
    expect(normaliseDashes("Got it — so you're looking at both angles")).toBe(
      "Got it, so you're looking at both angles",
    );
  });

  it("replaces an unspaced em dash with a comma and a space", () => {
    expect(normaliseDashes("owning a business—or deploying capital")).toBe(
      "owning a business, or deploying capital",
    );
  });

  it("handles en dashes the same way", () => {
    expect(normaliseDashes("I'm Omar – happy to help")).toBe("I'm Omar, happy to help");
  });

  it("drops a trailing dash before end of string", () => {
    expect(normaliseDashes("whichever resonates —")).toBe("whichever resonates");
  });

  it("drops a dash sitting directly before terminal punctuation", () => {
    expect(normaliseDashes("that shapes what comes next —.")).toBe("that shapes what comes next.");
  });

  it("leaves hyphenated compounds alone", () => {
    expect(normaliseDashes("a follow-up with our co-founder at Al-Azizi")).toBe(
      "a follow-up with our co-founder at Al-Azizi",
    );
  });

  it("leaves text with no dashes untouched", () => {
    expect(normaliseDashes("Plain sentence with no dashes.")).toBe(
      "Plain sentence with no dashes.",
    );
  });

  it("is idempotent", () => {
    const once = normaliseDashes("Got it — so you're looking at both angles");
    expect(normaliseDashes(once)).toBe(once);
  });

  it("handles multiple dashes in one string", () => {
    expect(normaliseDashes("A — B — C")).toBe("A, B, C");
  });
});

describe("stripSignals applies dash normalisation", () => {
  it("normalises dashes in the cleaned reply", () => {
    expect(stripSignals("Got it — here's the plan")).toBe("Got it, here's the plan");
  });

  it("still strips signal markers", () => {
    const out = stripSignals("[SEGMENT:investor] Ready to help — let's begin");
    expect(out).not.toContain("[SEGMENT:");
    expect(out).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/normalise-dashes.test.ts`
Expected: FAIL — `normaliseDashes` is not exported.

- [ ] **Step 3: Implement the normaliser**

In `lib/ai/signals.ts`, add above `stripSignals`:

```ts
/**
 * Omar must never use em or en dashes (JA, 2026-07-26 — the style leaked from
 * the prompt copy itself). The prompt now says so, but model instructions leak,
 * so every reply is normalised here: stripSignals is the single chokepoint each
 * assistant message passes through before it is persisted and displayed
 * (app/api/chat/route.ts).
 *
 * Hyphens are left alone — "follow-up" and "Al-Azizi" are correct.
 */
export function normaliseDashes(text: string): string {
  return text
    // Dash immediately before terminal punctuation: drop the dash.
    .replace(/\s*[—–]\s*(?=[.!?,;:])/g, "")
    // Dash at end of string (with or without trailing space): drop it.
    .replace(/\s*[—–]\s*$/g, "")
    // Any remaining dash, spaced or not, becomes a comma.
    .replace(/\s*[—–]\s*/g, ", ");
}
```

Then apply it as the LAST step inside `stripSignals` — after the existing marker-stripping, before the final trim/return. Read the current body and integrate without changing what it already removes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/normalise-dashes.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Clean the prompt copy and add the rule**

In `lib/ai/prompts.ts`: replace every em dash (`—`) and en dash (`–`) in Omar-facing prompt strings with a comma, period, or parentheses — whichever reads naturally. There are ~78. Do NOT alter meaning, structure, or any signal markers (`[SEGMENT:...]`, `[CAPTURE_READY]` etc.), and do not touch hyphens.

Add to the existing voice rules (find the section listing Omar's style constraints):

```
- Never use em dashes or en dashes. Use commas, periods, or parentheses instead.
```

Verify: `grep -c '—\|–' lib/ai/prompts.ts` returns 0.

- [ ] **Step 6: Confirm prompt tests still pass**

Run: `npx vitest run tests/ai/`
Expected: all green. If a test asserts on prompt text containing a dash, update the ASSERTION to match the new copy — do not revert the copy.

- [ ] **Step 7: Commit**

```bash
git add lib/ai/signals.ts lib/ai/prompts.ts tests/ai/normalise-dashes.test.ts
git commit -m "fix(chat): strip em dashes from Omar's voice at source and on output"
```

---

### Task 2: Render markdown instead of literal asterisks

**Files:**
- Create: `lib/chat/markdown.ts`
- Modify: `components/chat/ChatMessages.tsx` (line ~44, the `{msg.content}` render)
- Test: `tests/chat/markdown.test.ts` (create), `tests/chat/chat-messages-markdown.test.tsx` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `parseInline(text: string): MarkdownNode[]` where
  `type MarkdownNode = { type: "text" | "bold" | "italic" | "link" | "break"; value: string; href?: string }`.
  Pure data — no JSX — so it is testable without rendering.

**Supported subset (nothing else):** `**bold**`, `*italic*`, newlines → breaks, bare `http(s)://` URLs → links. Unmatched syntax renders as literal text.

- [ ] **Step 1: Write the failing parser test**

```ts
// tests/chat/markdown.test.ts
import { describe, it, expect } from "vitest";
import { parseInline } from "@/lib/chat/markdown";

describe("parseInline", () => {
  it("returns a single text node for plain text", () => {
    expect(parseInline("hello world")).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("parses **bold**", () => {
    expect(parseInline("are you looking to **move and start a business**?")).toEqual([
      { type: "text", value: "are you looking to " },
      { type: "bold", value: "move and start a business" },
      { type: "text", value: "?" },
    ]);
  });

  it("parses *italic*", () => {
    expect(parseInline("that is *important* here")).toEqual([
      { type: "text", value: "that is " },
      { type: "italic", value: "important" },
      { type: "text", value: " here" },
    ]);
  });

  it("parses multiple bold spans", () => {
    const out = parseInline("**one** and **two**");
    expect(out.filter((n) => n.type === "bold").map((n) => n.value)).toEqual(["one", "two"]);
  });

  it("turns newlines into break nodes", () => {
    expect(parseInline("line one\nline two")).toEqual([
      { type: "text", value: "line one" },
      { type: "break", value: "" },
      { type: "text", value: "line two" },
    ]);
  });

  it("linkifies bare urls", () => {
    expect(parseInline("see https://gatewaytooman.com now")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://gatewaytooman.com", href: "https://gatewaytooman.com" },
      { type: "text", value: " now" },
    ]);
  });

  it("leaves an unclosed ** as literal text", () => {
    expect(parseInline("this **never closes")).toEqual([
      { type: "text", value: "this **never closes" },
    ]);
  });

  it("does not treat a bare asterisk as markup", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", value: "2 * 3 = 6" }]);
  });

  it("never emits an html node type for embedded markup", () => {
    const out = parseInline("<img src=x onerror=alert(1)>");
    expect(out).toEqual([{ type: "text", value: "<img src=x onerror=alert(1)>" }]);
  });

  it("handles empty string", () => {
    expect(parseInline("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chat/markdown.test.ts`
Expected: FAIL — cannot resolve `@/lib/chat/markdown`

- [ ] **Step 3: Write the parser**

```ts
// lib/chat/markdown.ts

/**
 * Minimal inline markdown for Omar's replies.
 *
 * Omar writes **bold**; the chat used to render it raw, so visitors saw the
 * literal asterisks (JA, 2026-07-26). This parses a deliberately tiny subset
 * into plain data that ChatMessages renders as React elements.
 *
 * It returns DATA, never HTML, and there is no dangerouslySetInnerHTML on the
 * render side: model output is untrusted, so anything unrecognised (including
 * embedded HTML) must end up as literal text.
 */

export type MarkdownNode = {
  type: "text" | "bold" | "italic" | "link" | "break";
  value: string;
  href?: string;
};

// Order matters: bold before italic so ** wins over *.
const PATTERN = /(\*\*(?=\S)(.+?)(?<=\S)\*\*)|(\*(?=\S)([^*\n]+?)(?<=\S)\*)|(https?:\/\/[^\s<]+)|(\n)/;

export function parseInline(text: string): MarkdownNode[] {
  if (!text) return [];
  const nodes: MarkdownNode[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = PATTERN.exec(rest);
    if (!match || match.index === undefined) {
      nodes.push({ type: "text", value: rest });
      break;
    }
    if (match.index > 0) {
      nodes.push({ type: "text", value: rest.slice(0, match.index) });
    }
    const [full, , boldInner, , italicInner, url, newline] = match;
    if (boldInner !== undefined) {
      nodes.push({ type: "bold", value: boldInner });
    } else if (italicInner !== undefined) {
      nodes.push({ type: "italic", value: italicInner });
    } else if (url !== undefined) {
      nodes.push({ type: "link", value: url, href: url });
    } else if (newline !== undefined) {
      nodes.push({ type: "break", value: "" });
    }
    rest = rest.slice(match.index + full.length);
  }

  return nodes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chat/markdown.test.ts`
Expected: PASS (10 tests). If a case fails, fix the PARSER, not the test — the assertions encode the spec.

- [ ] **Step 5: Render it in ChatMessages**

Write `tests/chat/chat-messages-markdown.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChatMessages } from "@/components/chat/ChatMessages";

afterEach(cleanup);

describe("ChatMessages markdown", () => {
  it("renders **bold** as a <strong>, not literal asterisks", () => {
    render(
      <ChatMessages
        messages={[{ role: "assistant", content: "are you looking to **move** or not" }]}
        isTyping={false}
      />,
    );
    const strong = screen.getByText("move");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("renders visitor messages as plain text without parsing", () => {
    render(
      <ChatMessages messages={[{ role: "user", content: "2 * 3 = 6" }]} isTyping={false} />,
    );
    expect(screen.getByText("2 * 3 = 6")).toBeTruthy();
  });
});
```

Then in `components/chat/ChatMessages.tsx`, replace the bare `{msg.content}` with a renderer that maps `parseInline(msg.content)` to elements: `bold` → `<strong>`, `italic` → `<em>`, `link` → `<a href={n.href} target="_blank" rel="noopener noreferrer" className="underline">`, `break` → `<br />`, `text` → the string. Give each node a stable key by index. Keep every existing className and the bubble structure untouched.

(Visitor messages may pass through the same renderer — the parser leaves `2 * 3 = 6` as literal text, which the second test pins.)

- [ ] **Step 6: Run both tests**

Run: `npx vitest run tests/chat/`
Expected: all green, including the existing widget tests.

- [ ] **Step 7: Commit**

```bash
git add lib/chat/markdown.ts components/chat/ChatMessages.tsx tests/chat/markdown.test.ts tests/chat/chat-messages-markdown.test.tsx
git commit -m "fix(chat): render Omar's markdown instead of literal asterisks"
```

---

### Task 3: Mobile keyboard viewport

**Files:**
- Create: `lib/chat/use-visual-viewport.ts`
- Modify: `components/chat/ChatWidget.tsx` (the open-panel `motion.div`, ~line 519)
- Test: `tests/chat/use-visual-viewport.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `useVisualViewportHeight(): number | null` — the visible viewport height in px while a keyboard/overlay is shrinking it, else `null` (meaning "use the CSS default").

**Behavior:** on mount, subscribe to `window.visualViewport` `resize` and `scroll`. Report `visualViewport.height` when it is meaningfully smaller than `window.innerHeight` (>120px difference = keyboard up); otherwise `null`. Returns `null` when `visualViewport` is unavailable, so desktop and older browsers keep today's behavior.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chat/use-visual-viewport.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisualViewportHeight } from "@/lib/chat/use-visual-viewport";

type Listener = () => void;

function installViewport(height: number) {
  const listeners: Record<string, Listener[]> = { resize: [], scroll: [] };
  const vv = {
    height,
    addEventListener: (type: string, fn: Listener) => listeners[type]?.push(fn),
    removeEventListener: (type: string, fn: Listener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== fn);
    },
  };
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true, writable: true });
  return {
    vv,
    fire: () => listeners.resize.forEach((l) => l()),
    listenerCount: () => listeners.resize.length,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true, writable: true });
});

afterEach(() => {
  // @ts-expect-error cleaning the stub
  delete window.visualViewport;
});

describe("useVisualViewportHeight", () => {
  it("returns null when the viewport is not shrunk", () => {
    installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    expect(result.current).toBeNull();
  });

  it("returns the shrunk height once a keyboard opens", () => {
    const h = installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    act(() => {
      h.vv.height = 420;
      h.fire();
    });
    expect(result.current).toBe(420);
  });

  it("returns null again when the keyboard closes", () => {
    const h = installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    act(() => {
      h.vv.height = 420;
      h.fire();
    });
    act(() => {
      h.vv.height = 800;
      h.fire();
    });
    expect(result.current).toBeNull();
  });

  it("ignores small changes such as a toolbar hiding", () => {
    const h = installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    act(() => {
      h.vv.height = 740;
      h.fire();
    });
    expect(result.current).toBeNull();
  });

  it("returns null when visualViewport is unavailable", () => {
    // @ts-expect-error simulating an unsupported browser
    delete window.visualViewport;
    const { result } = renderHook(() => useVisualViewportHeight());
    expect(result.current).toBeNull();
  });

  it("removes its listeners on unmount", () => {
    const h = installViewport(800);
    const { unmount } = renderHook(() => useVisualViewportHeight());
    expect(h.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(h.listenerCount()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chat/use-visual-viewport.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Write the hook**

```ts
// lib/chat/use-visual-viewport.ts
"use client";

import { useEffect, useState } from "react";

/** Below this, a height change is a toolbar, not a keyboard. */
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Visible viewport height while something (an on-screen keyboard) is shrinking
 * it, else null.
 *
 * The widget is sized in `dvh`, which does NOT shrink when the iOS keyboard
 * opens, so the input and newest messages were pushed behind the keyboard
 * (JA, 2026-07-26). Returning null on unsupported browsers keeps the existing
 * CSS behaviour everywhere else.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const shrunkBy = window.innerHeight - vv.height;
      setHeight(shrunkBy > KEYBOARD_THRESHOLD_PX ? vv.height : null);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chat/use-visual-viewport.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Apply it to the open panel**

In `ChatWidget.tsx`, call the hook near the other hooks, then on the open-panel `motion.div` add a style that overrides height ONLY when the hook returns a number:

```tsx
  const keyboardHeight = useVisualViewportHeight();
```

and on that `motion.div`:

```tsx
            style={keyboardHeight ? { height: `${keyboardHeight}px`, maxHeight: `${keyboardHeight}px` } : undefined}
```

Keep every existing className including `h-[88dvh]` — the inline style wins only while the keyboard is up, and the classes resume when it returns `null`.

The existing scroll-to-bottom effect already re-runs on message changes; add `keyboardHeight` to that effect's dependency array so the latest message is re-pinned when the viewport resizes.

- [ ] **Step 6: Verify nothing regressed**

Run: `npx vitest run tests/chat/`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add lib/chat/use-visual-viewport.ts components/chat/ChatWidget.tsx tests/chat/use-visual-viewport.test.ts
git commit -m "fix(chat): resize widget to the visible viewport when the keyboard opens"
```

---

### Task 4: Header menu (connect / close session)

**Files:**
- Create: `components/chat/ChatHeaderMenu.tsx`
- Modify: `components/chat/ChatWidget.tsx` (conversation header, and wiring)
- Test: `tests/chat/chat-header-menu.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ChatHeaderMenu({ onConnect, onCloseSession }: { onConnect: () => void; onCloseSession: () => void })` — a button that toggles a two-item menu.

**Behavior:** the header's left avatar becomes this menu button. Items: "Connect with a representative", and "Close session" in red. Menu closes on selection, outside click, and Escape.

**Wiring in ChatWidget:**
- `onConnect` → set the capture-form flag so `LeadCaptureForm` appears immediately (reuse the existing `setShowCaptureForm(true)` path; also clear `showCapturePrompt` so both never show at once), and set a new `connectRequested` state used by Task 5.
- `onCloseSession` → clear the conversation: `setMessages([])`, `setConversationId(null)`, reset the capture/post-capture/hot-lead flags, `setIsOpen(false)`. Next open shows the idle panel. (Read the actual state names in the file; this list is the intent, not a literal snippet.)

- [ ] **Step 1: Write the failing test**

```tsx
// tests/chat/chat-header-menu.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChatHeaderMenu } from "@/components/chat/ChatHeaderMenu";

afterEach(cleanup);

describe("ChatHeaderMenu", () => {
  it("is closed until the trigger is clicked", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("shows both options", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    expect(screen.getByRole("menuitem", { name: /connect with a representative/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /close session/i })).toBeTruthy();
  });

  it("calls onConnect and closes", () => {
    const onConnect = vi.fn();
    render(<ChatHeaderMenu onConnect={onConnect} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /connect with a representative/i }));
    expect(onConnect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("calls onCloseSession and closes", () => {
    const onCloseSession = vi.fn();
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={onCloseSession} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /close session/i }));
    expect(onCloseSession).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders close session as the destructive option", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    expect(
      screen.getByRole("menuitem", { name: /close session/i }).className,
    ).toMatch(/text-red-/);
  });

  it("closes on Escape", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chat/chat-header-menu.test.tsx`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Write the component**

Build `ChatHeaderMenu.tsx` as a `"use client"` component satisfying the tests: a trigger button labelled "Chat options" (use the `Menu` icon from `lucide-react`, styled to sit where the avatar was — round, `bg-white/15`, white icon, same 36px footprint), and an absolutely-positioned `role="menu"` panel below it with two `role="menuitem"` buttons. "Close session" carries a `text-red-600` class. Close on selection, on Escape (window keydown listener, cleaned up), and on outside click (listener on document, cleaned up; ignore clicks inside the menu).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chat/chat-header-menu.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire it into ChatWidget**

Replace the avatar `<div>` in the conversation header with `<ChatHeaderMenu onConnect={…} onCloseSession={…} />`, keeping the "Ask Omar" title block and the minimize button exactly as they are. Implement the two handlers per the Interfaces section above. Add `const [connectRequested, setConnectRequested] = useState(false);` — set true in `onConnect`, reset in `onCloseSession` and after a successful capture.

- [ ] **Step 6: Verify**

Run: `npx vitest run tests/chat/`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add components/chat/ChatHeaderMenu.tsx components/chat/ChatWidget.tsx tests/chat/chat-header-menu.test.tsx
git commit -m "feat(chat): header menu with connect and close-session"
```

---

### Task 5: `connect` qualification tier

**Files:**
- Modify: `lib/db/schema.sql` (seed the option row)
- Modify: `components/chat/LeadCaptureForm.tsx` (pass the flag through)
- Modify: `components/chat/ChatWidget.tsx` (pass `connectRequested` into the form)
- Modify: `app/api/leads/route.ts` (honour the flag, skip scoring)
- Test: `tests/api/leads-connect-tier.test.ts` (create)

**Interfaces:**
- Consumes: `connectRequested` (Task 4).
- Produces: `/api/leads` POST accepts an optional `qualification?: "connect"` in the body. When present, the lead is inserted with that qualification AND `scoreLeadFromConversation` is skipped so nothing relabels it.

**No migration.** `lead_options` already replaced the CHECK constraints on `leads.qualification`, and `scripts/migrate-lead-options.ts` already stripped them in production (HANDOVER: "already applied to prod"). Adding the seed row to `schema.sql` covers fresh DBs; production picks it up through the existing idempotent `npm run migrate` path, since the seeds use `INSERT OR IGNORE`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/leads-connect-tier.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({ getDb: () => db }));
vi.mock("@/lib/push/notify", () => ({ sendPushNotification: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/lead-summary", () => ({ summariseLead: vi.fn(async () => "summary") }));

const scoreLeadMock = vi.fn(async () => undefined);
vi.mock("@/lib/ai/scoring", () => ({
  scoreLead: (...args: unknown[]) => scoreLeadMock(...args),
}));

import { POST } from "@/app/api/leads/route";

function makeRequest(body: Record<string, unknown>, ip = "203.0.113.77"): NextRequest {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  await db.execute("DELETE FROM leads");
  scoreLeadMock.mockClear();
});

describe("connect qualification tier", () => {
  it("seeds 'connect' as a selectable qualification option", async () => {
    const rows = await db.execute(
      "SELECT label FROM lead_options WHERE kind = 'qualification' AND slug = 'connect'",
    );
    expect(rows.rows.length).toBe(1);
  });

  it("stores qualification 'connect' when the flag is sent", async () => {
    const res = await POST(
      makeRequest({ name: "Connect Person", email: "c@example.com", qualification: "connect" }),
    );
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT qualification FROM leads WHERE email = 'c@example.com'");
    expect(String(rows.rows[0].qualification)).toBe("connect");
  });

  it("does not run AI scoring for a connect lead", async () => {
    await POST(
      makeRequest({
        name: "Connect Person",
        email: "c2@example.com",
        qualification: "connect",
        conversationId: null,
      }),
    );
    expect(scoreLeadMock).not.toHaveBeenCalled();
  });

  it("ignores an unrecognised qualification value from the client", async () => {
    const res = await POST(
      makeRequest({ name: "Sneaky", email: "s@example.com", qualification: "platinum" }),
    );
    expect(res.status).toBe(201);
    const rows = await db.execute("SELECT qualification FROM leads WHERE email = 's@example.com'");
    expect(String(rows.rows[0].qualification)).not.toBe("platinum");
  });

  it("leaves normal leads on the default qualification", async () => {
    await POST(makeRequest({ name: "Normal", email: "n@example.com" }));
    const rows = await db.execute("SELECT qualification FROM leads WHERE email = 'n@example.com'");
    expect(String(rows.rows[0].qualification)).toBe("warm");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/leads-connect-tier.test.ts`
Expected: FAIL — no seed row; `qualification` is ignored by the route.

- [ ] **Step 3: Seed the option**

In `lib/db/schema.sql`, beside the existing qualification seeds (~line 483):

```sql
-- 'connect' (2026-07-26): the visitor asked to be put in touch before Omar had
-- gathered enough to grade them. Deliberately NOT hot/warm/cold — the label
-- records how the lead arrived, and AI scoring is skipped for these.
INSERT OR IGNORE INTO lead_options (kind, slug, label, color, sort_order) VALUES ('qualification', 'connect', 'Connect', 'violet', 5);
```

- [ ] **Step 4: Accept the flag in the route**

In `app/api/leads/route.ts` POST: read `qualification` from the body and allowlist it to exactly `"connect"` (anything else is ignored — never trust the client with an arbitrary value):

```ts
    const isConnectRequest = body.qualification === "connect";
```

(Adapt to how the handler currently destructures the body.) Then:
- Include `qualification` in the INSERT column list when `isConnectRequest`, with value `'connect'`.
- Skip the `scoreLeadFromConversation(...)` call when `isConnectRequest`, with a comment saying why.

Leave everything else — dedupe, rate limits, admin bypass, summary, push — untouched.

- [ ] **Step 5: Pass the flag from the UI**

`LeadCaptureForm.tsx`: accept an optional `qualification?: "connect"` prop and include it in the POST body when set. `ChatWidget.tsx`: pass `qualification={connectRequested ? "connect" : undefined}` to the form.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/api/leads-connect-tier.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add lib/db/schema.sql app/api/leads/route.ts components/chat/LeadCaptureForm.tsx components/chat/ChatWidget.tsx tests/api/leads-connect-tier.test.ts
git commit -m "feat(leads): connect qualification tier that bypasses AI scoring"
```

---

### Task 6: Mobile fixes — settings overflow + admin zoom

**Files:**
- Modify: `components/admin/LeadOptionsSection.tsx` (~line 226, the option `<li>`)
- Modify: `app/admin/layout.tsx` (login inputs, ~lines 140-161)
- Test: none (pure CSS; verified on device)

**Interfaces:** none.

- [ ] **Step 1: Let the option rows wrap**

In `components/admin/LeadOptionsSection.tsx`, the option row is `flex items-center gap-2 …` with no wrapping, so on a narrow viewport the active checkbox and Add button clip off-screen (JA screenshot 2026-07-25). Add `flex-wrap` to that row, and make the controls inside not force overflow (`min-w-0` on the growing element; let the colour/order controls sit on a second line below `sm`). Apply the same treatment to the "add new" row beneath it if it has the same shape.

Do not change any behaviour, handler, or field.

- [ ] **Step 2: Stop iOS auto-zoom on the admin login**

iOS Safari zooms in when a focused input's font-size is below 16px and never zooms back out — the admin login fields are `text-sm` (14px), which is why `/admin` opens zoomed (JA, 2026-07-26).

In `app/admin/layout.tsx`, the email and password inputs: change `text-sm` to `text-base sm:text-sm` so mobile renders at 16px and desktop keeps today's size. Sweep the rest of that file for other focusable inputs and give them the same treatment.

**Do NOT** add `maximum-scale=1` or `user-scalable=no` — that fixes it by disabling pinch-zoom.

- [ ] **Step 3: Verify nothing broke**

Run: `npx vitest run`
Expected: all green (this task is CSS-only; no test should change).
Run: `npm run build`
Expected: clean, 85 routes.

- [ ] **Step 4: Commit**

```bash
git add components/admin/LeadOptionsSection.tsx app/admin/layout.tsx
git commit -m "fix(admin): wrap lead-option rows on mobile, stop iOS login zoom"
```

---

### Task 7: Full verification + preview deploy

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: **~320 passing** (282 baseline + 38 new: 11 + 12 + 6 + 6 + 5). Report the real number.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exactly the 3 pre-existing test-file errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean, 85 routes.

- [ ] **Step 4: Dash sweep**

Run: `grep -c '—\|–' lib/ai/prompts.ts`
Expected: `0`.

- [ ] **Step 5: Preview deploy**

Run: `vercel deploy --yes`
Report the URL. **Do NOT deploy to production** — JA click-tests first.

- [ ] **Step 6: Hand JA the device checklist**

- Omar's replies contain no em dashes and no literal `**`
- Typing on mobile: input and newest message stay visible above the keyboard
- Header menu: both options; Close session ends the session (idle panel on reopen); Connect opens the lead form
- A lead captured via Connect shows as "Connect" in `/admin/leads`, not hot/warm/cold
- `/admin/settings`: Status/Qualification/Segment rows fully visible on mobile
- `/admin` login no longer opens zoomed in

---

## Self-review notes (done at write time)

- Spec coverage: §2 ✓ (T1), §3 ✓ (T2), §4 ✓ (T3), §5 ✓ (T4), §6 ✓ (T5), §7 ✓ (T6 step 1), §8 ✓ (T6 step 2). §1 intentionally absent per JA.
- Security: markdown parses to data with no `dangerouslySetInnerHTML` (T2 pins an HTML-injection case); the `connect` flag is allowlisted server-side so a client cannot set arbitrary qualifications (T5 pins it).
- Type consistency: `MarkdownNode`, `parseInline`, `useVisualViewportHeight`, `ChatHeaderMenu` props, and the `qualification?: "connect"` prop are named identically in their defining task, their tests, and their consumers.
- Test counts sum to Task 7's expectation. T6 adds none by design and says so.
- Device-only items (T3, T6 step 2) are called out as unverifiable in jsdom, with the checklist in T7 step 6.
