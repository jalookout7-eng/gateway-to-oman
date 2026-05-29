# Handover — Gateway to Oman

**Project:** Lead-qualification platform + businesses-for-sale marketplace
**Client:** Ahmed Al Azizi — Alazizi Global Projects (AGP)
**Developer:** JA (JALAI)
**Stage:** 04-build — active
**Started:** April 2026 · **This handover written:** May 29, 2026

> **Predecessor:** the full batch-by-batch history (v7.0 → v7.22) is preserved at
> `docs/superpowers/archive/HANDOVER-v7.22-2026-05-29.md`. Consult it for code
> archaeology — schema decisions, batch chronology, scrapped approaches.
> This document is forward-looking only.

---

## Status — May 29, 2026

| | |
|---|---|
| **Live URLs** | <https://gatewaytooman.com> · <https://www.gatewaytooman.com> |
| **Latest production deploy** | `dpl_2W5g2mtsJCvLJ2BJuXeEndqcrz1Q` (Batch 15, 2026-05-29) |
| **Latest commit on `section-b-marketplace`** | `cad4b4d` (local + origin in sync at handover time) |
| **Repo** | <https://github.com/jalookout7-eng/gateway-to-oman> (private) |
| **Active branch** | `section-b-marketplace` (production deploys from here; `master` ~80 commits behind) |
| **Tests** | 177/177 passing across 30 files |
| **Build** | clean, 65 routes |

What's running: Next.js 14.2 App Router on Vercel Hobby tier, Anthropic Haiku 4.5 (Groq Llama 3.3 70B failover), Turso libSQL in Tokyo region, Resend transactional email (gatewaytooman.com domain verified), Cloudflare R2 for listing media, Web Push notifications (VAPID), Google OAuth for marketplace sign-in, GA4 wiring shipped dormant (waiting for measurement ID).

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
- Listings — full CRUD + featured curation + R2 media uploads (cover/gallery/video, 4.5 MB cap on video per Vercel Hobby tier)
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
| **L** | **GA4 Measurement ID** | 10 min | **JA's stated next priority.** Create GA4 property at <https://analytics.google.com>, copy `G-XXXXXXXXXX` ID, paste into Vercel as `NEXT_PUBLIC_GA_MEASUREMENT_ID`, redeploy. Mark `lead_submit` / `whatsapp_click` / `calendly_click` / `chat_opened` as conversions in GA4 Admin → Events. |
| **M** | Consent banner sub-batch | ~3-4 hrs | Deferred — JA "later, but priority." Closes the GA4-without-consent PDPL/GDPR gap created by L. Google Consent Mode v2 with `analytics_storage` defaulting to denied + Accept/Decline banner. |

### Known gaps identified during 2026-05-29 review

| Item | Severity | Effort | Description |
|---|---|---|---|
| **Source column missing on `/admin/leads` table** | Cosmetic | ~10 min | Data is in DB + API + filter dropdown; just not rendered as a column in the table. Add `<th>Source</th>` + `<td>{lead.source}</td>`. |
| **No auto-draft email on lead capture** | Real gap | ~2-3 hr | Currently drafts only auto-generate for booking confirmation + cron reminders. Generic lead-capture should also queue a personalised draft (using Anthropic Haiku + `summariseLead` pattern). Lands in the existing "Email Pending Approval" UI block. |
| **Email approval workflow incomplete** | Real gap | ~half day | Backend + UI exist for auto-generated drafts only. Missing: (1) "Compose new email" button on each lead row, (2) central `/admin/emails` queue page showing all drafts across all leads, (3) edit-before-send capability. |
| **Security M-2 — Google `id_token` JWKS verify** | Medium | ~30 min | Was deferred until Google OAuth went live. **OAuth is now live → ship it.** Add `jose`, verify `iss`/`aud`/`exp`/signature in `/api/businesses/google/callback`. Defense-in-depth — current path is HTTPS-only so tampering in transit is already impossible. |

### Dormant code paths

These work but aren't reachable in normal traffic. Documented so they're not "rediscovered" as bugs:

- **Booking confirmation email + `.ics` calendar attachment** (`lib/email/booking.ts`, also triggered from `/api/leads/route.ts` lines 200-220) — Omar can't book a meeting today (Calendly handles all bookings), so this draft is never minted. Would revive if a Calendly API webhook is added.
- **Cron meeting reminders** (`/api/cron/reminders`, `vercel.json` daily 09:00 UTC) — runs daily, finds no upcoming Omar-booked meetings, exits cleanly. Revives with same Calendly hook.

---

## 🔒 Security state

| Priority | Status |
|---|---|
| **High 1-4** | ✅ All closed (Batch 2). OTP CSPRNG, field-leak closed on `/api/leads`, security headers, `ADMIN_TOKEN` retired, owner gate on `/admin/intelligence`, Turso rate limiting on `/api/chat` (20/min), `/api/auth/login` (5/10min), OTP issue (10/10min/IP + 1/60s/email), access-request (5/10min) |
| **Medium M-2** | ⏭ Open — Google `id_token` JWKS verify. See Known gaps above. |
| **Low L-1, L-5** | ✅ Done — SameSite=Strict admin cookie, masked Resend/SendGrid key inputs |
| **Low rest** | Cosmetic — not load-bearing |
| **Info I-4** | ✅ Verified safe by design — no user-input path to `cover_image_url` |
| **`npm audit`** | Dev-only vitest transitive vulns. No production exposure. |

**Nothing on fire.** M-2 is the only open item worth shipping now.

### bcryptjs cost-12 — no monetary cost

`bcryptjs` is a free npm package. "Cost 12" is the work factor (2¹² = 4,096 hashing rounds), not a price. Each login takes ~250ms on Vercel functions — well within free-tier limits. Plaintext passwords are NEVER stored — only the bcrypt hash (60-char string with embedded salt). OWASP recommends 10-12; we're at the upper end (good).

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
- `app/admin/settings/page.tsx` — Email config, Chatbot phase, Lead options CRUD, Admin users
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
- `lib/r2.ts` — `uploadToR2`, `deleteFromR2`, `toPublicUrl` (with defensive `.trim()`)
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
- **Analytics (pending):** `NEXT_PUBLIC_GA_MEASUREMENT_ID` (item L)

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
npm test -- --run               # 177/177 pass; ~80s
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

### 30-minute path (close the biggest open security item)
1. **Security M-2** (Google `id_token` JWKS verify) — defense-in-depth on the new OAuth flow

### Half-day path (close visible UX gaps)
2. **Source column** on `/admin/leads` table — 10 min
3. **Auto-draft email on lead capture** — 2-3 hr — biggest single value-add (every lead gets a ready-to-send personalised follow-up)
4. **GA4 Measurement ID env var** + redeploy (item L) — 10 min, JA priority

### Full-day path (analytics + tracking)
5. Items above
6. **Consent banner** (item M) — 3-4 hr — closes PDPL/GDPR gap from L
7. **Hook A/B panel** on `/admin/intelligence` — 1 hr — start measuring teaser variants

### When user count starts climbing (scalability Phase 1)
8. **Pagination on admin lists** + cache lookups + composite indexes + Speed Insights — 4 hr total

### Whenever convenient (cleanup)
9. Items F, J, K (env var delete, payment tracker upload, R2 trailing-space)
10. Items B, C (click-test old batches)
11. Item I (lawyer review — Ahmed's call)

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

**Doc version:** v8.0 (fresh slate)
**Last updated:** May 29, 2026
**Maintainer:** JA · JALAI
