# Mobile Admin Nav Bottom Sheet + PWA Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile bottom nav's Calendar slot with a Menu tab that opens a bottom sheet holding the 6 unreachable admin destinations, and replace the white PWA cold-open gap with a pulsing GTO logo.

**Architecture:** Pure nav logic goes in `lib/admin/mobile-nav.ts` (testable without DOM). The sheet is a new thin client component `components/admin/MobileMenuSheet.tsx` receiving `items/open/onClose/pathname` as props (no hooks inside → trivially testable). `app/admin/layout.tsx` keeps owning state and wires both, plus the loading-state swap.

**Tech Stack:** Next.js 14 App Router, Tailwind, vitest + jsdom + @testing-library/react (first component-test usage in this repo — installed, unused until now).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-mobile-admin-nav-and-pwa-loading-design.md`
- Brand tokens already in Tailwind config: `bg-navy` (#1A1A2E), `text-gold` / `bg-gold` (#C99B3C). Use them, never raw hex in classNames.
- `/admin/intelligence` must NOT appear in any nav (owner-only via direct URL — existing rule, do not "fix").
- Sign-out + NotificationOptIn stay in the mobile top bar. Sheet is navigation only.
- Desktop sidebar untouched.
- `setupFiles` in vitest.config.ts is empty → do NOT use jest-dom matchers (`toBeInTheDocument` etc.); use plain queries + standard expect.
- Baseline: 190/190 tests, build clean, `npx tsc --noEmit` has exactly 2 pre-existing errors in test files (undici Request/Response vs Next wrappers) — do not add new ones.
- `public/manifest.json` already has `"background_color": "#1A1A2E"` — verified 2026-07-25. No manifest edit needed; `theme_color` stays gold (deliberate brand accent). The PWA fix is the loading-state swap only.
- This batch has a visual surface → preview deploy + JA click-test BEFORE prod.

---

### Task 1: Nav split + active-route logic (`lib/admin/mobile-nav.ts`)

**Files:**
- Create: `lib/admin/mobile-nav.ts`
- Test: `tests/admin/mobile-nav.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces:
  - `type NavItem = { href: string; label: string; icon: string }`
  - `const MOBILE_BAR_HREFS: string[]` — `["/admin", "/admin/leads", "/admin/listings", "/admin/inquiries"]`
  - `sheetItems(all: NavItem[]): NavItem[]` — the 6 sheet entries in spec order (Calendar first)
  - `isSheetRoute(pathname: string | null): boolean` — true when the current route lives in the sheet (drives the Menu tab's gold state)

- [ ] **Step 1: Write the failing test**

```ts
// tests/admin/mobile-nav.test.ts
import { describe, it, expect } from "vitest";
import {
  MOBILE_BAR_HREFS,
  sheetItems,
  isSheetRoute,
  type NavItem,
} from "@/lib/admin/mobile-nav";

const FIXTURE: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "d" },
  { href: "/admin/leads", label: "Leads", icon: "l" },
  { href: "/admin/listings", label: "Listings", icon: "li" },
  { href: "/admin/sellers", label: "Sellers", icon: "s" },
  { href: "/admin/users", label: "Users", icon: "u" },
  { href: "/admin/inquiries", label: "Inquiries", icon: "i" },
  { href: "/admin/calendar", label: "Calendar", icon: "c" },
  { href: "/admin/conversations", label: "Conversations", icon: "co" },
  { href: "/admin/activity", label: "Activity", icon: "a" },
  { href: "/admin/settings", label: "Settings", icon: "se" },
];

describe("MOBILE_BAR_HREFS", () => {
  it("keeps exactly Dashboard, Leads, Listings, Inquiries (Calendar demoted)", () => {
    expect(MOBILE_BAR_HREFS).toEqual([
      "/admin",
      "/admin/leads",
      "/admin/listings",
      "/admin/inquiries",
    ]);
  });
});

describe("sheetItems", () => {
  it("returns the 6 sheet entries in spec order, Calendar first", () => {
    expect(sheetItems(FIXTURE).map((i) => i.label)).toEqual([
      "Calendar",
      "Sellers",
      "Users",
      "Conversations",
      "Activity",
      "Settings",
    ]);
  });
  it("never includes Intelligence even if passed in", () => {
    const withIntel = [
      ...FIXTURE,
      { href: "/admin/intelligence", label: "Intelligence", icon: "x" },
    ];
    expect(sheetItems(withIntel).some((i) => i.href === "/admin/intelligence")).toBe(false);
  });
  it("skips entries missing from the input instead of crashing", () => {
    const noCalendar = FIXTURE.filter((i) => i.href !== "/admin/calendar");
    expect(sheetItems(noCalendar).map((i) => i.label)).toEqual([
      "Sellers",
      "Users",
      "Conversations",
      "Activity",
      "Settings",
    ]);
  });
});

describe("isSheetRoute", () => {
  it("true for exact sheet routes", () => {
    expect(isSheetRoute("/admin/settings")).toBe(true);
    expect(isSheetRoute("/admin/calendar")).toBe(true);
  });
  it("true for nested paths under a sheet route", () => {
    expect(isSheetRoute("/admin/settings/anything")).toBe(true);
  });
  it("false for bar routes, unknown routes, and null", () => {
    expect(isSheetRoute("/admin")).toBe(false);
    expect(isSheetRoute("/admin/leads")).toBe(false);
    expect(isSheetRoute("/admin/intelligence")).toBe(false);
    expect(isSheetRoute(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/admin/mobile-nav.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin/mobile-nav`

- [ ] **Step 3: Write the implementation**

```ts
// lib/admin/mobile-nav.ts
export type NavItem = { href: string; label: string; icon: string };

// The 4 bar slots that keep direct tabs; the 5th slot is the Menu button.
export const MOBILE_BAR_HREFS = [
  "/admin",
  "/admin/leads",
  "/admin/listings",
  "/admin/inquiries",
];

// Sheet order per spec — Calendar first (it lost its bar slot).
const SHEET_HREF_ORDER = [
  "/admin/calendar",
  "/admin/sellers",
  "/admin/users",
  "/admin/conversations",
  "/admin/activity",
  "/admin/settings",
];

export function sheetItems(all: NavItem[]): NavItem[] {
  return SHEET_HREF_ORDER.map((href) => all.find((i) => i.href === href)).filter(
    (i): i is NavItem => Boolean(i)
  );
}

export function isSheetRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return SHEET_HREF_ORDER.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/admin/mobile-nav.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/admin/mobile-nav.ts tests/admin/mobile-nav.test.ts
git commit -m "feat(admin): mobile nav split + sheet-route logic"
```

---

### Task 2: MobileMenuSheet component

**Files:**
- Create: `components/admin/MobileMenuSheet.tsx`
- Modify: `app/globals.css` (append keyframe at end of file)
- Test: `tests/admin/mobile-menu-sheet.test.tsx`

**Interfaces:**
- Consumes: `NavItem` from `@/lib/admin/mobile-nav` (Task 1).
- Produces: `MobileMenuSheet({ items, open, onClose, pathname }: { items: NavItem[]; open: boolean; onClose: () => void; pathname: string | null })` — renders `null` when closed; active row carries `aria-current="page"`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/admin/mobile-menu-sheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { MobileMenuSheet } from "@/components/admin/MobileMenuSheet";
import type { NavItem } from "@/lib/admin/mobile-nav";

afterEach(cleanup);

const ITEMS: NavItem[] = [
  { href: "/admin/calendar", label: "Calendar", icon: "M8 7V3m8 4V3" },
  { href: "/admin/settings", label: "Settings", icon: "M10.3 4.3a1 1 0 011 1" },
];

describe("MobileMenuSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <MobileMenuSheet items={ITEMS} open={false} onClose={() => {}} pathname="/admin" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders a dialog with one link per item when open", () => {
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={() => {}} pathname="/admin" />
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/admin/calendar",
      "/admin/settings",
    ]);
  });

  it("marks the current route's row with aria-current=page", () => {
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={() => {}} pathname="/admin/settings" />
    );
    const active = screen.getByRole("link", { name: /settings/i });
    expect(active.getAttribute("aria-current")).toBe("page");
    const inactive = screen.getByRole("link", { name: /calendar/i });
    expect(inactive.getAttribute("aria-current")).toBe(null);
  });

  it("calls onClose when the backdrop is tapped", () => {
    const onClose = vi.fn();
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={onClose} pathname="/admin" />
    );
    fireEvent.click(screen.getByLabelText("Close menu"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/admin/mobile-menu-sheet.test.tsx`
Expected: FAIL — cannot resolve `@/components/admin/MobileMenuSheet`

- [ ] **Step 3: Write the component**

```tsx
// components/admin/MobileMenuSheet.tsx
"use client";

import Link from "next/link";
import type { NavItem } from "@/lib/admin/mobile-nav";

/**
 * Bottom sheet for the mobile admin nav (spec 2026-07-25). Pure presentational:
 * open state + pathname come from the layout so this stays hook-free and
 * directly testable. Sits above the bottom nav (z-50 vs nav z-40); the nav
 * stays visible beneath the sheet.
 */
export function MobileMenuSheet({
  items,
  open,
  onClose,
  pathname,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  pathname: string | null;
}) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="More menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="absolute bottom-[68px] left-0 right-0 bg-navy border-t border-white/10 rounded-t-2xl py-2 animate-sheet-up">
        {items.map((item) => {
          const active =
            pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                active ? "text-gold bg-gold/10" : "text-white/80 hover:bg-white/5"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

Append to the END of `app/globals.css`:

```css
/* Mobile admin menu sheet (spec 2026-07-25) */
@keyframes sheet-up {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-sheet-up {
  animation: sheet-up 0.2s ease-out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/admin/mobile-menu-sheet.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/admin/MobileMenuSheet.tsx tests/admin/mobile-menu-sheet.test.tsx app/globals.css
git commit -m "feat(admin): MobileMenuSheet bottom-sheet component"
```

---

### Task 3: Layout integration + PWA loading swap

**Files:**
- Modify: `app/admin/layout.tsx` (imports ~line 8, `MOBILE_NAV_HREFS` ~line 26, component state ~line 44, `checking` branch ~line 112, bottom nav ~line 296)

**Interfaces:**
- Consumes: `MOBILE_BAR_HREFS`, `sheetItems`, `isSheetRoute` (Task 1); `MobileMenuSheet` (Task 2).
- Produces: nothing downstream — this is the leaf integration.

- [ ] **Step 1: Update imports and remove the old constant**

In `app/admin/layout.tsx`, add after the existing imports:

```tsx
import { MobileMenuSheet } from "@/components/admin/MobileMenuSheet";
import { MOBILE_BAR_HREFS, sheetItems, isSheetRoute } from "@/lib/admin/mobile-nav";
```

Delete the old line:

```tsx
const MOBILE_NAV_HREFS = new Set(["/admin", "/admin/leads", "/admin/listings", "/admin/inquiries", "/admin/calendar"]);
```

(and its comment line above it).

- [ ] **Step 2: Add menu state + auto-close on navigation**

Inside `AdminLayout`, next to the existing `useState` hooks:

```tsx
const [menuOpen, setMenuOpen] = useState(false);
```

Next to the existing `useEffect` hooks:

```tsx
// Close the mobile menu sheet whenever navigation happens.
useEffect(() => {
  setMenuOpen(false);
}, [pathname]);
```

- [ ] **Step 3: Swap the `checking` branch for the pulsing logo**

Replace:

```tsx
if (checking) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  );
}
```

with:

```tsx
if (checking) {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <Image
        src="/gto-logo.png"
        alt="Gateway to Oman"
        width={200}
        height={64}
        priority
        className="h-12 w-auto animate-pulse"
      />
    </div>
  );
}
```

(`Image` is already imported in this file.)

- [ ] **Step 4: Rebuild the mobile bottom nav with the Menu tab + sheet**

Replace the entire existing mobile bottom nav block (the `<nav className="fixed bottom-0 ...">` at the end of the JSX) with:

```tsx
{/* Mobile bottom nav — 4 direct tabs + Menu (spec 2026-07-25) */}
<nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-white/10 flex md:hidden z-40">
  {NAV_ITEMS.filter((item) => MOBILE_BAR_HREFS.includes(item.href)).map((item) => {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
          active ? "text-gold" : "text-white/60"
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
        </svg>
        <span>{item.label}</span>
      </Link>
    );
  })}
  <button
    type="button"
    onClick={() => setMenuOpen((v) => !v)}
    aria-expanded={menuOpen}
    className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
      menuOpen || isSheetRoute(pathname) ? "text-gold" : "text-white/60"
    }`}
  >
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <span>Menu</span>
  </button>
</nav>
<MobileMenuSheet
  items={sheetItems(NAV_ITEMS)}
  open={menuOpen}
  onClose={() => setMenuOpen(false)}
  pathname={pathname}
/>
```

- [ ] **Step 5: Full verification**

Run: `npx vitest run` → Expected: 201 passing (190 baseline + 11 new)
Run: `npx tsc --noEmit` → Expected: only the 2 pre-existing test-file errors
Run: `npm run build` → Expected: clean, 67 routes

- [ ] **Step 6: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): Menu tab + bottom sheet in mobile nav, pulsing-logo loading state"
```

---

### Task 4: Preview deploy + JA click-test (gate before prod)

**Files:** none (deploy step)

- [ ] **Step 1: Preview deploy**

Run: `vercel deploy --yes`
Expected: preview URL, build clean.

- [ ] **Step 2: JA click-test on a real phone (iOS PWA)**

Checklist for JA:
- Bottom nav shows Dashboard / Leads / Listings / Inquiries / Menu
- Menu opens the sheet with Calendar, Sellers, Users, Conversations, Activity, Settings
- Backdrop tap and Menu re-tap both close it; navigating closes it
- On `/admin/settings` the Menu tab is gold
- Cold-open from home screen shows navy + pulsing logo instead of white/gray
- Desktop sidebar unchanged

- [ ] **Step 3: Production deploy (only after JA approves)**

Run: `vercel deploy --prod --yes`
Then verify live on `gatewaytooman.com/admin`.
```

---

## Self-review notes (done at write time)

- Spec coverage: bar swap ✓ (T3), sheet ✓ (T2), active states ✓ (T1+T3), auto-close ✓ (T3 step 2), manifest — verified already-compliant, documented in Global Constraints ✓, pulsing logo ✓ (T3 step 3), tests ✓ (T1, T2), preview gate ✓ (T4).
- Deviation from spec, documented: manifest needs no edit (colors already set); `theme_color` stays gold.
- Type consistency: `NavItem` defined once in Task 1, consumed by Tasks 2–3.
- The `bottom-[68px]` sheet offset approximates the bottom-nav height; JA's click-test (T4) is the check for fit — adjust there if it overlaps.
