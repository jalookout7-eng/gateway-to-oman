# Mobile Admin Nav Bottom Sheet + PWA Loading Polish — Design

**Date:** 2026-07-25 · **Approved by:** JA (brainstorm session)
**Scope:** admin mobile UX only. No backend, no schema, no public-site changes.

## Problem

1. The mobile bottom nav hardcodes 5 items (Dashboard, Leads, Listings, Inquiries,
   Calendar). The other 5 nav destinations (Sellers, Users, Conversations, Activity,
   Settings) are unreachable on mobile except by typing URLs.
2. Opening the admin PWA from the phone home screen shows a white page for several
   seconds (framework load + `/api/auth/me` check) before anything renders.

## Design

### 1. Bottom sheet menu

- In `app/admin/layout.tsx`, the 5th mobile slot changes from Calendar to **Menu**
  (hamburger icon, same tab styling). `MOBILE_NAV_HREFS` keeps Dashboard, Leads,
  Listings, Inquiries.
- Tapping Menu opens a **bottom sheet**: a panel that slides up (~200ms) above the
  bottom nav, over a dimmed backdrop. It lists the 6 items not in the bar —
  Calendar, Sellers, Users, Conversations, Activity, Settings — same icons/labels
  as the desktop sidebar, ≥48px touch rows, navy background, gold active state.
- Dismissal: tap backdrop, tap Menu again, or navigate (auto-close on pathname
  change via effect). Sheet z-index sits above the bottom nav (nav is z-40 → sheet
  and backdrop z-50).
- **Active states:** when the current route is one of the 6 sheet items, the Menu
  tab itself renders gold; the matching row inside the sheet highlights when open.
- Intelligence remains out of ALL navs (owner-only via direct URL — existing rule).
- Sign-out and NotificationOptIn stay in the mobile top bar. The sheet is
  navigation only.
- New component: `components/admin/MobileMenuSheet.tsx` (keeps layout.tsx from
  growing further; layout passes items + open state).

### 2. PWA loading polish

- `public/manifest.json`: set `background_color` and `theme_color` to navy
  `#1A1A2E` so Android renders a branded splash instead of white on cold open.
- Replace the admin layout's `checking` state (gray "Loading..." text) with the
  GTO logo pulsing (Tailwind `animate-pulse`) centered on a navy background.
  This covers iOS, where manifest splash support is unreliable, and covers the
  auth-check gap on all platforms.

## Testing

- Component tests (vitest + jsdom, existing conventions): sheet opens on Menu tap,
  closes on backdrop tap, auto-closes on route change; Menu tab active-state logic
  for sheet-item routes.
- Manual click-test on a real phone (iOS PWA) before prod — this has a visual
  surface, so preview deploy → click-test → prod.

## Out of scope

- Any reordering of which 4 items hold bar slots (revisit only if usage says so).
- Desktop sidebar changes.
