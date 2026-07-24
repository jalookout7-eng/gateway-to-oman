# Batch 16 — Security Hardening (2 HIGH + 4 MED) — Design

**Date:** 2026-07-25 · **Approved by:** JA (full batch confirmed)
**Source:** 2026-05-30 security audit (HANDOVER §Security state). All items
server-side with no UX surface → ships direct to prod per the existing plan.

## Items

| # | Sev | Location | Fix |
|---|-----|----------|-----|
| A04-1 | HIGH | `app/api/leads/route.ts` POST | `rateLimit("lead_capture", ip, 5, 600)` + 24-hour email+IP dedupe (mirror the existing access-request dedupe pattern). Public lead capture currently has NO limit and each POST triggers Anthropic calls + push notifications. |
| A04-2 | HIGH | `app/api/businesses/verify-otp/route.ts` | `rateLimit("verify_otp", ip, 20, 600)` — closes the per-OTP-cap reset loophole via re-issuance. |
| A07-1 | MED | `app/api/businesses/sign-up/route.ts` | Always return generic 200 (no more 409 "account exists" → email enumeration). Trade-off pre-accepted by JA (HANDOVER item N). |
| A01-1 | MED | `app/api/admin/admin-users/route.ts` + `[id]/route.ts` | Replace `requireAuth()` + inline owner check with `requireOwner()`. |
| A01-2 | MED | `app/api/admin/reviewer-link/route.ts` | `requireOwner()` — currently any admin role can rotate the reviewer link. |
| A08-1 | MED | `lib/auth/google.ts` `decodeIdToken()` | Add `jose`; verify Google `id_token` signature + `iss`/`aud`/`exp` against Google JWKS in the OAuth callback. Currently decoded without verification. |

## Implementation notes

- Reuse `lib/rate-limit.ts` (Turso-backed fixed window) — infrastructure exists;
  these are coverage gaps, not new infra.
- Rate-limited responses: 429 with a generic message; never leak limiter internals.
- A04-1 dedupe: same email OR same IP submitting within 24h gets a success-shaped
  response without re-triggering AI/push (silent dedupe — don't tell spammers).
- `jose` is a new production dependency (zero-dep, standard for JWKS). Pin it.
- Only new dependency in the batch; everything else touches existing files.

## Testing

- Vitest per existing conventions: limiter triggers at threshold (6th lead POST in
  window → 429; 21st OTP attempt → 429), dedupe returns success-shape without side
  effects, sign-up always 200, `requireOwner` rejects non-owner admin sessions,
  id_token with bad signature/iss/aud/exp rejected (mock JWKS).
- Full suite + typecheck green before deploy (190 baseline).

## Deploy

Direct to prod (`vercel deploy --prod --yes`) after tests pass — no visual
surface. Batch 17 (CSP etc.) stays separate and still requires preview-first.
