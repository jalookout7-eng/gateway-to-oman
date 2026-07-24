# Analytics Consent Banner (Consent Mode v2, opt-out model) — Design

**Date:** 2026-07-25 · **Approved by:** JA (closes HANDOVER item M)
**Decision:** JA chose the **opt-out model**: analytics runs by default; an
explicit Decline stops it. Undecided visitors ARE tracked. This is strictly
better than the status quo (no banner, unconditional tracking) but is weaker
than strict-GDPR opt-in for EU visitors. The default is deliberately built as
a one-line flip (`CONSENT_DEFAULT`) so the lawyer review (item I) can change
the posture without a rebuild.

## Behavior

| Visitor state | GA loads? | Banner shows? |
|---|---|---|
| No stored choice | Yes (analytics_storage granted) | Yes — persists across pages until a choice is made |
| Accepted | Yes | No |
| Declined | **No — gtag.js never loads** (same mechanism as the /admin exclusion) | No |

- Choice stored in `localStorage` key `gto_analytics_consent`:
  `{ value: "granted" | "denied", at: ISO timestamp }`. Re-ask after 12 months.
- **Decline takes effect immediately**: fire
  `gtag('consent','update',{analytics_storage:'denied'})` in the click handler,
  then on every subsequent load the GoogleAnalytics component returns null.
- Consent Mode v2 defaults set BEFORE `gtag('config')`: `analytics_storage`
  from `CONSENT_DEFAULT` ('granted' today); `ad_storage`, `ad_user_data`,
  `ad_personalization` always `'denied'` (no ads product in use).
- `trackEvent()` needs no changes — it already no-ops when gtag is absent.

## UI

- Slim fixed bottom bar, full width: navy background, one sentence of copy
  ("We use analytics to improve this site."), link to `/privacy`, two equal
  buttons — **Accept** (gold gradient) and **Decline** (ghost/outline). Decline
  must be visually equal effort — no dark patterns.
- Never renders on `/admin/*` (reuse the `EXCLUDED_PATHS` route check — GA does
  not load there anyway).
- While the banner is visible, the floating WhatsApp + Omar chat buttons shift
  up by the banner height (body class toggle + CSS) so nothing is covered on
  mobile. They drop back down once a choice is made.
- New component `components/analytics/ConsentBanner.tsx`, mounted in root
  layout next to `<GoogleAnalytics />`.

## Testing

- Vitest: no stored choice → banner rendered + GA active; Accept → stored,
  banner gone, GA active; Decline → stored, banner gone, consent-update fired,
  GA component returns null on next mount; expired (>12mo) choice → banner
  returns; `/admin` path → no banner.
- Manual: verify in GA4 Realtime that a Declined browser stops appearing.

## Out of scope

- Preference center / per-category toggles (only GA4 exists today).
- Cookie audit of Omar chat session storage (functional, not analytics —
  exempt from consent gating).
