# Handover — Gateway to Oman

**Project:** Lead-qualification platform + businesses-for-sale marketplace
**Client:** Ahmed Al Azizi — Alazizi Global Projects (AGP)
**Developer:** JA (JALAI)
**Stage:** 04-build — active
**Started:** April 2026 · **This handover written:** May 29, 2026 · **Last updated:** July 25, 2026 (mobile nav bottom sheet on preview; line endings normalized)

> **Predecessor:** the full batch-by-batch history (v7.0 → v7.22) is preserved at
> `docs/superpowers/archive/HANDOVER-v7.22-2026-05-29.md`. Consult it for code
> archaeology — schema decisions, batch chronology, scrapped approaches.
> This document is forward-looking only.

---

## Status — June 27, 2026

| | |
|---|---|
| **Live URLs** | <https://gatewaytooman.com> · <https://www.gatewaytooman.com> |
| **Latest production deploy** | `dpl_AYwncWcPRSz78mgaBLQzG1Ex8dbH` (GA4 `/admin` exclusion, 2026-07-21) |
| **On preview, awaiting JA click-test → prod** | Mobile nav bottom sheet + PWA pulsing-logo loading (commits `12c12fb`..`3142737`, deployed 2026-07-25). Prod push = `vercel deploy --prod --yes` after approval. |
| **Latest commit on `section-b-marketplace`** | `3142737` (LOCAL ONLY — origin is at `f2c2786`; 9 commits unpushed, git credential needs fixing, see item Q) |
| **Repo** | <https://github.com/jalookout7-eng/gateway-to-oman> (private) |
| **Active branch** | `section-b-marketplace` (production deploys from here; `master` ~140 commits behind — consider making this the GitHub default branch) |
| **Tests** | 202/202 passing across 33 files (component tests now supported via @vitejs/plugin-react) |
| **Build** | clean, 85 routes · `tsc --noEmit` has 3 pre-existing test-file errors (not 2 as previously noted) |

What's running: Next.js 14.2 App Router on Vercel Pro, Anthropic Haiku 4.5 (Groq Llama 3.3 70B failover), Turso libSQL in Tokyo region, Resend transactional email (gatewaytooman.com domain verified), Cloudflare R2 for listing media (presigned direct-to-R2 uploads — browser uploads straight to R2, bypassing Vercel), Web Push notifications (VAPID), Google OAuth for marketplace sign-in, GA4 live in production since 2026-07-04 (measurement ID set in Vercel); `/admin/*` excluded from tracking as of 2026-07-21.

---

## 🛠 Dev / Deploy workflow (the new process)

**Auto-deploys are OFF.** Every deploy is a manual CLI command. There are three tiers — use them in order for anything beyond trivial copy edits.

### Tier 1 — Local development

```powershell
cd "C:\Users\ADMIN\Documents\JA\JALAI-Workspaces\delivery\clients\gateway-to-oman\delivery\stages\04-build\output\gateway-to-oman"
npm run dev
```

- Opens at <http://localhost:3000>
- Hot reload on every save
- ⚠️ **`.env` currently points at production Turso/Anthropic/R2.** Test writes (lead submissions, listing edits, etc.) hit production data. For copy/visual changes this is fine; for data-writing tests, be conscious. Setting up a staging Turso DB is a deferred ~30 min task.

### Tier 2 — Vercel preview deployment (review-before-prod)

```powershell
vercel deploy --yes
```

- No `--prod` flag — that's the only difference from a production deploy
- Builds and returns a URL like `gateway-to-oman-<hash>-jalookout7-1526s-projects.vercel.app`
- Same production build pipeline, separate URL — does NOT affect `gatewaytooman.com`
- Share with Ahmed for review or click-test yourself
- Preview URL persists until you delete the deployment

### Tier 3 — Production

```powershell
vercel deploy --prod --yes
```

- Aliases automatically to `gatewaytooman.com` + `www.gatewaytooman.com`
- Goes live immediately

### Recommended end-to-end flow

```powershell
# 1. Edit code in VS Code
# 2. Test locally
npm run dev

# 3. Commit and push
git add -A
git commit -m "feat: <one-line summary>"
git push origin section-b-marketplace

# 4. Preview deploy (review step)
vercel deploy --yes
# Open the preview URL → click-test → share with Ahmed if needed

# 5. Only when satisfied: production
vercel deploy --prod --yes
```

### Feature-branch pattern (for bigger work)

```powershell
git checkout -b feat/<name>
# ...make changes, commit...
git push -u origin feat/<name>
vercel deploy --yes              # preview built from the branch
# review → if good:
git checkout section-b-marketplace
git merge feat/<name>
git push
vercel deploy --prod --yes
```

This keeps in-progress work isolated until reviewed. Use it for any change touching >2-3 files or affecting the data layer.

---

## What's live in production

**Public site (`gatewaytooman.com`)**
- Landing page with Omar floating chat (Anthropic Haiku 4.5 with Groq failover)
- Opportunities row — 6 cards: Businesses for Sale (live, links to marketplace), 5 verticals (open Omar chat with topic context)
- 5-variant teaser hook A/B per surface, variant ID persisted on `conversations.hook_variant_id`
- WhatsApp floating button → Ahmed's number
- Calendly direct CTA → `calendly.com/alazizi/30min`
- Footer with /privacy /terms /cookies legal pages (with real Alazizi Global Projects company details)

**Marketplace (`/businesses`)**
- Hero + value props + "What makes us different" + How-it-works (4 steps: Request access → Browse all → Consultation → Close)
- Editor's picks + full listing grid (paywall-gated for non-subscribers)
- Listing detail pages
- Marketplace sign-in/sign-up with email+password+OTP and Google OAuth
- Subscriber profile chip + sign-out flow
- Access-request form (`/businesses/access`)
- Reviewer access link (admin-managed temporary access)

**Omar chatbot (state machine)**
- 1–7 qualifying exchanges, then `[CAPTURE_READY]` → in-chat opt-in prompt → form → optional keep-chat (capped at 7 more exchanges)
- HOT-lead inline CTAs (Calendly + WhatsApp) post-capture
- All button clicks + keep-chat lifecycle logged to `lead_notes` via `/api/chat/event` (Omar AI writes a 2-3 sentence quality assessment on keep-chat end)
- Strict qualification-only voice (no suggestions, ≤5-7 word filler max — see `lib/ai/prompts.ts`)
- `[LEAD CAPTURED]` system-prompt marker so Omar never re-asks for details post-form
- Surface-aware (main vs marketplace), phase-aware (Phase 1 active; Phases 2-3 locked behind `/admin/intelligence`)

**Admin (`/admin`)**
- Email+password login (bcryptjs cost-12) with cookie sessions (SameSite=Strict, 7-day TTL)
- Dashboard with charts (Recharts)
- Leads — inline-editable status/qualification/segment, AI Summary with Regenerate, Lead Notes Timeline (admin + Omar-AI auto-notes), per-row delete + multi-select bulk delete
- Listings — full CRUD + featured curation + R2 media uploads via **presigned direct-to-R2** (cover/gallery up to 15 MB, video up to 50 MB, real upload progress bar — no Vercel body-size cap)
- Inquiries — marketplace access requests with outcome tracking + bulk delete
- Calendar — week view + block/unblock slots
- Conversations — full chat transcript viewer
- Settings — Email config (Resend/SendGrid/SMTP via settings DB), Chatbot phase, Lead options CRUD, Admin users CRUD
- Intelligence dashboard (owner-only) — Omar precision, loss reasons, Omar Roadmap (phase advancement)
- Activity log — append-only audit trail
- Push notifications opt-in (works on iOS PWA + Chrome/Edge/Firefox)

**Email**
- All three paths read provider config from the `settings` table (not env vars)
- OTP email for marketplace sign-up/sign-in via Resend
- Booking confirmation emails with `.ics` calendar attachment — **DORMANT** (see Known gaps below)

---

## ⚡ What needs your attention

### Pending USER actions — open carry-forwards from old §11

| # | Action | Effort | Notes |
|---|---|---|---|
| **B** | Click-test Batch 7d items | 10 min | Country code, AI summary first-gen, calendar 7-col, Omar wrap-up, Omar AI keep-chat note |
| **C** | Click-test Batches 7a/7b/7c | 15 min | Lead options custom value, R2 upload, mobile sign-out, opt-in prompt, floating buttons, profile chip, hook variants |
| **F** | Delete `ADMIN_TOKEN` env var in Vercel | 1 min | Cosmetic — code retired this in Batch 2 |
| **I** | Compliance lawyer review | Ahmed's | Pages have real Alazizi Global Projects entity + License 80962 + address — ready to send to a qualified Oman PDPL + GDPR lawyer |
| **J** | Payment tracker → Drive | 5 min | Upload `assets/gto-payments-tracker.csv` to Drive, share with Ahmed |
| **K** | `R2_PUBLIC_BASE_URL` trailing-space check | 2 min | Code defensively trims it; cleaner to fix the env value |
| ~~**L**~~ | ~~GA4 Measurement ID~~ | Done | **DONE — measurement ID set in Vercel 2026-07-04, GA4 live in production.** Full-coverage instrumentation (landing CTAs, Omar, marketplace) shipped 2026-07-03. Event dictionary + activation steps: workspace client root `measurement/ga4-measurement-plan.md`. **2026-07-21: `/admin/*` excluded from tracking** — `components/analytics/GoogleAnalytics.tsx` now bails (no gtag.js load at all) on any admin route, so internal dashboard usage never reaches GA and Enhanced Measurement can't autotrack it either. |
| **M** | Consent banner sub-batch | ~3-4 hrs | Deferred — JA "later, but priority." **Now live and collecting real visitor data with no consent gate (L shipped 2026-07-04)** — the PDPL/GDPR gap is no longer theoretical. Google Consent Mode v2 with `analytics_storage` defaulting to denied + Accept/Decline banner. Worth reprioritizing alongside item I (lawyer review) since both concern the same real-visitor data now flowing. |
| **N** | Confirm sign-up enumeration trade-off (security audit A07-1) | 30 sec | The fix removes the "An account with that email exists" 409 error and returns a generic 200 instead. OWASP-recommended; slight UX downgrade for "I forgot I had an account" case. JA confirmed proceeding with the secure version — captured here so the decision isn't re-litigated. |
| **O** | Click-test Vercel preview of Batch 17 (CSP + magic-byte sniff + topic allowlist + cron HTML escape + Resend masking) before promoting to prod | 10 min | CSP can visually break things if allowlist is wrong. Preview-deploy review is the gate before prod. JA-only action. |
| **P** | Finish mobile-nav preview click-test → approve prod | 5 min | Preview deployed 2026-07-25. JA already confirmed via WhatsApp in-app browser: bottom nav (Dashboard/Leads/Listings/Inquiries/Menu), sheet, gold active state all working. Remaining: PWA cold-open (pulsing logo), sheet-to-nav fit (~3px strip possible), Escape/backdrop dismiss. Then `vercel deploy --prod --yes`. Note: push-notification chip is NOT removed — it hides in browsers without web-push support (e.g. WhatsApp in-app browser); visible in Safari/PWA. |
| **Q** | Fix git push credential + push 9 local commits | 5 min | Origin stuck at `f2c2786`; everything since (specs, plans, mobile-nav feature, line-ending normalization) is local-only. Keychain credential invalid; one-time PATs were revoked after use. Until pushed, GitHub is NOT a backup of current work. |

### Queued build pipeline (specs approved + committed 2026-07-25, in `docs/superpowers/specs/`)

Agreed execution order. Each gets its implementation plan written just-in-time before its build.

| # | Project | Status | Notes |
|---|---|---|---|
| 1 | Mobile nav bottom sheet + PWA loading | **BUILT — on preview** (item P) | Plan: `docs/superpowers/plans/2026-07-25-mobile-admin-nav-and-pwa-loading.md`. 202/202 tests. |
| 2 | Batch 16 security hardening (2 HIGH + 4 MED) | Spec ready | `2026-07-25-batch16-security-hardening-design.md`. Ships direct to prod (server-side only). |
| 3 | GA4 consent banner (Consent Mode v2, opt-out model) | Spec ready | `2026-07-25-consent-banner-design.md`. JA decision: undecided visitors ARE tracked; Decline kills GA. Default is a one-line flip if lawyer review (item I) demands opt-in. Closes item M. |
| 4 | Omar chat widget AWS-style redesign | Spec ready | `2026-07-25-chat-widget-aws-redesign-design.md`. Fixed teaser copy SUSPENDS the 5-variant hook A/B experiment (tracked as `<surface>-aws-1`). Button keeps current design; GTO navy/gold. |
| 5 | Intake form page + timed popup | Brainstorm pending | Reuse the (security-reviewed, clean) intake-form UI from the ex-developer's dashboard package (`~/Downloads/gateway_to_oman_dashboard` — its Supabase backend is NOT used); wire into the existing `leads` table + `/api/leads` flow; standalone `/intake` page + timed popup on the main site. OPEN: popup timer (JA said both "10 seconds" and "15 minutes" at different points — resolve at brainstorm); leads-table schema additions (investment_timeline, purpose, location, residency, services); pricing to Ahmed (JA considering ~AED 350-400 one-time, separate from retainer). |

### Infrastructure gaps identified during 2026-06-28 review

From a 9-question security/infrastructure audit. Items marked NO or PARTIAL below — revisit when bandwidth allows.

| # | Item | Status | What's missing | Effort |
|---|---|---|---|---|
| **INF-1** | CORS on admin API | NO | No CORS headers on `/api/admin/*` routes — external origins can issue requests. Mitigated by SameSite=Strict cookies + requireAuth(), but explicit CORS rejection is missing. | ~30 min — add `Access-Control-Allow-Origin` header config in `next.config.js` or a middleware layer |
| **INF-2** | Rate limiting on admin routes | PARTIAL | Sign-in, sign-up, OTP, access-request are rate-limited. Admin API endpoints (`/api/admin/*`) and several marketplace endpoints have no rate limit — credential stuffing on `/api/auth/login` is the main concern. | ~1 hr — add `rateLimit()` calls to `/api/auth/login` + key admin mutation routes |
| **INF-3** | Production monitoring | NO | No Sentry, no Vercel error alerts, no uptime monitoring. Production crashes are silent — only discovered when a user reports it. | ~30 min — Sentry free tier (5K errors/mo); install `@sentry/nextjs`, add DSN env var |
| **INF-4** | Zero-downtime rollback | NO | No scripted rollback. Vercel keeps all prior deployments accessible and you can re-alias any previous deploy via the Vercel dashboard in ~30 seconds — but it's manual, not scripted. | Low urgency — document the manual Vercel rollback steps; script with `vercel alias` CLI when needed |
| **INF-5** | DB index gaps | PARTIAL | `marketplace_sessions.user_id` has no solo index (only composite key). `rate_limits(key, window_start)` has no index despite being the hottest query path (every rate-limit check). | ~15 min — add two `CREATE INDEX IF NOT EXISTS` statements to schema.sql + run migration |

> Note: INF-3 (monitoring) is also listed in Scalability Phase 2 — same item, different framing. INF-4 rollback is operationally covered by Vercel's deployment history; the gap is documentation, not capability.

### Known gaps identified during 2026-05-29 review

| Item | Severity | Effort | Description |
|---|---|---|---|
| **Source column missing on `/admin/leads` table** | Cosmetic | ~10 min | Data is in DB + API + filter dropdown; just not rendered as a column in the table. Add `<th>Source</th>` + `<td>{lead.source}</td>`. |
| **Mobile overflow on `/admin/settings` lead options** | Cosmetic | ~30-60 min | JA screenshot 2026-07-25: Statuses + Qualifications rows overflow the right edge on mobile — the "active" checkbox and "+ Add" button are clipped off-screen. Pre-existing (not caused by the nav work). Fix: let rows wrap or stack the color/order/active controls on narrow viewports. JA: "fix the alignment later." |
| **No auto-draft email on lead capture** | Real gap | ~2-3 hr | Currently drafts only auto-generate for booking confirmation + cron reminders. Generic lead-capture should also queue a personalised draft (using Anthropic Haiku + `summariseLead` pattern). Lands in the existing "Email Pending Approval" UI block. |
| **Email approval workflow incomplete** | Real gap | ~half day | Backend + UI exist for auto-generated drafts only. Missing: (1) "Compose new email" button on each lead row, (2) central `/admin/emails` queue page showing all drafts across all leads, (3) edit-before-send capability. |

> Security gaps from the 2026-05-30 audit now live under §Security state below (Batch 16 ships to prod; Batch 17 ships to preview first).

### Dormant code paths

These work but aren't reachable in normal traffic. Documented so they're not "rediscovered" as bugs:

- **Booking confirmation email + `.ics` calendar attachment** (`lib/email/booking.ts`, also triggered from `/api/leads/route.ts` lines 200-220) — Omar can't book a meeting today (Calendly handles all bookings), so this draft is never minted. Would revive if a Calendly API webhook is added.
- **Cron meeting reminders** (`/api/cron/reminders`, `vercel.json` daily 09:00 UTC) — runs daily, finds no upcoming Omar-booked meetings, exits cleanly. Revives with same Calendly hook.

---

## 🔒 Security state

### Posture summary

| Layer | Result |
|---|---|
| SQL injection (OWASP A03) | ✅ CLEAN — every dynamic SQL fragment uses hardcoded identifiers + parameterised binds |
| SSRF (OWASP A10) | ✅ CLEAN — no user-controlled URL fetched server-side |
| Hardcoded credentials | ✅ CLEAN — grep for `sk-`, `re_`, `SG.`, `ghp_` etc. across `app/`, `lib/`, `components/`, `scripts/` returns zero hits |
| `NEXT_PUBLIC_*` exposure | ✅ CLEAN — only `VAPID_PUBLIC_KEY` (designed public) and `GA_MEASUREMENT_ID` (designed public) |
| Server keys in browser | ✅ CLEAN — Anthropic/Groq/Resend never referenced from `"use client"` files |
| Sensitive API field leaks | ✅ CLEAN — `password_hash` never returned; `/api/auth/me` returns minimal `SessionUser` shape |
| Cookies (admin + marketplace) | ✅ httpOnly + secure + SameSite tuned per surface |
| Session tokens | ✅ 32-byte CSPRNG |
| Cron + reviewer-link comparisons | ✅ timing-safe |
| `npm audit` (production tree) | ✅ no prod vulns (dev-only eslint + vitest transitive vulns acceptable) |

### Comprehensive audit performed 2026-05-30

Full audit pass across security headers, OWASP Top 10, and credential/data leakage by parallel review agents. Two HIGH findings (both rate-limit gaps on public endpoints), 10 MED, 6 LOW. **No live exploits available; no production data at immediate risk.** Findings + fix plan below.

### Open findings (planned for Batch 16 + 17)

**🔴 Batch 16 — ships direct to prod (server-side only, no UX changes)**

| # | OWASP | Sev | Location | Issue | Fix |
|---|---|---|---|---|---|
| A04-1 | A04 Insecure Design | **HIGH** | `app/api/leads/route.ts` POST | Public lead-capture has NO rate limit. Each POST triggers Anthropic AI calls + push notifications. Burnable. | `rateLimit("lead_capture", ip, 5, 600)` + 24-h email+IP dedupe |
| A04-2 | A04 Insecure Design | **HIGH** | `app/api/businesses/verify-otp/route.ts` | No IP-level rate limit; per-OTP 5-attempt cap can be reset by re-issuance | `rateLimit("verify_otp", ip, 20, 600)` |
| A07-1 | A07 AuthN Failures | MED | `app/api/businesses/sign-up/route.ts:51-56` | 409 "Account exists" vs 200 = direct email enumeration | Always return generic 200; OTP delivery is the real signal. **Trade-off accepted by JA (item N).** |
| A01-1 | A01 Broken Access Control | MED | `app/api/admin/admin-users/route.ts` + `[id]/route.ts` | Uses `requireAuth()` + inline owner check (two failure paths) | Swap to `requireOwner()`; drop inline check |
| A01-2 | A01 Broken Access Control | MED | `app/api/admin/reviewer-link/route.ts` | Any admin role can rotate reviewer link | Swap to `requireOwner()` |
| A08-1 | A08 SW/Data Integrity | MED | `lib/auth/google.ts:42-57` `decodeIdToken()` | Google `id_token` decoded WITHOUT signature verification (was deferred audit item M-2) | Add `jose`, verify `iss`/`aud`/`exp`/signature against Google JWKS in `/api/businesses/google/callback` |

**🟡 Batch 17 — ships to Vercel preview first; JA click-tests (item O); then prod**

| # | OWASP | Sev | Location | Issue | Fix |
|---|---|---|---|---|---|
| H-1 | A05 Misconfig | MED | `next.config.js` headers | No CSP header — biggest XSS defense missing | Ship minimal CSP allowlisting `*.r2.dev`, `images.pexels.com`, `*.googletagmanager.com`, `accounts.google.com`, self |
| A08-3 | A08 SW/Data Integrity | MED | `app/api/cron/reminders/route.ts:88-93` | Lead name interpolated into reminder-email HTML unescaped (XSS in email body) | HTML-escape `leadName` before template interpolation |
| A02-2 | A02 Crypto Failures | MED | `app/api/email/config/route.ts` GET | Returns full Resend API key plaintext to admin browser | Mask by default (`re_••••••last4`); add reveal button |
| A04-3 | A04 Insecure Design | MED | `app/api/businesses/resend-access/route.ts` | No rate limit | `rateLimit("resend_access", ip, 10, 600)` |
| A05-2 | A05 Misconfig | MED | `app/api/admin/leads/bulk-delete/route.ts:70` | Returns raw `err.message` in JSON (DB constraint name leak) | Generic `"delete_failed"` + server-side `console.error` |
| A04-4 | A04 Insecure Design | MED | `lib/ai/prompt-assembler.ts:80-84` | Visitor-controlled `context.topic` interpolated verbatim into Omar's system prompt | Allowlist `topic` against the 7 known opportunity-card titles |
| ~~A08-2~~ | ~~A08~~ | ~~MED~~ | ~~`media/route.ts`~~ | **N/A — superseded by presigned uploads (2026-06-27).** Bytes never reach Vercel; Content-Type allowlist enforced at presign; extension derived server-side; R2 is a separate origin. | Closed. |

### Low-priority / deferred

| # | Sev | Location | Issue |
|---|---|---|---|
| A02-1 | LOW | `lib/auth/sessions.ts:31` | Session tokens stored plaintext in DB (hash before insert for defense-in-depth) |
| A07-2 | LOW | `app/api/auth/login/route.ts:39-41` | Differential timing on missing-email (run dummy bcrypt to equalize) |
| A09-1 | LOW | `app/api/chat/route.ts:161` | `[KB_GAP]` log captures raw visitor message (PII) — truncate or hash |
| A08-4 | LOW | `lib/email/sender.ts:69` | No CRLF strip on email `from`/`subject` from admin-editable settings |
| C-1 | LOW | `app/api/leads/route.ts:257` | `SELECT * FROM leads` returns `score_breakdown` to admin browser |
| H-2/H-3/H-4 | LOW | `next.config.js` | Missing HSTS `preload`, COOP, CORP headers |

### Already-strong baseline (do not regress)

1. All SQL parameterised (no injection vectors)
2. `requireAuth` precedes every DB lookup in admin routes (no IDOR exposures)
3. Cookie security tuned correctly per surface
4. Session tokens 32-byte CSPRNG
5. OTP design solid (CSPRNG 6-digit, 10-min TTL, 5-attempt cap, single-row consumption)
6. Rate-limiting infrastructure exists (gaps are coverage, not infra)
7. `CRON_SECRET` + reviewer-link timing-safe comparisons
8. `activity_log` admin audit trail with IP/UA
9. bcryptjs cost-12 (free OSS lib; no monetary cost; ~250ms/login; plaintext never stored)
10. No client-side credential references anywhere

### bcryptjs cost-12 — clarification

`bcryptjs` is a free npm package. "Cost 12" is the work factor (2¹² = 4,096 hashing rounds), not a price. Each login takes ~250ms on Vercel functions — well within free-tier limits. Plaintext passwords are NEVER stored — only the bcrypt hash (60-char string with embedded salt). OWASP recommends 10-12; we're at the upper end (good).

### Predecessor audit reference

The original first-pass security audit (v7.5, document at `delivery/shared/gto-security-audit-2026-05-24.md`) ranked High priorities 1-4 (all closed in Batch 2), Medium M-2 (now becomes A08-1 above), Low L-1+L-5 (both closed). The 2026-05-30 audit supersedes it.

---

## 📈 Scalability roadmap (10 → 100 → 1K → 10K users)

You're at ~10-50 real users today. The current setup has ~1 year of runway provided you ship Phase 1 below.

### Phase 1 — Cheap wins now (~4 hours, ship as one batch)

The only one of these that's load-bearing in the short term:

1. **Pagination on admin lists** — `/admin/leads`, `/admin/inquiries`, `/admin/conversations` currently `SELECT *` with no limit. At 500+ rows the page chokes. Add cursor-based pagination + "Load more" button. **Biggest single win.**
2. **Cache lead_options + categories in localStorage** — both fetched on every admin page render. Cache for the session.
3. **Composite DB indexes** — single-column indexes only on most tables today. Audit common patterns (`WHERE source = ? AND created_at > ?` etc.) and add composites.
4. **Install Vercel Speed Insights** — `@vercel/speed-insights`. Free, no consent required, gives Core Web Vitals on real users (directly impacts SEO ranking).

### Phase 2 — At ~500 real users (proactive)

5. **Monitoring + alerting** — Sentry free tier (5K errors/mo)
6. **Load-test chat endpoint** — k6 or Artillery, 50 concurrent users for 5 min
7. **Image audit** — check listing photo file sizes; ensure < 200KB

### Phase 3 — At ~1K real users (mandatory upgrades)

8. **Vercel Hobby → Pro** — $20/mo. Unlocks 1TB bandwidth, longer function timeouts, more memory, no concurrent function caps.
9. **Resend Free → Pro** — $20/mo. Above 3K OTP emails/mo.

### Phase 4 — At ~10K users (engineering effort)

10. **Turso Pro + read replicas** — $29/mo. Geographically distribute reads.
11. **Edge runtime for hot paths** — `/api/availability`, `/api/chat/event`, `/api/businesses/categories`. Cuts TTFB ~150ms → ~30ms.
12. **Cloudflare in front of Vercel** — caching layer for `/businesses` listings. Cuts Vercel bandwidth + global TTFB.

### Per-tier cost ceiling (rough)

| Users | Vercel | Turso | Anthropic | Resend | Total/mo |
|---|---|---|---|---|---|
| 100 | Hobby ($0) | Free ($0) | $5-10 | Free ($0) | **~$10** |
| 1,000 | Pro ($20) | Free ($0) | $50-100 | Pro ($20) | **~$100-150** |
| 10,000 | Pro ($20) | Pro ($29) | $200-1000 | Pro ($20) | **~$300-1000** |

---

## 📚 Where to find things

### Tech stack

| Layer | What | Why |
|---|---|---|
| Framework | Next.js 14.2 App Router | SSR + great DX + Vercel-native |
| Database | Turso (libSQL) | Privacy-first SQLite-as-a-service; cheap; in Ahmed's account |
| AI | Anthropic Haiku 4.5 primary + Groq Llama 3.3 70B failover | Quality + reliability; failover on 429/5xx/network/529 |
| Email | Resend (transactional) | Verified `gatewaytooman.com` domain; DKIM+SPF+DMARC live |
| Media | Cloudflare R2 | S3-compatible; cheap; bucket `gto-listings` |
| Auth | bcryptjs + opaque cookies | Battle-tested; HttpOnly; SameSite=Strict on admin |
| Push | web-push + VAPID | Self-hosted; no SaaS dependency |
| Hosting | Vercel (Hobby) | CDN + serverless + cron + previews |
| Styling | Tailwind + Lucide icons + Bodoni Moda + Jost | Brand: navy `#1A1A2E` + gold `#C99B3C` |

### Key files reference (the 90% you'll touch)

**Omar chatbot prompts & behaviour**
- `lib/ai/prompts.ts` — `BASE_PROMPT`, `MAIN_SITE_VARIANT`, `BUSINESSES_VARIANT`, teaser variants, contextual greetings
- `lib/ai/prompt-assembler.ts` — composes the final system prompt (KB + phase + qualification + context + `[LEAD CAPTURED]`)
- `lib/ai/knowledge-base.ts` — 15-topic KB (Ahmed's KB v2 facts) + buyer-qualification matrix
- `lib/ai/phase.ts` — Phase 1/2/3 capabilities + guardrails
- `lib/ai/signals.ts` — `[SEGMENT:X]`, `[CAPTURE_READY]`, `[HIGH_INTENT]`, etc.
- `lib/ai/scoring.ts` — 100-pt lead scoring (Budget 30 + Timeline 25 + DM 15 + Intent 20 + Mindset 15); hot ≥70, warm ≥40
- `lib/ai/lead-summary.ts` — AI summary generator (shared between auto-gen and Regenerate button)
- `lib/ai/whatsapp.ts` — WhatsApp handoff URL builder
- `lib/ai/provider.ts` — Anthropic-primary, Groq-failover wrapper
- `components/chat/ChatWidget.tsx` — full state machine (capture opt-in, keep-chat, HOT-lead CTAs); topic greetings

**Admin UI**
- `app/admin/layout.tsx` — auth, sidebar (with NotificationOptIn chip), mobile top bar
- `app/admin/leads/page.tsx` — main lead management (multi-select + bulk delete here)
- `app/admin/inquiries/page.tsx` — marketplace access requests
- `app/admin/intelligence/page.tsx` — owner-only analytics
- `app/admin/settings/page.tsx` — Email config, Chatbot phase, Lead options CRUD, Listing categories CRUD, Admin users
- `app/api/admin/categories/route.ts` — GET all categories (incl. inactive) + POST create
- `app/api/admin/categories/[id]/route.ts` — PATCH update + DELETE (blocked if listings reference category)
- `components/admin/CategoriesSection.tsx` — categories management UI (inline edit, active toggle, delete)
- `components/admin/NotificationOptIn.tsx` — push subscription chip (iOS-compatible click handler)
- `components/admin/LeadNotesTimeline.tsx` — notes timeline + Omar-AI auto-notes

**Marketplace**
- `app/businesses/page.tsx` — landing (hero, why us, how it works, final CTA)
- `app/businesses/listings/page.tsx` — full grid (subscriber-gated)
- `app/businesses/listing/[slug]/page.tsx` — detail page
- `app/businesses/access/page.tsx` — paid-access request form
- `app/businesses/sign-in/page.tsx` — email+password+OTP + Google OAuth + `router.refresh()` on OTP success
- `components/businesses/BusinessesHeader.tsx` — sticky header (async server component; reads marketplace cookie)
- `components/businesses/ListingCard.tsx` — listing tile (single-line "2 yrs · 2 staff" pattern)

**Legal**
- `components/legal/CompanyFacts.ts` — real company facts (Alazizi Global Projects, License 80962, full address)
- `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/cookies/page.tsx` — Oman PDPL + GDPR-aligned wording

**Data layer**
- `lib/db/client.ts` — Turso client (libsql HTTP)
- `lib/db/schema.sql` — full schema (22 tables, ~6 indexes per table)
- `lib/admin/lead-delete.ts` — cascade delete helper (emails → notes → inquiries → bookings.lead_id=NULL → messages → conversation → lead)
- `lib/r2.ts` — `buildR2Key`, `buildPublicUrl`, `presignPutUrl`, `uploadToR2`, `deleteFromR2`, `toPublicUrl`, `keyFromUrl`
- `lib/media-constants.ts` — shared `IMAGE_TYPES`, `VIDEO_TYPES`, caps (15 MB image / 50 MB video), `MAX_GALLERY`, `getMediaState` helper
- `app/api/admin/listings/[id]/media/presign/route.ts` — auth → rate-limit → allowlist → presign PUT URL
- `app/api/admin/listings/[id]/media/confirm/route.ts` — auth → key-ownership + format check → persist URL server-side → activity log
- `lib/rate-limit.ts` — Turso-backed fixed-window rate limiter
- `lib/auth/sessions.ts`, `lib/auth/password.ts`, `lib/auth/token.ts`, `lib/auth/marketplace.ts`

**Analytics + push**
- `components/analytics/GoogleAnalytics.tsx` — gtag loader (no-op until env var lands)
- `lib/analytics/track.ts` — `trackEvent` helper
- `lib/push/notify.ts` — server-side push dispatcher
- `public/sw.js` — service worker (push handler + notification click)

### Required Vercel env vars

See `assets/env-vars-private.md` (workspace-level, git-ignored) for the actual values. Categories:

- **Database:** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- **AI:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `AI_PROVIDER_FALLBACK`
- **R2:** `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
- **Push:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Cron:** `CRON_SECRET`
- **OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Analytics:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` (live since 2026-07-04, item L done)

**Email config (Resend/SendGrid/SMTP) lives in the `settings` DB table**, NOT env vars — set via `/admin/settings → Email configuration`.

---

## Hook A/B variant tracking

Data is collected on `conversations.hook_variant_id` (format `<surface>-<n>`, 1-indexed) — no admin UI yet. Manual query:

```sql
SELECT
  c.hook_variant_id,
  COUNT(c.id) AS conversations,
  COUNT(l.id) AS leads_captured,
  ROUND(100.0 * COUNT(l.id) / COUNT(c.id), 1) AS conversion_pct
FROM conversations c
LEFT JOIN leads l ON l.conversation_id = c.id
WHERE c.hook_variant_id IS NOT NULL
GROUP BY c.hook_variant_id
ORDER BY conversion_pct DESC;
```

Run via `turso db shell gateway-to-oman-database`. Building a panel for `/admin/intelligence` is a ~1 hour batch when wanted.

---

## Running locally

```powershell
# First time only
cd "C:\Users\ADMIN\Documents\JA\JALAI-Workspaces\delivery\clients\gateway-to-oman\delivery\stages\04-build\output\gateway-to-oman"
npm install

# Every session
npm run dev               # opens http://localhost:3000
```

Migrations (idempotent — safe to re-run):

```powershell
npm run migrate                 # add new tables/columns
npm run migrate:lead-options    # one-shot CHECK constraint removal (already applied to prod)
```

Schema inspection:

```powershell
npx tsx scripts/verify-schema.ts
```

Tests:

```powershell
npm test -- --run               # 190/190 pass across 31 files; ~80s
npx tsc --noEmit                # typecheck (2 pre-existing errors in test files — undici Response/Request vs Next.js wrappers)
```

---

## First-time admin setup (if seeding a fresh DB)

```powershell
$env:ADMIN_SEED_EMAIL='gatewaytooman@gmail.com'
$env:ADMIN_SEED_PASSWORD='Gatewaytooman@2026'
$env:ADMIN_SEED_NAME='Ahmed Al Azizi'
$env:ADMIN_SEED_ROLE='owner'
npx tsx scripts/seed-admin.ts
```

(The seed admin is already in production. Use only on a fresh DB.)

---

## What to do next — recommended order

Pick from these depending on your bandwidth. None block any others except where noted.

### 🔴 Up next — Batch 16 (~45 min, security hardening, ships direct to prod)
Closes both HIGH findings + four MED quick wins from the 2026-05-30 audit:
1. **A04-1** Rate-limit `/api/leads` POST (HIGH)
2. **A04-2** Rate-limit `/api/businesses/verify-otp` (HIGH)
3. **A07-1** Generic sign-up response (MED) — *JA-confirmed via item N*
4. **A01-1 + A01-2** `requireOwner` on admin-users + reviewer-link (MED)
5. **A08-1** Google `id_token` JWKS signature verify via `jose` (MED) — *closes legacy M-2*

### 🟡 Then Batch 17 (~3 hr, defense-in-depth, ships to PREVIEW first per item O)
6. **H-1** Minimal CSP header (MED) — biggest XSS defense
7. **A08-3** HTML-escape lead name in cron reminder template (MED)
8. **A02-2** Mask Resend API key in `/api/email/config` GET (MED)
9. **A04-3** Rate-limit `/api/businesses/resend-access` (MED)
10. **A05-2** Sanitise bulk-delete error response (MED)
11. **A04-4** Allowlist `context.topic` in prompt assembler (MED)
12. **A08-2** Magic-byte image sniffing — **N/A once presigned uploads ship** (bytes bypass our server); superseded by the presigned-upload plan's compensating controls

### Half-day path (close visible UX gaps)
13. **Source column** on `/admin/leads` table — 10 min
14. **Auto-draft email on lead capture** — 2-3 hr — biggest single value-add (every lead gets a ready-to-send personalised follow-up)
15. ~~**GA4 Measurement ID env var** + redeploy (item L)~~ — DONE 2026-07-04

### Full-day path (analytics + tracking)
16. Items above
17. **Consent banner** (item M) — 3-4 hr — closes PDPL/GDPR gap from L. **Higher priority now that L is live and collecting real visitor data with no consent gate.**
18. **Hook A/B panel** on `/admin/intelligence` — 1 hr — start measuring teaser variants

### When user count starts climbing (scalability Phase 1)
19. **Pagination on admin lists** + cache lookups + composite indexes + Speed Insights — 4 hr total

### Infrastructure hardening (when bandwidth allows)
20. **INF-1** CORS headers on admin API — ~30 min
21. **INF-2** Rate-limit `/api/auth/login` + key admin routes — ~1 hr
22. **INF-3** Sentry free tier — ~30 min (biggest operational win)
23. **INF-5** Two missing DB indexes (rate_limits + marketplace_sessions) — ~15 min

### Whenever convenient (cleanup)
24. Items F, J, K (env var delete, payment tracker upload, R2 trailing-space)
25. Items B, C (click-test old batches)
26. Item I (lawyer review — Ahmed's call)
27. Low-priority security items (A02-1, A07-2, A09-1, A08-4, C-1, H-2/H-3/H-4)

---

## Archived predecessor — when to read it

`docs/superpowers/archive/HANDOVER-v7.22-2026-05-29.md` (1,300+ lines, 15 batches of detail) is where to look for:

- Per-batch chronology (Batches 1–15) — what landed, when, why
- Schema migration history (Phase 6 marketplace, Section C intelligence, Batch 5 CHECK-constraint rebuild)
- Architectural decisions that are now locked (path-based marketplace, in-chat capture opt-in, lead scoring v2 math, etc.)
- Known fragile areas (libsql HTTP transaction quirks, PRAGMA introspection on Turso, R2 trailing-space footgun, JSX entity rules)
- Security audit findings in detail (§14)
- Full Vercel Hobby plan limits (§15.11)

Don't read it for "what to do next" — that's all here.

---

**Doc version:** v8.6 (mobile nav on preview + build pipeline queued + line endings fixed)
**Last updated:** July 25, 2026
**Maintainer:** JA · JALAI

### v8.6 changelog
- **Mobile admin nav rebuilt** (preview, item P): Calendar's 5th tab slot became a Menu tab opening a bottom sheet with Calendar, Sellers, Users, Conversations, Activity, Settings — all admin destinations now reachable on mobile. Escape/backdrop/re-tap/navigate/row-tap all dismiss. New: `lib/admin/mobile-nav.ts`, `components/admin/MobileMenuSheet.tsx`. Intelligence stays out of all navs (unchanged rule).
- **PWA cold-open fix**: the auth-check "Loading..." gray text is now the GTO logo pulsing on navy, server-rendered so it shows pre-hydration. `manifest.json` already had the navy `background_color` (discovered during planning — no change needed).
- **Repo line endings permanently fixed**: `.gitattributes` (`* text=auto`) added + full renormalization commit (`0ca7870`, whitespace-only, safety-verified). The phantom "160 modified files" `git status` noise is gone for good.
- **Test infrastructure**: first component tests (@testing-library/react + @vitejs/plugin-react). Suite: 190 → 202 tests, 33 files.
- **Build pipeline queued**: four approved specs committed (see "Queued build pipeline" section) — Batch 16 security, consent banner (opt-out model, JA decision), Omar widget AWS-style redesign (suspends hook A/B — JA decided knowingly), intake form + popup (brainstorm pending).
- **Known issue logged**: `/admin/settings` lead-options rows overflow on mobile (Statuses + Qualifications) — cosmetic, deferred per JA.
- Baseline corrections: tsc has **3** pre-existing test-file errors (previously noted as 2); build is **85** routes (previously 67 — stale figure).

### v8.5 changelog
- **GA4 confirmed live in production** — `NEXT_PUBLIC_GA_MEASUREMENT_ID` was set in Vercel 2026-07-04 (item L done, closing the last open item from v8.4's carry-forward list).
- **`/admin/*` excluded from GA tracking.** `components/analytics/GoogleAnalytics.tsx` now checks the pathname and returns `null` for any admin route — gtag.js never loads there, so neither the manual `page_view` nor GA4 Enhanced Measurement's autotracking (scroll, outbound clicks) can fire on internal dashboard pages. Previously GA recorded admin page_views alongside real visitor traffic with no clean way to filter them out after the fact (GA4's free-tier Data Filters are IP-based only, not path-based). Fix is at the source instead of relying on reporting-side filters.
- **Item M (consent banner) reprioritized** — no longer a theoretical gap; GA is live and collecting real visitor data with no PDPL/GDPR consent gate. Flagged alongside item I (lawyer review) as the two compliance items now touching real data.
- Full event dictionary + GA4 activation history still lives in workspace client root `measurement/ga4-measurement-plan.md`.

### v8.4 changelog
- **Categories management section** added to `/admin/settings`. New files: `app/api/admin/categories/route.ts` (GET + POST), `app/api/admin/categories/[id]/route.ts` (PATCH + DELETE with listing-ref guard), `components/admin/CategoriesSection.tsx`. Follows the same pattern as LeadOptionsSection — inline name edit, sort order, active toggle, hard-delete blocked if listings reference the category.
- **Infrastructure gaps logged** (INF-1 to INF-5): CORS on admin API, rate-limiting gaps, no production monitoring, no scripted rollback, two missing DB indexes. See "Infrastructure gaps identified during 2026-06-28 review" table.
- Key files reference updated with new category API routes.
- Settings page description updated to include categories.

### v8.3 changelog
- **Presigned direct-to-R2 uploads LIVE** (`dpl_GjoTELzWQDQf6BSCeDTV8MTaqQQR`, 2026-06-27). Video uploads confirmed working by JA. New files: `lib/media-constants.ts`, `lib/r2.ts` (refactored + presigner), `media/presign/route.ts`, `media/confirm/route.ts`. Legacy multipart POST removed. Caps: image 15 MB, video 50 MB. Real progress bar. 190/190 tests.
- Security hardening in confirm route: `publicUrl` derived server-side from `buildPublicUrl(key)` — client no longer trusted for the stored URL. Key validated with exact regex (`^listings/<id>/epoch13-hex16.(jpg|png|webp|mp4|webm)$`).
- A08-2 (magic-byte sniffing) closed as N/A — bytes bypass Vercel entirely under presigned architecture; compensating controls in place.
- Status block updated: prod deploy, commit, test count (190), Vercel Pro.

### v8.2 changelog
- Logged the **presigned direct-to-R2 upload** plan (`docs/superpowers/plans/2026-05-30-presigned-r2-uploads.md`) — fixes the video-upload failure. Corrected the earlier wrong note that "upgrade to Pro" would fix it: Vercel's 4.5 MB function body limit is identical on Hobby and Pro. Approved approach (remove legacy POST, video cap 50 MB, image cap 15 MB); awaiting execution after JA compacts. Requires a one-time R2 CORS step from JA (in the plan).
- Noted A08-2 (magic-byte sniffing) becomes N/A once presigned uploads ship.

### v8.1 changelog
- Logged 2026-05-30 comprehensive security audit findings (2 HIGH, 10 MED, 6 LOW) replacing the older summary §Security state
- Added pending USER actions **N** (sign-up enumeration trade-off — JA confirmed) and **O** (preview-deploy click-test of Batch 17 before promoting CSP to prod)
- Added planned Batches 16 (security HIGH + MED quick wins, ships direct to prod) and 17 (CSP + magic-byte sniff + Resend masking + cron escape + topic allowlist, ships to preview first)
- Removed the standalone "Security M-2" line from Known gaps — absorbed as A08-1 into Batch 16
- Reorganised "What to do next" with Batch 16/17 as the new immediate priority
