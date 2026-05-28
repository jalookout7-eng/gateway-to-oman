# Gateway to Oman — Project Handover Document

**Prepared by:** JA (Developer)
**Prepared for:** Ahmed Al-Azizi — Al Azizi Group
**Last Updated:** May 26, 2026
**Live URL:** https://gateway-to-oman.vercel.app
**Marketplace landing:** https://gateway-to-oman.vercel.app/businesses
**Marketplace grid:** https://gateway-to-oman.vercel.app/businesses/listings
**Subscriber sign-in / sign-up:** https://gateway-to-oman.vercel.app/businesses/sign-in
**Admin URL:** https://gateway-to-oman.vercel.app/admin
**Repository:** https://github.com/jalookout7-eng/gateway-to-oman (private)
**Active Branch:** `section-b-marketplace` (master has diverged — see Section 10)
**Local repo path:** `JALAI-Workspaces/delivery/clients/gateway-to-oman/delivery/stages/04-build/output/gateway-to-oman` (consolidated into the JALAI workspace per ICM on 2026-05-21; was `JA/Gatewaytooman/gateway-to-oman`). Client source files (KB doc, screenshots, env-vars-private) now in the client-root `assets/` folder. Deploy with `vercel deploy --prod --cwd "<this path>"`.

---

## 1. Project Overview

Gateway to Oman is a lead-generation platform with an AI-powered chatbot ("Omar"), built to attract and qualify entrepreneurs, investors, professionals, and retirees interested in opportunities in Oman. It also hosts a vetted Businesses-for-Sale marketplace as a separate vertical at `/businesses` (production destination: `businesses.gatewaytooman.com` once DNS is configured).

### What It Does
- **Landing page** showcasing Oman opportunities, services, and the team's credentials — with real photography from Muscat, Oman's wadis, and key landmarks. "Businesses for Sale" opportunity card links live to `/businesses`; other 5 verticals show a "Coming Soon" badge.
- **Businesses-for-Sale marketplace** at `/businesses` (landing page) + `/businesses/listings` (grid) — vetted listings with category, location, price, age, employees, financials. Collapsible filter sidebar (category, city, listing type, status, price range), search bar, "Editor's picks" featured row. Landing carries hero, value props, what-you-get panel, 4-step how-it-works, FAQ. **As of Phase 8 the full grid + listing detail pages are subscriber-gated:** non-activated visitors see the grid blurred behind a paywall overlay (one-time fee + Sign in / Request access); only activated subscribers browse freely.
- **Marketplace authentication** at `/businesses/sign-in` — visitors sign up with full name, email, ISO country-code phone, and a password (strength meter). A 6-digit OTP is emailed for verification. Sign-in also requires the OTP. **Google sign-in is now live** ("Continue with Google" runs a real OAuth flow; needs `GOOGLE_CLIENT_ID`/`SECRET` set, otherwise it shows a friendly "not configured yet" notice).
- **Reviewer access link** (Phase 8) — an admin-managed, regenerable link on `/admin/users` that grants temporary full-marketplace access to anyone (signs into a pre-activated reviewer account; no OTP). Shuffling the link instantly revokes old ones.
- **Marketplace access flow** at `/businesses/access` — visitors submit name, email, mobile, and a brief message. The team receives the request in `/admin/inquiries`, invoices and grants access manually. Access fee (default OMR 100) is admin-configurable.
- **Context-aware AI chatbot** that auto-opens after 7 seconds, OR opens in a centered modal when any CTA or opportunity card is clicked — pre-seeded with the relevant context
- **Omar phasing + knowledge-base integration** (2026-05-24, **deployed to production**): Omar now answers from a structured **15-topic knowledge base** (Ahmed's KB v2, with corrected tax/ownership facts — he no longer states the wrong "0% corporate tax for 5 years") instead of 8 hardcoded facts; he is **surface-aware** (main site qualifies across all GTO packages; the `/businesses` marketplace adds Azizi's buyer-qualification logic) with **per-page greeting hooks**; runs under a settings-backed **"new employee" phasing ladder** (Phase 1 = qualify + answer from KB; Phases 2 Concierge / 3 Scheduler locked) that is **tracked + advanced from the intelligence dashboard's Omar Roadmap panel** (`/admin/intelligence`); and **routes HOT marketplace leads to Ahmed's WhatsApp** via a one-tap CTA. Prompt assembled by a pure `buildSystemPrompt({surface, phase, context})`; the active phase lives in the `settings` table (`omar_phase`, default 1 — no migration needed). Spec + plan in `docs/superpowers/`. Living roadmap: `delivery/shared/gto-omar-phasing-roadmap.md`.
- **Lead capture** with name, email, and phone — triggered intelligently by AI signals or after 5 exchanges max; chat closes fully after submission
- **Consultation booking flow** — AI asks for preferred day and time, creates a booking record, generates a draft confirmation email for Ahmed to review and send
- **Admin dashboard** with email/password login, charts, lead management, marketplace inquiries, listings management (full CRUD + featured curation), sellers, activity log, marketplace users (approve / revoke access), AI lead summaries, conversation transcripts, booking calendar, and settings (collapsible Email / Chatbot / Admin Users sections)
- **Push notifications** to Ahmed's browser (and phone when installed as PWA) — new leads, new bookings, upcoming meeting reminders
- **Email approval workflow** — all outbound emails to leads are drafted and held until Ahmed clicks Send
- **PWA-installable** — can be added to home screen on iOS and Android; push notifications work on both
- **All conversations recorded** in the database, even if the visitor doesn't submit a form
- **Layer 3-first lead intelligence schema** — every lead carries silent scoring fields (qualification_path, chatbot_responses, score_breakdown, outcome, session metrics) for monthly intelligence review
- **Programmatic lead scoring** — Hot / Warm / Cold tier set on every captured lead per the 100-point model in `gto-lead-scoring-v1.md`. Push notification title carries the tier emoji.

---

## 2. Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Hosting | Vercel (Hobby tier) | Deployment and CDN |
| Database | Turso (hosted SQLite, libSQL) | Privacy-first, serverless database — now in Ahmed's Turso account |
| AI | Groq + Llama 3.1 8B | Fast AI chat responses (LiteLLM migration planned for Section E) |
| Authentication | bcryptjs + opaque session tokens | Admin email/password login, HttpOnly cookie sessions, 7-day TTL |
| Styling | Tailwind CSS | Utility-first CSS |
| Animations | Framer Motion | Scroll and interaction animations |
| Charts | Recharts | Dashboard visualizations |
| Icons | Lucide React | SVG icon library (stroke-based, consistent) |
| Email | Nodemailer / Resend / SendGrid | Multi-provider email sending |
| Calendar | ical-generator | .ics calendar file generation for booking emails |
| Push | web-push + Web Push API | Browser push notifications (VAPID) |
| Photos | Local + Pexels CDN | Hero: Sultan Qaboos Mosque (main). Marketplace hero: Muscat dusk skyline (local JPG). Section photos: Pexels CDN |
| Branding | GTO logo (local PNG) | Every header surface — main Navbar, marketplace header, admin sidebar + login |

---

## 3. Access Credentials

### Admin Dashboard (Primary — email/password)
- **URL:** https://gateway-to-oman.vercel.app/admin
- **Email:** `gatewaytooman@gmail.com`
- **Password:** `Gatewaytooman@2026` (stored in `env-vars-private.md`)
- **Owner role** — full access to leads, marketplace inquiries, listings (with featured curation + access-fee editing), conversations, calendar, settings
- Seeded via `scripts/seed-admin.ts` (bcryptjs cost-12 hash, idempotent)

### Admin Dashboard (Legacy — shared token)
- **Token:** `gto-admin-2026`
- Still works as a fallback for backward compatibility. Will be deprecated once all admin pages move to session-based fetches. Use email/password instead.

### Vercel (Hosting)
- **Account:** jalookout7-eng (GitHub-linked)
- **Project:** gateway-to-oman
- **Dashboard:** https://vercel.com/jalookout7-1526s-projects/gateway-to-oman
- **Auto-deploys:** disabled on this project. All production deploys go through CLI (`vercel deploy --prod`).

### Turso (Database — under Ahmed's account, 2026-05-10)
- **Database name:** `gateway-to-oman-database`
- **URL:** `libsql://gateway-to-oman-database-gatewaytooman.aws-ap-northeast-1.turso.io`
- **Region:** AWS AP Northeast 1 (Tokyo)
- **Owner email:** `gatewaytooman@gmail.com` (Ahmed's account)
- **Auth Token:** stored in Vercel environment variables + `env-vars-private.md`
- **Schema state:** 15 tables, Layer 3 fields on `leads`, 8 categories seeded, 5 sample listings seeded as featured (ranks 1–5), 1 admin user seeded.

### Groq (AI)
- **Provider:** Groq Cloud
- **Model:** Llama 3.1 8B (fast, free tier available)
- **API Key:** Stored in Vercel environment variables
- **Future:** Section E migrates to Flask + LiteLLM (Groq primary + fallbacks). Payment method pending Ahmed.

### GitHub (Code)
- **Repo:** https://github.com/jalookout7-eng/gateway-to-oman
- **Active branch:** `section-b-marketplace` (production runs from this branch; master has diverged)
- **Visibility:** Private

---

## 4. Environment Variables (Vercel)

Configured in Vercel → Project Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_DATABASE_URL` | Turso database connection URL | Yes |
| `TURSO_AUTH_TOKEN` | Turso authentication token | Yes |
| `AI_PROVIDER` | AI provider (`groq`) | Yes |
| `GROQ_API_KEY` | Groq API key for chat | Yes |
| `ADMIN_TOKEN` | Token for admin dashboard login | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (marketplace "Continue with Google") | For Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Google sign-in |
| `VAPID_PUBLIC_KEY` | Web Push public key (generated, see env-vars-private.md) | Yes |
| `VAPID_PRIVATE_KEY` | Web Push private key | Yes |
| `VAPID_EMAIL` | Contact email for push service (`mailto:you@gmail.com`) | Yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as VAPID_PUBLIC_KEY — exposed to browser | Yes |
| `CRON_SECRET` | Secret token to authenticate Vercel Cron calls | Yes |
| `EMAIL_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`) | Yes (for email) |
| `EMAIL_PORT` | SMTP port (usually `587`) | Yes (for email) |
| `EMAIL_SECURE` | `true` for port 465, omit/`false` for 587 | Optional |
| `EMAIL_USER` | SMTP username / email address | Yes (for email) |
| `EMAIL_PASS` | SMTP password or app password | Yes (for email) |
| `EMAIL_FROM_ADDRESS` | From address for outbound emails to leads | Yes (for email) |

> **Actual key values** are stored in `env-vars-private.md` in the project folder (not committed to git).
> Never regenerate VAPID keys unless you want to reset all push subscriptions on all devices.

---

## 5. Project Structure

```
gateway-to-oman/
├── app/
│   ├── page.tsx                              # Landing page (assembles all sections)
│   ├── layout.tsx                            # Root layout — fonts, ChatWidget, ChatModal, ChatModalProvider, PWA manifest link
│   ├── globals.css                           # Tailwind base, font-heading on h1-h6, gold-gradient
│   ├── businesses/                           # ★ Phase 6: Marketplace subdomain (lives at /businesses)
│   │   ├── layout.tsx                        # Marketplace shell — BusinessesHeader (with GTO logo + nav), footer
│   │   ├── page.tsx                          # Marketplace home — hero image, "Editor's picks" featured row, filterable grid
│   │   ├── access/page.tsx                   # Paid-access request page — welcome, fee badge, name+email+mobile+message form
│   │   ├── list-your-business/page.tsx       # Coming Soon page (WhatsApp + email CTAs until seller portal ships)
│   │   └── listing/[slug]/page.tsx           # Listing detail — 12 fields, inquire block; reachable by URL (proper gating in next phase)
│   ├── admin/
│   │   ├── layout.tsx                        # Admin shell — session-based auth (cookie) primary + legacy token fallback, eye toggle on passwords
│   │   ├── page.tsx                          # Dashboard with charts
│   │   ├── leads/page.tsx                    # Leads table — expandable AI summary, email draft approval, Call/Email actions
│   │   ├── listings/page.tsx                 # ★ Marketplace listings table — featured star toggle, status filter, search, access fee inline editor
│   │   ├── inquiries/page.tsx                # ★ Marketplace access requests — one-click outcome changes, WhatsApp/email deeplinks
│   │   ├── calendar/page.tsx                 # Booking calendar — week view, block/unblock days and slots
│   │   ├── conversations/page.tsx            # Conversation viewer with AI summary header
│   │   └── settings/page.tsx                 # Email config, consultation time slots, chatbot settings
│   └── api/
│       ├── auth/
│       │   ├── route.ts                      # Legacy POST — token validation (kept for backward compat)
│       │   ├── login/route.ts                # ★ POST email+password → cookie session
│       │   ├── logout/route.ts               # ★ POST — destroys session, clears cookie
│       │   └── me/route.ts                   # ★ GET — returns current session user
│       ├── businesses/
│       │   └── access-request/route.ts       # ★ POST — creates lead (source=businesses), inquiry (if listing referred), activity_log entry
│       ├── chat/route.ts                     # AI chat — context injection, availability injection, booking signal handling
│       ├── availability/route.ts             # Returns available days/slots for next 7 days (Oman time)
│       ├── bookings/route.ts                 # Booking records CRUD
│       ├── leads/                            # Lead CRUD — triggers AI summary + push notification on creation
│       ├── conversations/                    # Conversation list + detail
│       ├── email/                            # Send, test, config
│       ├── cron/reminders/route.ts           # Vercel Cron — finds upcoming meetings, drafts reminder emails, sends push
│       └── admin/
│           ├── stats/route.ts                # Dashboard analytics
│           ├── listings/route.ts             # ★ GET marketplace listings (with featured + inquiry counts)
│           ├── listings/[id]/featured/route.ts # ★ PATCH — toggle featured + auto-assign featured_rank
│           ├── inquiries/route.ts            # ★ GET marketplace access requests (leads + linked listings)
│           ├── inquiries/[leadId]/outcome/route.ts # ★ PATCH — update lead outcome (pending/contacted/converted/nurture/rejected)
│           ├── settings/marketplace/route.ts # ★ GET/PUT — marketplace_access_fee_omr setting
│           ├── blocked-slots/                # Block/unblock availability slots
│           ├── emails/[id]/send/             # Ahmed approves and sends a draft email
│           ├── leads/[id]/summarize/         # Regenerate AI summary for a lead
│           └── push/subscribe/               # Save browser push subscription
├── components/
│   ├── landing/                              # 10+ landing page sections — Navbar uses GTO logo
│   │   └── Opportunities.tsx                 # ★ Routing model { kind: "subdomain" | "modal" | "comingSoon" } per card
│   ├── businesses/                           # ★ Marketplace components
│   │   ├── BusinessesHeader.tsx              # Sticky subdomain header with GTO logo
│   │   ├── MarketplaceHero.tsx               # Full-bleed Muscat dusk hero with navy gradient overlay
│   │   ├── ListingCard.tsx                   # BizBuySell-style card — image, status badge, price, age, employees
│   │   ├── StatusBadge.tsx                   # Available / Reserved / Sold pills
│   │   ├── FilterSidebar.tsx                 # URL-driven filters: category, city, type, status, price range
│   │   ├── SearchBar.tsx                     # Text search across title, detail, city
│   │   ├── SortControl.tsx                   # Newest / price asc / price desc
│   │   ├── AccessRequestForm.tsx             # Paid-access signup form (client component)
│   │   └── InquireBlock.tsx                  # WhatsApp deeplink + form (on listing detail pages)
│   ├── chat/
│   │   ├── ChatWidget.tsx                    # Floating chat — centered on desktop, hidden on admin, closes after capture
│   │   ├── ChatModal.tsx                     # Centered modal — context-aware, fresh conversation per open
│   │   ├── ChatMessages.tsx                  # Shared message list component
│   │   ├── ChatInput.tsx                     # Input with font-size:16px (prevents iOS zoom), WhatsApp layout
│   │   ├── LeadCaptureForm.tsx               # Lead form (shared by Widget and Modal)
│   │   └── BookingButton.tsx                 # High-intent booking prompt
│   ├── admin/                                # Scorecard, charts (6 components)
│   │   └── AccessFeeCard.tsx                 # ★ Inline editor for marketplace_access_fee_omr on /admin/listings
│   └── ui/                                   # Button, Card, Badge, Input, Modal
├── lib/
│   ├── ai/
│   │   ├── prompts.ts                        # System prompt — Omar, 3-layer personality, hard 3-5 exchange cap, anti-sales guardrail
│   │   ├── provider.ts                       # Groq API integration
│   │   └── signals.ts                        # Signal parsing — includes BOOKING_DAY and BOOKING_TIME
│   ├── auth/
│   │   ├── token.ts                          # requireAuth (async) — accepts cookie session OR legacy bearer ADMIN_TOKEN
│   │   ├── password.ts                       # ★ bcryptjs cost-12 hash + verify
│   │   └── sessions.ts                       # ★ Session create/get/destroy backed by admin_sessions table
│   ├── businesses/                           # ★ Marketplace domain layer
│   │   ├── types.ts                          # Listing, Category, ListingFilters
│   │   ├── queries.ts                        # listListings (with featured + limit), getListingBySlug, listCategories, listCities
│   │   ├── format.ts                         # OMR currency, sale-or-rent price range, age label
│   │   └── settings.ts                       # get/set marketplace_access_fee_omr via settings table
│   ├── context/
│   │   └── ChatModalContext.tsx              # Global context — openModal(intent, topic), closeModal
│   ├── email/
│   │   ├── sender.ts                         # Multi-provider email sender (SMTP/Resend/SendGrid)
│   │   └── booking.ts                        # Booking confirmation email + .ics calendar attachment generator
│   ├── push/
│   │   └── notify.ts                         # sendPushNotification() — sends to all stored subscriptions
│   └── db/                                   # Turso client + schema.sql (15 tables, Layer 3 fields)
├── public/
│   ├── gto-logo.png                          # ★ Ahmed's official Gateway to Oman logo
│   ├── businesses/hero.jpg                   # ★ Muscat dusk skyline (mosque + palms) — marketplace hero
│   ├── sw.js                                 # Service worker — handles push events, notification clicks
│   ├── manifest.json                         # PWA manifest — enables "Add to Home Screen"
│   ├── icon-192.png                          # PWA icon
│   ├── icon-512.png                          # PWA icon
│   └── hero-muscat.png                       # Main-site hero — Sultan Qaboos Grand Mosque
├── scripts/
│   ├── migrate.ts                            # Database migration script (skips comment-only chunks)
│   ├── seed-admin.ts                         # ★ Reusable, idempotent admin seeder (ADMIN_SEED_* env vars)
│   ├── seed-listings.ts                      # ★ Seed 5 sample listings from Ahmed's project descriptions
│   ├── seed-featured.ts                      # ★ Mark 5 listings as featured with ranks 1–5
│   ├── verify-schema.ts                      # ★ Inspect tables, columns, indexes, seed data on live DB
│   ├── verify-admin.ts                       # ★ Inspect admin users + recent activity_log entries
│   └── verify-featured.ts                    # ★ Confirm featured columns are live on Turso
├── tests/
│   └── db/schema-section-c.test.ts           # ★ 35 tests covering existence, defaults, enums, FK, uniqueness, hybrid pricing
├── vercel.json                               # Vercel Cron config — reminders daily 09:00 UTC (Hobby plan limit)
├── next.config.js                            # images.pexels.com remote patterns
├── tailwind.config.ts                        # Color tokens + font families
└── .env.example                              # Template for environment variables
```

---

## 6. What Has Been Built

### Phase 1 — Core Application (April 1, 2026)
- Full Next.js 14 project scaffold with Tailwind brand config (navy/gold/teal)
- All API routes: chat, leads, conversations, email, admin stats, auth
- Database layer with Turso (5 tables: conversations, messages, leads, emails, settings)
- AI chatbot with Groq + signal system (hidden tags for visitor segmentation)
- Complete landing page (10 sections)
- Admin dashboard with charts, leads management, conversation viewer, settings
- Multi-provider email system (SMTP / Resend / SendGrid)
- 22 Vitest tests

### Phase 2 — Photography & Visual Polish (April 6, 2026)
- Real Oman photography from Pexels across all landing sections
- Chat button changed to pill-shaped "AI Assistant" label
- Added `images.pexels.com` to `next.config.js` remote patterns

### Phase 3 — UI/UX Pro Max Redesign (April 6, 2026)
- **Typography:** Bodoni Moda (headings) + Jost (body) via `next/font/google`
- **Icons:** All emoji replaced with Lucide React SVG icons throughout
- **Hero:** Eyebrow badge, 3 trust badges, second CTA button
- **UX:** `cursor-pointer` globally, focus rings, card hover animations, `tabular-nums` on counters

### Phase 4 — AI Personality Rebuild (April 6–7, 2026)
- 3-layer system: Voice (banned words, rhythm), Emotional Intelligence (7 state protocols), Character (signature moves)
- Hard 3–5 exchange cap — exchange 5 is a hard stop, `[CAPTURE_READY]` mandatory
- Anti-sales guardrail — Omar qualifies, does not pitch; willing to say Oman isn't the right fit
- Always ends responses with a qualifying follow-up question
- Self-identifies as "AI Assistant" to visitors (Omar is the internal persona name only)

### Phase 5 — Booking System, Push Notifications, PWA, AI Summaries (April 7–8, 2026 — COMPLETE)

What Phase 5 added:
- **Context-aware chat modal** — any CTA or opportunity card opens a centered chat modal pre-seeded with the relevant context (e.g., "Businesses for Sale"). Email buttons remain as mailto. Each modal is a fresh conversation.
- **Consultation booking flow** — within the modal, AI asks for a preferred day (from available days) and time slot. Creates a booking record in the database.
- **Availability system** — `GET /api/availability` returns open days/slots for the next 7 days (Oman time GMT+4), filtered against blocked slots and existing bookings. If all 7 days are full, returns days 8–14.
- **Admin booking calendar** — week view showing bookings and blocked slots. Ahmed can block full days or individual time slots to control when the chatbot offers availability.
- **Email approval workflow** — no email goes to a lead without Ahmed's approval. Booking confirmation emails and meeting reminder emails are generated as drafts; Ahmed reviews and clicks Send in the admin leads page.
- **Booking confirmation email with .ics** — includes a calendar invite attachment compatible with Google Calendar, Outlook, and Apple Calendar.
- **Web Push notifications** — Ahmed receives OS-level push notifications for: new lead captured, new booking confirmed, meeting in ~1 hour. Clicking a notification opens the relevant admin page.
- **PWA support** — `manifest.json` + service worker enable "Add to Home Screen" on iOS and Android. Push notifications work on Android Chrome and iOS Safari 16.4+.
- **Vercel Cron** — `/api/cron/reminders` runs every 30 minutes. Finds meetings in the next 60–90 minutes, generates reminder email drafts, sends push to Ahmed.
- **AI lead summary** — auto-generated when a lead is created. Groq summarizes the conversation into 5 sections: WHO, WANTS, SIGNALS, BOTTLENECKS, NEXT STEP. Shown in an expandable row in the admin leads table. Ahmed can regenerate any summary.
- **Mobile responsiveness** — admin dashboard gets a bottom tab nav on mobile, stacked charts, scrollable leads table. Landing page audited for horizontal overflow.
- **Quick fixes** — hero overlay darkened for text legibility, ChatWidget hidden on admin routes, chat closes fully after lead capture, duplicate Pexels images replaced, "no sales pitch" text removed, iOS input zoom prevented.

---

## 7. Key Features & How They Work

### AI Chatbot (Floating Widget)
- Auto-opens 7 seconds after page load on landing page only (hidden on `/admin/*`)
- Self-identifies as "AI Assistant" — Omar is the internal persona name
- Uses `lib/ai/prompts.ts` — 3-layer personality, hard 3–5 exchange cap, anti-sales guardrail
- Always ends every response with a qualifying follow-up question
- Hidden signals stripped server-side: `[SEGMENT:X]`, `[INTEREST:X]`, `[CAPTURE_READY]`, `[HIGH_INTENT]`, `[CLOSE_CHAT]`, `[BOOKING_DAY:X]`, `[BOOKING_TIME:X]`
- Chat closes fully (collapses to nothing) after lead form is submitted

### Context-Aware Chat Modal
- Triggered by clicking any opportunity card or CTA button (except email mailto links)
- Opens as a centered overlay on desktop/tablet, full-screen bottom sheet on mobile
- Each open starts a fresh conversation with a new sessionId
- Context passed to AI via silent `[CONTEXT: ...]` injection in system prompt
- For consultation intent: AI also receives `[AVAILABLE_DAYS: ...]` and `[AVAILABLE_SLOTS_FOR_X: ...]` from the availability API
- Closes automatically after lead capture

### Consultation Booking Flow
- Only active when modal is opened with `intent: 'consultation'`
- AI qualifies (2–3 exchanges), then asks for day from available days, then time from available slots
- `[BOOKING_DAY:YYYY-MM-DD]` and `[BOOKING_TIME:HH:MM]` signals create a booking record
- Booking triggers: lead linked to booking, draft confirmation email generated, push notification to Ahmed

### Admin Push Notifications
- Ahmed enables push on first admin login (browser prompt)
- Subscription stored in `push_subscriptions` table
- Three trigger points: new lead, new booking, meeting in ~90 min (via Cron)
- All notifications deep-link to the relevant admin page
- Works on desktop and mobile (PWA installed or browser tab)

### Email Approval Workflow
- All emails to leads are stored as `status = 'draft'` in the `emails` table
- Admin leads page shows "Email Pending" badge per lead
- Ahmed expands the lead row, reads the draft, clicks Send → `POST /api/admin/emails/:id/send`
- Email is dispatched via configured provider (SMTP/Resend/SendGrid), status updated to `sent`
- Call button opens `tel:` link; email button opens draft compose

### AI Lead Summary
- Generated automatically after lead creation (async, does not slow down the visitor's experience)
- Groq summarizes the full conversation in 5 sections: WHO, WANTS, SIGNALS, BOTTLENECKS, NEXT STEP
- Stored in `leads.ai_summary`
- Shown as expandable card in admin leads table with a Regenerate button

---

## 8. Brand System

| Element | Value |
|---------|-------|
| Gold | `#C99B3C` |
| Gold Light | `#E8C777` |
| Navy | `#1A1A2E` |
| Teal | `#7EBEC5` |
| Warm White | `#F8F5F0` |
| Heading Font | Bodoni Moda (serif, luxury) — applied via `font-heading` Tailwind class |
| Body Font | Jost (sans-serif, clean) — applied via `font-body` / `font-sans` |
| Icon Library | Lucide React (stroke-based SVG, `strokeWidth={1.5}`) |
| Gold Gradient | `#C99B3C → #E8C777` (left to right), utility class: `gold-gradient` |

---

## 9. Database Schema

18 tables in Turso (8 from Phase 1–5 + 7 added in Phase 6 + 3 added in Phase 7):

| Table | Purpose |
|-------|---------|
| `conversations` | Every chat session (id, session_id, outcome, segment, timestamps, **source**) |
| `messages` | Every message in every conversation (role, content, raw_content with signals) |
| `leads` | Captured leads — name, email, phone, segment, qualification, status, `ai_summary`, `booking_id`, **source**, **Layer 3 intelligence fields** (lead_score, referrer_name/url, qualification_path, chatbot_responses, special_filter_triggered, score_breakdown, outcome, outcome_updated_at, admin_notes, session_duration_seconds, device_type) |
| `emails` | Email log — subject, body, status (draft/sent/failed), `to_address`, `booking_id`, `approved_at` |
| `settings` | Key-value config store (email settings, chatbot settings, `consultation_slots`, `marketplace_access_fee_omr`) |
| `bookings` | Consultation bookings — lead_id, conversation_id, preferred_date, preferred_time, status, **source** |
| `blocked_slots` | Days or time slots Ahmed has blocked — date, time_slot (null = full day), reason |
| `push_subscriptions` | Browser push subscriptions — endpoint, p256dh, auth keys |
| **`categories`** | Marketplace categories (8 seeded: café-restaurant, gym, car-service, grocery-store, car-accessories, laundry, travel-agency, industrial-commercial) — admin-editable |
| **`sellers`** | Business sellers, optional `lead_id` FK so visitors-who-want-to-list become sellers when admin promotes them |
| **`listings`** | Marketplace listings — Plan v3 fields + `for_sale`/`for_rent` bools (Project 3 hybrid), `processing_fee_omr` (default 500), `commercial_registration_included`, `stock_value_omr`, **`featured`** + **`featured_rank`** for curated teaser |
| **`inquiries`** | Buyer inquiries on listings — `lead_id`, `listing_id`, message, status, source default `'businesses'` |
| **`admin_users`** | Admin accounts (email, bcrypt password_hash, full_name, role: owner/admin/viewer, active, last_login_at) |
| **`admin_sessions`** | Active admin sessions (opaque token id, admin_user_id, ip, user_agent, expires_at) |
| **`activity_log`** | Append-only audit trail (actor_type: bot/admin/system/visitor, action, target_type, target_id, source, metadata_json, ip, user_agent) |
| **`marketplace_users`** | Visitors who signed up via /businesses/sign-in — email, full_name, password_hash (bcrypt cost-12), phone, country_code, email_verified, access_activated, google_id, lead_id FK, last_login_at |
| **`marketplace_otps`** | 6-digit verification codes for sign-up / sign-in — purpose, expires_at (10-min TTL), attempts (max 5), consumed |
| **`marketplace_sessions`** | Active marketplace user sessions — opaque token id (HttpOnly cookie), user_id FK, ip, user_agent, expires_at (7-day TTL) |

Run migrations on a fresh database: `npm run migrate`
Inspect live schema: `npx tsx scripts/verify-schema.ts` (lists tables, columns, indexes, seed data).

---

## 10. Deployment & Updates

### Branching & Production State (as of 2026-05-13)

- **Active branch:** `section-b-marketplace` — production runs from this branch's HEAD
- **`master`:** has diverged. Phase 6 work has not been merged back yet. Plan: merge once Ahmed approves the marketplace direction.
- **Vercel auto-deploys are disabled** on this project. All production deploys happen via CLI.

### How to deploy changes

```bash
# 1. Make changes locally
# 2. Commit and push to section-b-marketplace (or a fresh feature branch off it)
git add -A
git commit -m "..."
git push

# 3. Preview deploy (requires Vercel login to view)
vercel deploy --yes

# 4. Production deploy (only when JA approves)
vercel deploy --prod --yes
```

### Deploy cadence (2026-05-13)

Production deploys are now per-batch with JA's approval. Two batches shipped on May 12 (Phase D/E unblocked + marketplace polish), one batch on May 13 (marketplace auth + edit listings + collapsible settings). Each commits to `section-b-marketplace`, then a manual `vercel deploy --prod --yes` after build + tests pass.

To check the current production deployment:
```bash
vercel ls | head -5
# or visit https://vercel.com/jalookout7-1526s-projects/gateway-to-oman/deployments
```

### Vercel Cron

`vercel.json` configures a cron job at `/api/cron/reminders` running **daily at 09:00 UTC** (was `*/30 * * * *` before 2026-05-11). Vercel Hobby now enforces once-per-day cron schedules — preview deploys are rejected if the cron is more frequent.

Options to restore the every-30-minute cadence:
- Upgrade to Vercel Pro (~$20/mo) — lifts the cron limit
- Move the reminder cron to an external scheduler (GitHub Actions cron / cron-job.org) hitting the endpoint with `CRON_SECRET`

### How to add a custom domain
1. Vercel Dashboard → Project → Settings → Domains
2. Add domain (e.g., `gatewaytooman.com` or `app.gatewaytooman.com`)
3. Update DNS records at domain registrar (CNAME or A record as Vercel instructs)
4. SSL is automatic

### Running locally
```bash
git clone https://github.com/jalookout7-eng/gateway-to-oman.git
cd gateway-to-oman
npm install
cp .env.example .env    # Fill in your values
npm run dev             # http://localhost:3000
```

---

## 11. Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| AI signal leaking | Partially fixed | Occasionally malformed tags reach the user. Regex in `lib/ai/signals.ts` handles pipe-separated variants. A full pass is still pending. |
| Push notifications iOS | Partial | Works on iOS 16.4+ when app is installed to home screen. Older iOS devices and non-installed Safari do not support Web Push. |
| Email not active until configured | Pending setup | Email env vars (EMAIL_HOST, EMAIL_USER, etc.) must be set in Vercel. Until then, draft emails are created but the Send button will fail. |
| VAPID + CRON_SECRET not yet added | Pending setup | Push notifications and Cron reminders will not work until these are added in Vercel dashboard. Values are in `env-vars-private.md`. |

---

## 12. Planned / In Progress

### Phase 5 — COMPLETE (April 7–8, 2026)
- [x] Context-aware chat modal for all CTAs and opportunity cards
- [x] Consultation booking flow (day + time selection via AI)
- [x] Admin booking calendar with block/unblock
- [x] Push notifications (new lead, booking, meeting reminder)
- [x] PWA manifest + service worker (installable on mobile)
- [x] Email approval workflow with .ics calendar attachment
- [x] Vercel Cron for meeting reminders (every 30 min)
- [x] AI lead summary (auto-generated per lead, expandable in admin)
- [x] Admin dashboard mobile responsiveness (bottom nav, stacked charts, scrollable table)
- [x] Landing page mobile responsiveness (hamburger nav, grid audit)
- [x] Quick fixes: hero uses Sultan Qaboos Mosque photo, chat widget centered on desktop, iOS zoom prevented, duplicate images replaced, admin route hiding

### Post-Phase-5 Fixes (April 8, 2026)
- [x] Hero image replaced — using local `public/hero-muscat.png` (Sultan Qaboos Grand Mosque), overlay reduced to 25% opacity so mosque is clearly visible
- [x] Chat widget (floating AI Assistant) now opens centered on desktop (same pattern as ChatModal) with dark backdrop
- [x] Admin mobile layout — sidebar hidden on mobile, bottom tab navigation shown

### Phase 6 — Marketplace, Layer 3 Schema, Admin Auth (May 10–12, 2026 — IN PROGRESS)

**Section A — Opportunities Routing**
- [x] `components/landing/Opportunities.tsx` carries `{ kind: "subdomain" | "modal" | "comingSoon" }` per card
- [x] "Businesses for Sale" card links live to `/businesses` with a green "Live" badge
- [x] Other 5 cards (Rehab Center, Franchises, Real Estate, Digital Banking, Career Platform) show a "Coming Soon" badge and keep the existing modal behaviour

**Section B — Marketplace Subdomain**
- [x] `/businesses` — BizBuySell-style marketplace (Amazon-adjacent UX) with full-bleed Muscat dusk hero
- [x] "Editor's picks — Highly rated businesses" row showing up to 5 admin-curated featured cards (hidden when filters are active)
- [x] Filter sidebar: category, city, listing type (sale/rent), status, price range — all URL-driven so filters are shareable
- [x] Search bar + sort control (newest / price asc / price desc)
- [x] Listing detail page at `/businesses/listing/[slug]` — 12 fields, inquire block
- [x] 5 sample listings seeded from Ahmed's project descriptions (laundry, travel agency, industrial factory, café, car paint)
- [x] **Paywall access flow** — clicking any card routes to `/businesses/access?listing=[slug]` instead of detail page. Form captures name + email + mobile + message. Submission creates a lead (source=businesses), an inquiry (if listing referred), and an activity_log entry.
- [x] `/businesses/list-your-business` — Coming Soon page with WhatsApp + email CTAs (no more 404)
- [x] Marketplace access fee — default OMR 100, admin-configurable via `/admin/listings` page

**Section C — Database Schema**
- [x] New Turso database under Ahmed's account (see Section 3)
- [x] 7 new tables: `categories`, `sellers`, `listings`, `inquiries`, `admin_users`, `admin_sessions`, `activity_log`
- [x] `source` column added to `conversations`, `leads`, `bookings` (per-vertical attribution)
- [x] **Layer 3 fields on leads** (per meeting-notes directive — present from day one, surfaced gradually):
  `lead_score`, `referrer_name`, `referrer_url`, `qualification_path` (JSON), `chatbot_responses` (JSON), `special_filter_triggered`, `score_breakdown` (JSON), `outcome` (pending/contacted/converted/nurture/rejected), `outcome_updated_at`, `admin_notes`, `session_duration_seconds`, `device_type`
- [x] `featured` + `featured_rank` on listings — admin curates the "highly rated" teaser row
- [x] 8 categories seeded: Café/Restaurant, Gym, Car Service, Grocery Store, Car Accessories, Laundry, Travel Agency, Industrial/Commercial
- [x] 35 schema tests verifying tables, columns, defaults, enums, FK, uniqueness, the for_sale+for_rent hybrid (Project 3 industrial factory pattern). Full suite: 57/57.

**Section D — Admin Authentication (replacement for shared ADMIN_TOKEN)**
- [x] Email + password login backed by `admin_users` (bcryptjs cost-12 hashes)
- [x] Opaque session tokens stored in `admin_sessions`, HttpOnly Secure SameSite=Lax cookie, 7-day TTL
- [x] `requireAuth` accepts both new cookie sessions AND legacy bearer ADMIN_TOKEN (graceful migration — existing pages still work)
- [x] New `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` endpoints
- [x] Show/hide eye toggle on password and admin token fields
- [x] Sidebar footer shows signed-in user (name, email, role)
- [x] First admin seeded: `gatewaytooman@gmail.com` (Ahmed Al Azizi, owner role)
- [x] Login verified end-to-end on production 2026-05-11 (returns user + sets cookie correctly)

**New admin pages**
- [x] `/admin/listings` — marketplace listings table with star toggle (featured), status filter, stats row, inline access-fee editor. **+ New listing** modal, **Edit listing** modal, **More actions** menu (change status / publish toggle / delete with inquiry-guard).
- [x] `/admin/inquiries` — marketplace access requests with one-click outcome changes (pending → contacted → converted | nurture | rejected) **and a one-click "Approve access" CTA** that activates the linked marketplace user, lead contact info, listing context, WhatsApp + email deeplinks
- [x] `/admin/sellers` — manage marketplace sellers (list, add manual seller with optional lead_id link, activate/deactivate, listing counts)
- [x] `/admin/activity` — append-only audit log viewer with actor / source / action filters + pagination
- [x] `/admin/users` — marketplace users (visitors who signed up via /businesses/sign-in) — list, status badges (Activated / Pending / Email verified / Google), Approve / Revoke access actions
- [x] `/admin/settings` refactored — collapsible sections for **Email**, **Chatbot**, and new **Admin users** management (owners can add admins by email+password+role, enable/disable, delete)

**Branding**
- [x] GTO logo (`public/gto-logo.png`) on every header — main Navbar, marketplace header, admin sidebar, admin login form
- [x] Muscat dusk skyline (`public/businesses/hero.jpg`) — full-bleed marketplace hero with navy gradient overlay

### Backlog (not yet scoped)
- [ ] Email template editor in admin settings
- [ ] Lead scoring automation (Stage 03 scoring v1 model — encoded in chatbot, see `delivery/shared/gto-lead-scoring-v1.md`)
- [ ] Analytics tracking (Google Analytics or Vercel Analytics)
- [ ] AI signal leaking — full regex improvement pass

### Phase 7 — Marketplace polish, marketplace auth, admin UX (May 12–13, 2026 — COMPLETE)

**Visitor-facing marketplace**
- [x] `/businesses` rebuilt as a content-rich **landing page** (hero, "what makes us different" 4-card grid, "what you get with subscriber access" panel, 4-step how-it-works, testimonial slot, final CTA). The existing listings grid moved to `/businesses/listings`. Both Browse buttons go there.
- [x] `/businesses/about` — full how-it-works explainer + 6 FAQ entries
- [x] `/businesses/sign-in` — tabbed **Sign in / Sign up** with email OTP
- [x] **Sign-up form**: full name, email, ISO country-code dropdown (250+ countries, flag + dial code), phone, password with live strength meter, confirm password
- [x] **Email OTP** (6-digit, 10-min TTL, 5 attempts) for both sign-up and sign-in via `lib/email/otp.ts`
- [x] **Google OAuth button** visible on both tabs, parked with "being set up" message until credentials provided
- [x] **FilterSidebar** collapsible — top-level panel closed on mobile by default, per-group accordion, active-filter count badge
- [x] **Chat widget hidden** on `/businesses/sign-in` and `/businesses/access` so Omar stays quiet during auth flow
- [x] **Generalized Ahmed → "our team"** across all visitor-facing copy (main landing, businesses pages, chat widgets, Omar system prompt)

**Admin dashboard**
- [x] All admin pages from Section D Phase 6 follow-ups completed: `/admin/sellers`, `/admin/activity`, `/admin/users`
- [x] **/admin/listings** — `+ New listing` and `Edit listing` modals, More-actions menu (change status, publish toggle, delete with inquiry-guard)
- [x] **/admin/settings** — collapsible Email / Chatbot / Admin users sections via shared `CollapsibleSection` component. Admin users management (add admin with email+password+role, enable/disable, delete — owners only)
- [x] **Source filters** on `/admin/leads` and `/admin/conversations` (all / main / businesses)
- [x] **One-click Approve access** on `/admin/inquiries` rows — activates linked marketplace user, sets lead.outcome=converted
- [x] **Mobile bottom nav** trimmed to 5 essentials; desktop sidebar shows all 9 admin pages
- [x] **Tier-aware push notifications** — 🔥 Hot Lead / Warm Lead / New Lead (Cold) in title, with score + segment in body

**Section E — AI backend prep**
- [x] **`AI_BACKEND_MODE`** feature flag in `lib/ai/provider.ts` (`groq-direct | litellm-proxy`). LiteLLM swap is now a config change, not a refactor.
- [x] **Per-vertical prompt resolver** — `getSystemPrompt(source)` returns main-site or businesses-subdomain variant. Backwards-compatible `SYSTEM_PROMPT` retained.
- [x] **Programmatic lead scoring** in `lib/ai/scoring.ts` — 100-point Budget+Timeline+DA+Objective+Mindset model per `gto-lead-scoring-v1.md`. Runs on lead capture, writes `lead_score`, `qualification`, `score_breakdown` JSON.

**Section F — Slack deferred, PWA push covers phone**
- [x] Decision logged: Slack escalation deferred to Phase 2 (team scaling). Mitigation: PWA install on Ahmed's phone gives him direct VAPID push notifications.

**Section I — VPS runbook drafted**
- [x] `delivery/stages/04-build/references/vps-deploy-runbook.md` — server prep, runtime install, app deploy, nginx reverse proxy (main + businesses subdomain), DNS cutover via GoDaddy, TLS via Let's Encrypt, cron migration, validation, rollback. Cutover is now blocked only on GoDaddy access.

### Phase 8 — Marketplace gating, reviewer access, Google sign-in (May 20, 2026 — COMPLETE, awaiting deploy)

Pushed to `section-b-marketplace` (`adb8607` feat + `e3d1a8d` handover). Built, tests 68/68, build clean. JA reviewed live and approved; **deployed to production 2026-05-21** (`gateway-to-oman.vercel.app`, `dpl_GCLQEUAojHaqQNwZyJhz66QeCfCt`). (Poppins font change was considered and declined; Bodoni Moda + Jost kept.) Deploy note: production is CLI-only — run `vercel deploy --prod --cwd <repo>` (running from the wrong directory fails the build).

**Polish (May 21, 2026)**
- [x] Hero trust badges ("150+ Families Guided", "Verified Opportunities", "26 Years Local Expertise") bumped from `text-gray-400` to `text-gray-300` (`components/landing/Hero.tsx`) — they were too dim over the mosque photo; now match the hadith quote for readability.
- [ ] **Known gap (JA, deferred to Omar phasing):** Omar's opening hook is not personalized per surface — homepage and `/businesses` show the same greeting. `getContextualGreeting()` has no `businesses` key and the chat widget doesn't pass the current surface. The system prompt already has a businesses variant; only the visible greeting + surface wiring are missing.

**Marketplace gating (blurred paywall)**
- [x] `/businesses/listings` + `/businesses/listing/[slug]` are now subscriber-only. Non-activated visitors get the grid blurred behind a `PaywallOverlay` (one-time fee + Sign in / Request access). Activated subscribers get the full grid; cards link to detail pages.
- [x] `lib/auth/marketplace-server.ts` — `getCurrentMarketplaceUser()` reads the session cookie in server components. `ListingCard` gained an `unlocked` prop.
- Resolves the long-deferred "blurred view for non-logged-in" + "proper gating ships with Section D auth".

**Admin-managed reviewer access link**
- [x] Regenerable token in the `settings` table (`reviewer_access_token`). Public `GET /api/businesses/reviewer?key=` signs into a lazily-ensured, pre-activated reviewer account (`reviewer@gatewaytooman.com`, no password, no OTP) and lands on the full marketplace.
- [x] Admin card on `/admin/users` (`ReviewerLinkCard`) — view, copy, and **shuffle** the link (rotating revokes old links). Backed by `GET/POST /api/admin/reviewer-link`. Logic in `lib/businesses/reviewer.ts`.

**Google "Continue with Google" OAuth**
- [x] Real flow: `/api/businesses/google/start` (CSRF state cookie → consent) + `/api/businesses/google/callback` (code exchange, id_token decode, `upsertGoogleUser`, session). `lib/auth/google.ts` holds the testable URL builder + decode.
- [x] Graceful fallback notice when `GOOGLE_CLIENT_ID`/`SECRET` are unset. Google authenticates only — access still requires admin approval; Google bypasses OTP (so it is the working signup path while email OTP is on hold).

**Notes**
- No schema migration — `marketplace_users` already had `google_id` + nullable `password_hash`.
- `.vs/` added to `.gitignore`.

### Phase 9 — Intelligence dashboard v1 (May 21, 2026 — built on branch, not yet merged/deployed)

Branch `feat/intelligence-dashboard` (off `section-b-marketplace`). JA-internal `/admin/intelligence`: per-tier precision (converted | engaged), tier re-grading matrix (predicted → effective, auto-from-outcome), score-category calibration, Omar version + changelog, data coverage, hypotheses/learnings CRUD, and a template one-pager export (`/admin/intelligence/one-pager`, print + copy-markdown). New `intelligence_notes` table; `lib/intelligence/*` + `lib/ai/version.ts`; stats + notes API routes. 82 tests pass, build clean. Spec + plan in `docs/superpowers/`. **Deploy prereq:** `npm run migrate` (adds `intelligence_notes` to Turso) before promoting.

### Thread 2 — Planned next (in this order)

Agreed roadmap after Phase 8. Brainstorm-first (design before code) for items 1 and 2.

1. **Intelligence dashboard** — surface the Layer 3 lead data the platform already captures into an owner-facing view Ahmed reviews monthly (justifies the retainer). Candidate metrics: lessons learned, Omar's active prompt version, pending intelligence publishes (per the `intelligence/` workspace), Omar's qualification precision-rate growth, visitor→lead conversion. Ties into the `intelligence/` workspace.
2. **Omar's phasing** — the "new employee" trust model: a phase ladder for how much Omar is allowed to do, what each phase unlocks, guardrails, KB-answer vs customer-service boundary, WhatsApp routing for high-intent visitors, multiple-choice answer options that let Omar silently qualify, and the **per-surface personalized hooks** (homepage vs `/businesses` vs `/businesses/listings`). Reference: chatbot screenshots in the project folder + `GTO_KnowledgeBase_BuyerQualification v2.docx`. Omar's prompt lives in `lib/ai/prompts.ts`.
3. **Meeting-notes audit** — read `delivery/shared/gto-meeting-notes.md` + the blueprint and report any gap between what was promised and what's built / captured.

### Open items (waiting on Ahmed / external)
- [ ] **Google OAuth credentials** — the flow is built (Phase 8); create a Web OAuth client in Google Cloud Console (signed in as `gatewaytooman@gmail.com`), add redirect URI `https://gateway-to-oman.vercel.app/api/businesses/google/callback` (+ `http://localhost:3000/...` for dev; add the official domain later when GoDaddy DNS lands — additive, no recreate), set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env` + Vercel, and publish the consent screen (non-sensitive scopes → no Google review). No GoDaddy/domain ownership required for sign-in to work.
- [ ] **Email provider configuration** — until Resend / SendGrid / SMTP is configured in `/admin/settings`, OTP codes log to Vercel function logs instead of emailing. Required before opening marketplace sign-up to real visitors.
- [ ] **Copy review pass** — JA flagged for review after the 2026-05-13 batch.
- [ ] Section E — Flask + LiteLLM AI backend migration (deferred; one env var flip when ready)
- [ ] Section G — Omar context-awareness body wording (waits on Ahmed's 4 marketplace qualifying questions + 15 KB content stubs)
- [ ] Listing media on Cloudflare (cover image, gallery, video) — waits on Ahmed's Cloudflare account
- [ ] Real WhatsApp number `+968 9510 8257` wired into inquire deeplinks (currently generic `wa.me/?text=...`)
- [ ] Calendly two-way sync with `/admin/calendar` (waits on Ahmed's Calendly API access)
- [ ] DNS — GoDaddy CNAME for `businesses.gatewaytooman.com` (waits on GoDaddy access)
- [ ] Subdomain middleware host-rewrite once DNS is live
- [ ] Section I (last task) — VPS migration to GoDaddy Ubuntu 24.04 with Nginx + Flask + systemd

---

## 13. Client Handoff Options

### Option A: Keep on Your Vercel (Recommended for now)
- Add `gatewaytooman.com` as custom domain on your Vercel project
- Update DNS at domain registrar to point to Vercel
- You continue managing hosting and updates
- Client pays for premium tiers if traffic grows (Vercel Pro, Turso Pro)

### Option B: Transfer Everything to Client
1. **Vercel:** Transfer project (Settings → Transfer)
2. **GitHub:** Transfer repo (Settings → Transfer)
3. **Turso:** Export data, client creates Turso account, import, update env vars
4. **Groq:** Client creates Groq account and API key, update env var
5. Regenerate VAPID keys on new deployment, update env vars
6. Update all Vercel env vars with client credentials

### WordPress Coexistence
- This is a standalone Next.js app — no WordPress dependency
- Options: replace WordPress entirely, or run as subdomain (`app.gatewaytooman.com`)

---

## 14. Support & Maintenance

### Routine Tasks
- **Monitor leads:** Check admin dashboard → Leads page regularly
- **Approve emails:** Check for "Email Pending" badges in leads — review and send draft emails to leads
- **Check calendar:** Admin → Calendar to see upcoming bookings and block dates as needed
- **Configure email:** Set up via Settings page before expecting any outbound emails
- **Enable push notifications:** First login to admin from each device — accept the browser prompt
- **Update admin token:** Change `ADMIN_TOKEN` in Vercel env vars periodically
- **Database backups:** Turso provides automatic backups; manual export via Turso CLI

### If Something Breaks
1. Check Vercel deployment logs (Vercel Dashboard → Deployments → latest → Logs)
2. Check Vercel Functions logs for API errors
3. Verify env vars are set correctly in Vercel (especially VAPID keys, CRON_SECRET)
4. Redeploy if needed (Deployments → Redeploy)
5. If push notifications stop working: re-enable in admin (browser will re-subscribe)

### Cost Breakdown (Current)
| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| Vercel | Hobby (Free) | $0/mo | Daily-cron limit on Hobby restricts reminder cadence to 1×/day |
| Turso | Starter (Free) | $0/mo | Now under Ahmed's account |
| Groq | Free tier | $0/mo | LiteLLM migration (Section E) expected ~$20–30/mo when live |
| GitHub | Free (private repo) | $0/mo | |
| Pexels photos | Free commercial license | $0 | |
| **Total today** | | **$0/mo** | |

### Pending paid services (Phase 6 follow-ups)
| Service | Estimated cost | Pending |
|---------|---------------|---------|
| Cloudflare (listing media) | ~$5/mo | Ahmed credit card |
| LiteLLM provider (Section E) | ~$20–30/mo | Ahmed payment method decision |
| Vercel Pro (optional) | $20/mo | JA decision — restores every-30-min cron + lifts other Hobby limits |
| Calendly (booking sync) | Existing | Ahmed API access |

---

## 11. Status Snapshot — Completed / Pending (2026-05-27)

**Completed & live in production (as of 2026-05-26):**
- Phases 1–8 (landing, marketplace, admin, auth, gating, reviewer link, Google sign-in, hero fix).
- **Phase 9 — Intelligence dashboard** (`/admin/intelligence`) — deployed 2026-05-24.
- **Phase 10 — Omar phasing + KB integration** — deployed 2026-05-24 (see v7.3 note).
- **Reviewer-link 404 fix**, **surface-aware teaser hook**, **Intelligence hidden from admin sidebar** — deployed 2026-05-24.
- **Bundled deploy 2026-05-26** (`dpl_2QZiFwNHWe9JvjDur4AeiyCgyGEG` → https://gateway-to-oman.vercel.app):
  - **Batch 1** — Chat graceful-fallback safeguard (`e729d49`) + **Intelligence v2** (outcome attribution + decoupled Omar precision; `outcome_reason` + `omar_grade_correct` lead columns; attribution-adjusted precision card + loss-reasons panel; per-tier "Sales conversion" relabel; phase advancement off decoupled precision).
  - **Batch 2 — Security audit priorities 1–4:** OTP CSPRNG, `/api/leads` field-leak closed, security headers in `next.config.js`, `LIMIT ?` bind, generic email-test error, timing-safe `CRON_SECRET`; **legacy `ADMIN_TOKEN` retired → cookie-only admin auth** (21 files; `/api/auth` deleted; `validateToken` removed); **owner-only gate** (`requireOwner`) on `/api/admin/intelligence*` + `/api/admin/omar-phase`; **Turso-backed rate limiting** (chat 20/min, login 5/10min, OTP 10/10min/IP + 1/60s/email, access-request 5/10min) + chat input caps (message ≤1000, history ≤20, role-filtered) + access-request 24h dedupe + `leadId` no longer leaked; fail-open everywhere.
  - **Batch 3 — Compliance pages:** `/privacy`, `/terms`, `/cookies` with full final wording (Oman PDPL + GDPR; sub-processors incl. Groq named); footer links on main + `/businesses`; required marketplace sign-up consent checkbox (gates submit); passive consent on `LeadCaptureForm` + `AccessRequestForm`. Four `[bracketed]` company-fact placeholders in `components/legal/CompanyFacts.ts` (legal entity · CR · address · privacy contact) — single edit point.
  - **Batch 4** — **Anthropic Claude (Haiku 4.5) provider** integrated alongside Groq, with **automatic Groq failover** on transient errors (429/5xx/network/Anthropic 529); **lead-column editing** (inline edit `status` / `qualification` / `segment` / `admin_notes` on `/admin/leads` + per-change activity log); **Cloudflare R2 media uploads** (`lib/r2.ts` + `POST/DELETE /api/admin/listings/[id]/media`; cover + gallery + video; admin file pickers in the Edit Listing modal; detail-page render with `object-fit: contain` + blurred backdrop).
- **Migration applied 2026-05-26** (95 statements; IV2 columns + `rate_limits` table added cleanly; everything else `~ Skipped (column exists)`).
- **Security post-deploy:** Turso auth token rolled; Groq API moved from JA's account to Ahmed's `gatewaytooman` account; R2 Access Key + Secret rolled. `assets/env-vars-private.md` annotated "rotated 2026-05-26 — current values in Vercel".
- **Tests pre-deploy:** 177/177 passing; clean build (62 routes; `/privacy`, `/terms`, `/cookies` static; new `/api/admin/leads/[id]` + `/api/admin/listings/[id]/media` routes present).

**Active configuration note (2026-05-27):** AI runs on **Anthropic Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) as primary, with **Groq Llama 3.3 70B** as automatic failover on transient errors. Verified working end-to-end: live chatbot replies + `/admin/leads` AI summary regenerate both confirmed on Anthropic. The earlier `AI_PROVIDER=groq` temp override is removed; `ANTHROPIC_API_KEY` is now correctly set in Vercel Production scope.

**🐛 Bug fixes — Batch 5 BUILT + DEPLOYED + MIGRATED 2026-05-27 (`dpl_FviU24MZZzmyV4qo7GNant57ABGj` → https://gateway-to-oman.vercel.app):**
1. ✅ **R2 image rendering** — added `toPublicUrl()` defensive read-time rewriter in `lib/r2.ts` that converts any stored `r2.cloudflarestorage.com` endpoint URL to the configured `R2_PUBLIC_BASE_URL` (so rows saved before the env var was set still render). Applied in `lib/businesses/queries.ts:rowToListing` and `app/api/admin/listings/[id]/media/route.ts:getMediaState` (covers public + admin reads + live preview after upload). `next.config.js` already lists `*.r2.dev`.
2. ✅ **AI summary identity + markdown** — `summarize/route.ts` migrated to `lib/ai/provider.ts:chat()` (so it now follows the Anthropic-primary → Groq-failover path). Prompt rewritten: removes the literal "Ahmed Al-Azizi" reference (root cause of the audience-confused-for-subject hallucination), labels transcript lines as `VISITOR (lead)` vs `OMAR (bot)`, forbids markdown explicitly, instructs to write `"Name not captured in conversation"` if absent. Added defensive server-side `stripMarkdown()` post-process for `**WHO:**` etc. as belt-and-braces. Confirmed working on live Anthropic Haiku 4.5.
3. ✅ **Admin-editable status / qualification / segment** — new `lead_options` lookup table (kind, slug, label, color, sort_order, active) seeded with current enum values. `leads.status`/`.qualification`/`.segment` CHECK constraints dropped via one-shot rebuild script (`scripts/migrate-lead-options.ts` — idempotent, inspects `sqlite_master` and only rebuilds if needed; uses `client.batch()` for atomic libsql-HTTP-safe transaction; hardcoded DDL after PRAGMA introspection proved unreliable on Turso; PRAGMA `foreign_keys=OFF` around the rebuild to allow DROP TABLE while child tables reference `leads.id`). New CRUD: `GET/POST /api/admin/lead-options` + `PATCH/DELETE /api/admin/lead-options/[kind]/[slug]`. New admin UI: **Settings → Lead options** (CRUD with label / colour / sort / active toggle). Leads page dropdowns + filters now read from the API. Validation on `PATCH /api/admin/leads/[id]` swapped from hardcoded allowlist to DB lookup. **Rebuild applied:** 2 leads copied, 6 indexes recreated, FK check clean.
4. ✅ **Mobile admin logout** — added a mobile-only top bar (`md:hidden`) to `app/admin/layout.tsx` with the GTO logo, signed-in user name, and a Sign-out button — symmetric with the desktop sidebar's footer.
5. ✅ **All 14 of JA's review notes addressed (2026-05-28, Batches 7a/7b/7c).** Quick fixes (lead-summary name, R2 trim, status badge, email-test, country-code, apostrophes, domain text); Omar voice + WhatsApp + Calendly direct + profile menu + 5-variant hook A/B; lead capture redesign with pre-capture opt-in + post-capture keep-chat + HOT-lead CTAs + lead_notes timeline (admin manual + Omar AI auto). See v7.17 changelog and per-batch commit messages. **Deploy:** `npm run migrate` to add `conversations.hook_variant_id` and `lead_notes` table → `vercel deploy --prod` → no schema-rebuild script required.

**Other completions 2026-05-27:**
- **Anthropic Claude flip live** — payment method added; `ANTHROPIC_API_KEY` set in Vercel; `AI_PROVIDER=groq` override removed (after a hiccup where the var was missing on first deploy attempt — error `ANTHROPIC_API_KEY must be set when AI_PROVIDER=anthropic` surfaced in Vercel logs, then resolved on re-add). Anthropic billing usage confirmed ticking up.
- **Resend (transactional email) — domain verified.** `gatewaytooman.com` verified in Resend (Tokyo region `ap-northeast-1`). DNS records added in GoDaddy: DKIM TXT (`resend._domainkey`), SPF TXT (`send`), MX (`send` → `feedback-smtp.ap-northeast-1.amazonses.com`). DMARC TXT (`_dmarc`) added with `v=DMARC1; p=none; rua=mailto:gatewaytooman@gmail.com` (multi-record duplicate cleaned up; mxtoolbox now clean except informational policy/external-validation warnings which are expected for `p=none` + Gmail-rua). Receiving NOT enabled (we only send). API key (`gateway-to-oman-prod`, Sending access scope) saved to `assets/env-vars-private.md`. **Pending:** configure in `/admin/settings → Email configuration` + send a test → then OTP email goes live for marketplace sign-up.

**Pending / open (priority order):**

1. **Resend admin-side configuration + test send** — paste the `re_…` key into `/admin/settings → Email configuration`, set From `noreply@gatewaytooman.com`, click Save, send test to `jalookout7@gmail.com`. When the test lands, OTP email is live. (~5 min.)
2. ✅ **`lib/email/sender.ts:sendEmail()` refactored to use the settings-DB provider path (2026-05-28).** Previously read raw `EMAIL_*` env vars; now loads provider config from the `settings` table (same source as `sendOtpEmail()`) and routes to Resend / SendGrid / SMTP transparently. Booking confirmations + the "Send" button on admin-approved lead emails now flow through the configured provider. Public `sendEmail({to, subject, html, attachments?})` signature unchanged so `/api/admin/emails/[id]/send` continues to work without modification. `sendEmailLegacy()` kept as-is for `/api/email/test` + `/api/email/send` backward compat. 177/177 tests pass.
3. **Production domain — point `gatewaytooman.com` to Vercel via GoDaddy DNS.** Domain currently still points at the old developer's cPanel host (`68.178.145.111`). Vercel side already has the domain claimed (the deploy logs show `Aliased: https://www.gatewaytooman.com`) — only GoDaddy records left to switch.
   - **Keep unchanged:** Resend records (`resend._domainkey`, `send` TXT + MX, `_dmarc`), GoDaddy NS records (ns07/ns08), SOA, `_domainconnect` CNAME.
   - **Replace:** `A @ 68.178.145.111` → `A @ 76.76.21.21`; `CNAME www @` → `CNAME www cname.vercel-dns.com` — TTL 1 hour on both.
   - **Delete (cPanel cruft):** `A admin`, `CNAME cpanel`, `CNAME webdisk`, `CNAME webdisk.admin`, `CNAME whm`, `CNAME www.admin`. **Verify before deleting `A mail`** — confirm with Ahmed whether anyone uses `@gatewaytooman.com` email (if yes, identify mail service and keep/replace MX records accordingly).
   - **Validate after:** dnschecker.org should show A = `76.76.21.21` globally within 5–15 min; Vercel Domains row flips to ✅ Valid; SSL auto-provisions; `https://gatewaytooman.com` in incognito serves GTO landing.
4. **Google OAuth credentials** — do AFTER DNS lands so the OAuth redirect URI registers against `gatewaytooman.com` (the canonical domain) directly. Create Google Cloud project → OAuth consent screen (External) → OAuth client ID (Web) with redirect URI `https://gatewaytooman.com/api/businesses/google/callback`. Paste `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` into Vercel and redeploy. Until done, the "Continue with Google" button on `/businesses/sign-in` shows a friendly "not configured" notice.
5. **Click-test Batch 5 on the production domain** — once DNS lands: (a) Settings → Lead options → add a custom status like `needs-followup` → assign on `/admin/leads` → confirm it sticks; (b) re-upload a listing image + verify it renders on the public detail page; (c) sign out / sign in on mobile to test the new top-bar logout.
6. **Compliance company-fact fill-ins** — `components/legal/CompanyFacts.ts` has 4 `[bracketed]` placeholders pending from Ahmed (legal entity name · CR number · Oman address · privacy contact email).
7. **Compliance — Ahmed + lawyer review** before relying on `/privacy`, `/terms`, `/cookies`. Pages carry final-form wording but need Ahmed for business-accuracy AND a qualified Oman PDPL + GDPR lawyer for legal conformance. Treat as draft for compliance purposes until that review lands.
8. **DMARC tightening (next 2–4 weeks)** — once we see DMARC aggregate reports landing in `gatewaytooman@gmail.com` and nothing legitimate is being marked failing, tighten `p=none` → `p=quarantine` → `p=reject` in steps. Don't rush.
9. **Push notifications / VAPID env vars verify** — the variable list visible in the Vercel screenshots didn't include `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`. Need to confirm those are still present (might just be off-screen — scroll the page in Vercel). If any missing, push notifications + the cron-reminders job will silently fail.
10. **Dead env var cleanup** — `ADMIN_TOKEN` is still set in Vercel but the code has fully retired it (Batch 2). Safe to delete; cosmetic.
11. **Payment-method documentation** — `assets/gto-payments-tracker.csv` shipped (workspace level, not git-tracked). To upload to Drive + share with Ahmed when convenient. Anthropic + Resend now live, Vercel still free tier, R2 + Turso still free tier, Groq pay-as-you-go (failover only).
12. **Remaining security items (lower priority):**
   - ✅ **L-1 SameSite=Strict admin cookie (2026-05-28)** — `lib/auth/sessions.ts:cookieOptions()` now returns `sameSite: "strict"` for the admin session cookie. Marketplace + OAuth state cookies remain `lax` (different file paths) because they DO need to survive top-level navigation from emails / OAuth callbacks. Trade-off: clicking a `/admin/...` link from Gmail or an external referrer won't carry the session — user has to re-sign-in. Acceptable for admin (no legitimate external-link flow).
   - ✅ **L-5 mask email creds in admin UI (2026-05-28)** — Resend + SendGrid API key inputs in `/admin/settings → Email configuration` now use `type="password"` (browser-rendered dots) with `autoComplete="off"`. SMTP password was already `type="password"`. Anyone shoulder-surfing the admin won't read the keys off-screen.
   - ✅ **I-4 cover_image_url validation — verified already safe by design (2026-05-28).** Code review confirmed no API route accepts a user-supplied `cover_image_url`: it's only set via the R2 upload pipeline at `/api/admin/listings/[id]/media`, which constructs the URL server-side from `R2_PUBLIC_BASE_URL + key`. Cross-checked all `cover_image_url` mentions in the admin and public listing routes — no user-input pathway exists. Defense-in-depth still applies via `next.config.js` `remotePatterns` (only `*.r2.dev`, `*.r2.cloudflarestorage.com`, `images.pexels.com` allowed).
   - ⏭ **M-2 Google `id_token` signature/claims verification (deferred until OAuth setup).** Requires adding `jose` (or `google-auth-library`) for JWKS-based verification of `iss` / `aud` / `exp` / signature. Token comes directly from Google's token endpoint over HTTPS, so tampering in transit is impossible — this is defense-in-depth hardening rather than a live exploit closure. Will be addressed alongside the Google OAuth go-live step (pending §11.4).
   - ⏭ `npm audit fix` — dev-only vulnerabilities (vitest transitive deps). Run separately when convenient — no production exposure.
13. **DNS migration GoDaddy → Cloudflare** (optional polish) — to swap the R2.dev subdomain (`pub-…r2.dev`) for `media.gatewaytooman.com`. Single env var change + uncomment a `next.config.js` line after DNS lands.
14. **Multiple-choice / quick-reply answer UI** (Omar "piece F") — deferred to its own spec/plan.
15. **Other brain-dump fixes still open:** sign-up phone country-code field width; booking calendar mobile + Calendly sync; security stress-test + scaling to ~1000 concurrent; confirm AI lead summary on click. (Poppins font change — declined.)
16. **Meeting-notes audit** (Thread 2 item 3) — not started.
17. **Repo hygiene:** `master` is now ~80 commits behind `section-b-marketplace`; production deploys from `section-b`, so this is cosmetic.

## 12. Compliance & Privacy Requirements

**✅ DESIGN APPROVED 2026-05-26 — build pending (Batch 3).** Scope locked to the "standard set" (full design below). Wording will be **complete and final-form** (no DRAFT watermark) — JA / Ahmed / lawyer will run final review. Only company-specific facts are left as `[bracketed]` fill-ins.

### Approved scope (build target)
**Three new top-level pages** (shared clean legal-page styling, each carrying an effective date):
- **`/privacy` — Privacy Policy** — controller identity; what data we collect (names, emails, phones, messages, chat transcripts, lead/marketplace data, IP); how & why (consent / contract / legitimate interest); **sub-processors named**: Vercel (hosting), Turso (database, Tokyo region), **Groq (AI — receives chat content)**, Google (OAuth), email provider; honest "the team can see what you submit" disclosure; international transfers; retention; security (bcrypt, HttpOnly cookies, HTTPS); **rights** under **Oman PDPL + GDPR** (access / correction / deletion / objection / withdraw consent / complain); contact for rights requests; children; cookies link; changes; contact.
- **`/terms` — Terms of Service** — acceptance; service description; eligibility; accounts; acceptable use; **marketplace disclaimer** (GTO facilitates, isn't party to sales, buyer due diligence, access-fee terms); **AI chatbot disclaimer** (general info, not professional advice); IP; liability limits; indemnity; **governing law = Oman**; changes; contact.
- **`/cookies` — Cookie Notice** — strictly-necessary session cookies only (admin session, marketplace session, OAuth state); what each does; no banner needed today; browser-controls + disabling breaks login; statement that a banner will be added if analytics/marketing cookies are introduced later.

**Wiring:**
- **Footer links** (Privacy · Terms · Cookies) on the main site AND `/businesses`.
- **Required consent checkbox** on the marketplace **sign-up** form (unticked by default; links Privacy + Terms; submit blocked until checked).
- **Passive consent line** ("By submitting, you agree to our Privacy Policy and Terms.") on the lead-capture, access-request, and contact forms.
- **Data-rights path:** stated contact email in the Privacy Policy (minimum PDPL/GDPR requirement) — no automated tooling.

### Out of scope this pass (intentional — revisit when triggers appear)
- **Cookie consent banner** — only needed if non-essential cookies (analytics/marketing) are introduced; current cookies are strictly necessary.
- **Marketing-consent + unsubscribe wiring** — only needed when the cold-lead newsletter goes live.

### Fill-ins needed from Ahmed / JA (for finished, non-bracketed copy)
1. **Legal entity name** (e.g. "Al Azizi Group LLC" — exact registered form)
2. **Commercial Registration (CR) number**
3. **Registered Oman address**
4. **Official privacy/legal contact email** (use `gatewaytooman@gmail.com` or a dedicated alias?)

If not supplied at build time, those exact spots get clear `[bracketed]` placeholders for the lawyer/client to drop in; everything else is final-form.

### Reference (still applies — moved below the design)


**Password assurance (already true in code):** marketplace passwords are **bcrypt-hashed (cost 12)**; plaintext is never stored. No one — admins or anyone with a DB dump — can read or recover a password; the system only verifies a login. Google sign-in users have no password at all.

**Honest data-access position:** as the platform operator you (and admins) **can** see everything users submit — names, emails, phones, marketplace inquiries, lead scores, and full chat transcripts (DB in Ahmed's Turso account). The only unreadable item is passwords. Also disclose two external data flows: **chat content is sent to Groq (AI)** to generate replies, and **Google OAuth** shares basic profile on sign-in. The compliant posture is transparency, not "we can't see anything."

**Pages to add:** Privacy Policy · Terms of Service · Cookie Notice (footer-linked).
**Mechanisms to add:** sign-up **consent checkbox** (unticked, linking Privacy + Terms); **cookie consent banner** *only if* non-essential cookies are added (current cookies are session-only = "strictly necessary" → disclose, no opt-in needed yet); a **data-rights path** (access/correction/deletion, email at minimum); **email marketing consent + unsubscribe** (the cold-lead newsletter needs both).
**Laws in scope:** **Oman PDPL** (Royal Decree 6/2022, in force Feb 2025) — primary, GTO is Oman-based; **GDPR / UK GDPR** — the audience is international.
**Sub-processors to name in the policy:** Vercel (hosting), Turso (database), the email provider, **Groq (AI — receives chat content)**, Google (OAuth).
**Security to advertise:** HTTPS everywhere (Vercel), bcrypt passwords, HttpOnly expiring session cookies, access-controlled admin, DB in the client's own Turso account.
⚠️ **Not legal advice** — the policy *wording* (to satisfy Oman PDPL **and** GDPR together) should be reviewed by a qualified privacy lawyer. JA can scaffold the pages + consent UI + cookie banner as a small sub-project.

## 13. Infrastructure & Model — Current Direction (2026-05-24)

**Hosting — leaning to STAY ON VERCEL for now.** Reasons: managed Next.js (Vercel builds Next.js), global CDN, auto-HTTPS, instant rollbacks, zero server maintenance — vs. a GoDaddy VPS, which means self-managing OS/Node/nginx/SSL/PM2/CI/monitoring for marginal benefit at current traffic. The **domain stays registered at GoDaddy** with DNS pointed at Vercel (a VPS is not required to use `gatewaytooman.com`). Recommended: upgrade **Hobby → Vercel Pro ($20/mo)** — Hobby is technically non-commercial, and Pro lifts the cron/timeout limits. Revisit a VPS only if cost-at-scale, always-on background workers, or a data-residency requirement appears.

> **VPS migration — full decision summary, trade-offs & risk assessment (2026-05-25):** see `delivery/stages/04-build/references/vps-deploy-runbook.md` → "Decision Summary, Trade-offs & Risk Assessment". Key takeaways: it's a **low-code, high-ops** move — the Next.js app is portable and **Turso (DB) is cloud-hosted so there's zero data-migration risk**; current notes mentioning "Flask" are wrong (the stack is pure Next.js today — Flask only applies if LiteLLM/Section E later ships). Biggest break risk is the **`businesses.` subdomain nginx rewrite** (avoidable by keeping `/businesses` as a path). Other costs: single point of failure, no one-click rollback, you own all security/OS ops. **Recommendation stands: Vercel + Pro now; VPS only on a concrete trigger** (cost-at-scale, always-on workers like the LiteLLM proxy, or a data-residency requirement) — and even then, a small VPS for *just* the LiteLLM proxy with the app staying on Vercel is usually the cleaner split.

**Chatbot model — leaning to the EASIEST path: upgrade the model** (cost is the open concern). Current = Groq Llama 3.1 8B (fast but weak reasoning). Candidates:
- **Groq Llama 3.3 70B** — cheap + fast, big quality jump, ~1-line change in `lib/ai/provider.ts` + Groq paid dev tier. Lowest cost.
- **Claude Haiku 4.5** — stronger reasoning + instruction-following at low cost (good balance for Omar's elaborate persona). JA flagged Haiku as a strong option.
Swap happens in the single integration point `lib/ai/provider.ts`. **LiteLLM** (a proxy giving one interface to many providers + fallbacks + cost tracking) is **deferred** until multi-provider routing is actually needed — it would run off-Vercel (Railway/Render/Fly or LiteLLM cloud) and slot in behind `provider.ts` with no app churn.

## 14. Security Audit (first-pass, 2026-05-24)

Internal first-pass audit (not a professional pentest). **Full findings + remediation order:** `delivery/shared/gto-security-audit-2026-05-24.md`.

**Counts:** `npm audit` = 9 (4 moderate, 5 high) — **all DEV-only** (vitest → vite/ws; not in the prod bundle; clear with `npm audit fix`, *not* `--force`). Code review = **5 High, 6 Medium**, plus Low/Informational.

**✅ STATUS (2026-05-25 — fixed in the bundled section-b deploy, awaiting `npm run migrate` + deploy):** priorities 1–4 below are DONE. Remaining: #5 (Google id_token — OAuth not live yet), `npm audit fix` (dev-only; run separately), and hygiene #6/#7.

**Top priorities (in order):**
1. ✅ **Quick 1–2 line fixes:** OTP → `crypto.randomInt`; `/api/leads` → `RETURNING id`; security headers in `next.config.js` (CSP intentionally deferred); `timingSafeEqual` for `CRON_SECRET`. *(`npm audit fix` deferred — dev-only vulns; run separately to avoid lockfile churn in this deploy.)*
2. ✅ **Owner-only role gate** — `requireOwner()` on `/api/admin/intelligence*` + `/api/admin/omar-phase` (all methods); intelligence page shows a clean owner-only message on 403.
3. ✅ **Rate limiting** — Turso-backed (`rate_limits` table + `lib/rate-limit.ts`, fail-open): chat 20/min, login 5/10min, OTP 10/10min/IP + 1/60s/email, access-request 5/10min; + chat input caps (message ≤1000, history ≤20 role-filtered) + access-request 24h dedupe & no `leadId` leak.
4. ✅ **Retired the shared `ADMIN_TOKEN` + `localStorage` auth** → admin auth is cookie-session **only** (`requireAuth` cookie-only; `validateToken` + `/api/auth` removed; 21 admin files moved to `credentials:"include"`). *(Supersedes the old "intelligence soft-hide" gap — now a hard owner gate.)*
5. ⬜ Verify Google `id_token` claims/signature (M-2) — Google OAuth not live yet (needs credentials), so lower urgency.
6. ⬜ Hygiene: Turso token scoping/rotation + a gitleaks pre-commit hook; mask email creds in the admin UI (L-5); SameSite-strict admin cookie (L-1); `cover_image_url` validation (I-4).
7. ⬜ Before scale: professional pentest + load test (the ~1000-concurrent goal).

**Already solid:** bcrypt (cost 12), parameterized SQL, 32-byte session tokens, timing-safe reviewer token, HttpOnly+Secure cookies, OTP attempt cap, `requireAuth` on every admin route, `.env` git-ignored and not committed.

---

**Document Version:** 7.17
**Last Updated:** May 28, 2026

*v7.17 — Final handover pass — Batch 7a/7b/7c (2026-05-28). JA's 14 review notes closed across three sub-batches.*

*v7.17 / Batch 7a — Quick fixes (notes 1,2,7,9,10,11,13): lead summary now injects lead.name/email/phone/segment/interests as KNOWN FACTS into the system prompt (fixes "Name not captured" when name came from the form, not the chat); R2 toPublicUrl + uploadToR2 .trim() everywhere (defends against the trailing-space-in-env-var footgun that caused `pub-...r2.dev%20` rendering); ListingCard status badge gets z-index + category-badge truncation so they don't overlap on narrow viewports; /api/email/test refactored to use the settings DB (fixes "Email not configured" after Resend save); sign-up country-code dropdown narrowed to w-[96px] sm:w-[112px] with min-w-0 on the phone input; 12 `&apos;` HTML entities in JS string literals replaced with real apostrophes (only the JS string ones — JSX text/attribute uses kept since React decodes those); domain text references `businesses.gatewaytooman.com` → `gatewaytooman.com/businesses` everywhere.*

*v7.17 / Batch 7b — Omar voice + UI (notes 3,4,5,12): BASE_PROMPT brevity rule strengthened (1-3 sentences cap; AT MOST one ≤10-word filler sentence; concrete BAD/GOOD examples; matches JA's flagged Haiku verbosity). Floating buttons reshaped — Omar button now icon-only 56x56 (MessageCircle); new WhatsAppFloatingButton (#25D366) immediately left of Omar's button, links to wa.me/96895108257, mounted globally in app/layout.tsx (hidden on /admin + auth pages). Hook A/B testing — 5 teaser variants per surface; pickTeaserVariant() picks one randomly on widget mount; variant ID (e.g. "businesses-3") persisted to new conversations.hook_variant_id column for later conversion analysis. Calendly direct — Hero + ContactCTA + marketplace landing "Book a free consultation" CTA now link straight to calendly.com/alazizi/30min (no more opening Omar). Marketplace user profile — BusinessesHeader server-renders signed-in chip with ProfileMenu dropdown (name/email/access status + Sign out); new /api/businesses/sign-out endpoint.*

*v7.17 / Batch 7c — Lead capture redesign + notes timeline (notes 5,6,14): ChatWidget state machine rewritten. Pre-capture opt-in — instead of the surprise modal pop, Omar emits a `[CAPTURE_READY]` signal and the widget renders an in-chat prompt with [Yes, share my details] / [Not yet] buttons. "Not yet" → conversation continues without badgering. Post-capture continue option — after form submit, [Keep chatting] / [Close] choice; keep-chat capped at 7 additional exchanges. HOT lead inline CTAs — during keep-chat, `[HIGH_INTENT]` shows [Book consultation] (Calendly) + [WhatsApp Ahmed] inline buttons. Notes timeline — new lead_notes table (id, lead_id, author_type, author_id, author_name, body, created_at), GET/POST /api/admin/leads/[id]/notes, new POST /api/chat/event endpoint that Omar AI auto-writes to on whatsapp_click/calendly_click/keep_chat_started/keep_chat_ended events. New LeadNotesTimeline component shown in admin lead-detail panel below Admin Notes and above the conversation transcript, listing chronological entries with author + timestamp + body, plus an inline form for manual admin entries. 177/177 tests pass; clean production build (new routes /api/admin/leads/[id]/notes, /api/chat/event, /api/businesses/sign-out compiled).*

*v7.16 — Batch 6 internal hardening (2026-05-28). Four §11 items closed before JA's next-batch fixes notes land: (1) §11.2 — `lib/email/sender.ts:sendEmail()` refactored from raw `EMAIL_*` env vars to the settings-DB provider path; booking confirmations and admin-approved lead/follow-up emails now route through whichever provider is configured in `/admin/settings → Email configuration` (Resend, SendGrid, or SMTP). Public signature `sendEmail({to, subject, html, attachments?})` unchanged so existing callsites work without modification. `sendEmailLegacy()` kept as-is for `/api/email/test` + `/api/email/send` backward compat. (2) Security L-1 — admin session cookie now uses `SameSite=Strict` (`lib/auth/sessions.ts:cookieOptions()`); marketplace + OAuth state cookies remain `Lax`. (3) Security L-5 — Resend + SendGrid API key inputs in `/admin/settings` now `type="password"`. (4) Security I-4 verified already safe — `cover_image_url` only set via R2 upload pipeline, no user-input path. M-2 (Google `id_token` signature verify) deferred to OAuth go-live step. 177/177 tests pass. Clean build.*

*v7.15 — Production hardening day 2026-05-27. Five major milestones in one session: (1) Batch 5 fully DEPLOYED + MIGRATED (`dpl_FviU24MZZzmyV4qo7GNant57ABGj`) — R2 image rewriter, AI summary identity/markdown fix, mobile admin logout, admin-editable lead options with `lead_options` table + CHECK-constraint removal (rebuild script uses libsql `client.batch()` after BEGIN/COMMIT proved broken in libsql HTTP mode; FK enforcement suspended around DROP TABLE; hardcoded DDL after PRAGMA introspection returned literal "None" for some defaults; idempotency check via `sqlite_master`). 2 lead rows preserved, 6 indexes recreated, FK check clean. (2) Anthropic Claude Haiku 4.5 flip LIVE — payment method added, `ANTHROPIC_API_KEY` set in Vercel Production (after a first-attempt hiccup where the var was missing → error surfaced in logs → re-added correctly), `AI_PROVIDER=groq` override removed; verified live chatbot + AI summary regenerate both running on Anthropic. (3) Resend transactional email domain VERIFIED for `gatewaytooman.com` (Tokyo `ap-northeast-1`); DKIM TXT + SPF TXT + MX added in GoDaddy; DMARC TXT added at `_dmarc` (`p=none; rua=mailto:gatewaytooman@gmail.com`); receiving intentionally off; API key (`re_WhV...`) saved to `env-vars-private.md`. (4) DMARC duplicate cleaned up (mxtoolbox now clean except `p=none` informational warnings, which are intentional). (5) Payment tracker shipped (`assets/gto-payments-tracker.csv` + README). **Next-up:** Resend `/admin/settings` admin-side configuration + test send; then DNS pointer (gatewaytooman.com still points at the old developer's cPanel host at 68.178.145.111 — full surgical DNS plan documented in §11 awaiting Ahmed's confirmation on whether `mail.gatewaytooman.com` is in use); then Google OAuth (after DNS lands so redirect URI registers on the canonical domain).*

*v7.14 — Batch 5 BUILT (post-deploy bug fixes). Four bugs from §11 fixed on `section-b-marketplace`: (1) R2 image rendering — defensive `toPublicUrl()` rewriter in `lib/r2.ts` applied in all listing read paths, so endpoint URLs saved before `R2_PUBLIC_BASE_URL` was set still render; (2) AI summary — `app/api/admin/leads/[id]/summarize/route.ts` migrated to `lib/ai/provider.ts:chat()` (Anthropic-primary path), prompt rewritten to remove "Ahmed Al-Azizi" naming + forbid markdown + label transcript sides clearly, defensive `stripMarkdown()` post-process; (3) admin-editable enums — new `lead_options` lookup table + seed in `schema.sql`, idempotent one-shot rebuild script `scripts/migrate-lead-options.ts` for CHECK-constraint removal (inspects `sqlite_master`, skips if already done), `/api/admin/lead-options` CRUD endpoints, `LeadOptionsSection` in `/admin/settings`, leads page dropdowns + filters now read from API; (4) mobile admin logout — new `md:hidden` top bar in `app/admin/layout.tsx` with identity + sign-out, symmetric with desktop sidebar. 177/177 tests pass; one schema-comment `;` typo found + fixed during testing. **Deploy order:** `npm run migrate` → `npm run migrate:lead-options` → `vercel deploy --prod`. Anthropic flip still pending payment-method confirmation from Ahmed's card — once `ANTHROPIC_API_KEY` is added + `AI_PROVIDER=groq` temp override removed, the AI summary route automatically uses Haiku 4.5.*

*v7.13 — Cookie Notice tidy + two pending items logged. Removed the internal `gto_admin_session` row from the public `/cookies` table (admin staff aren't the audience of the public notice); spec doc updated to match. Added §11 pending items: (1) point `gatewaytooman.com` (+ www) to Vercel via GoDaddy DNS — site currently only reachable at the `vercel.app` URL; (2) Ahmed + qualified privacy lawyer must review `/privacy`, `/terms`, `/cookies` for business-accuracy and Oman PDPL + GDPR conformance before considering them final (treat as draft for compliance purposes until that review lands).*

*v7.12 — BUNDLED DEPLOY 2026-05-26 LIVE (`dpl_2QZiFwNHWe9JvjDur4AeiyCgyGEG`). Batches 1+2+3+4 all shipped to https://gateway-to-oman.vercel.app: Intelligence v2, security audit priorities 1–4 (cookie-only admin auth + owner gate + Turso rate limiting + quick wins), compliance pages (`/privacy`, `/terms`, `/cookies` + consent), Anthropic Claude provider with Groq failover, lead-column editing, R2 media uploads. Migration applied cleanly (IV2 columns + `rate_limits` table). Security hygiene post-deploy: Turso token rolled, Groq moved to Ahmed's account, R2 Access Key + Secret rolled. **Currently running on Groq Llama 3.3 70B** (`AI_PROVIDER=groq` Vercel temp) until Ahmed/JA set up Anthropic account + `ANTHROPIC_API_KEY` — then auto-flips to Haiku 4.5 primary. **5 known issues found post-deploy** for Batch 5 (see §11): R2 image rendering broken on frontend; AI summary markdown + owner-identity leak; admin-editable status/segment enums needed; mobile admin logout missing; more TBD. **Source for §11 bug visuals:** `Cloudflare err.png` + `Leads section - admin.png` in client root.*

*v7.11 — Compliance Batch 3 BUILT on `section-b-marketplace` (2026-05-26). Shipped: `/privacy`, `/terms`, `/cookies` (full wording, no DRAFT watermark, all three static `○` routes); `components/legal/CompanyFacts.ts` (single source for company-fact fill-ins); `components/legal/LegalLayout.tsx` (shared wrapper); footer Legal links on main site (new `components/landing/Footer.tsx`) + `/businesses` layout; required sign-up consent checkbox on `/businesses/sign-in`; passive consent lines on `LeadCaptureForm` + `AccessRequestForm`; 11 new consent compliance tests (138 total pass). No DB/migration required for compliance pages specifically. Four `[bracketed]` fill-ins still pending from Ahmed — all in `CompanyFacts.ts`. Bundles onto the existing `section-b-marketplace` pending deploy. Deploy order unchanged: `npm run migrate` before `vercel deploy --prod`.*

*v7.9 — Security batch BUILT (audit §14 priorities 1–4). On `section-b-marketplace`, bundled with Batch 1 (IV2 + chat fallback) into ONE deploy: quick wins (OTP CSPRNG, `/api/leads` RETURNING id, security headers, timing-safe CRON_SECRET, LIMIT bind, generic email-test error); **legacy ADMIN_TOKEN retired → cookie-only admin auth** (`requireAuth` cookie-only, `validateToken` + `/api/auth` removed, 21 files to `credentials:"include"`); **owner-only gate** (`requireOwner`) on intelligence + omar-phase; **Turso-backed rate limiting** + chat input caps + access-request dedupe (fail-open). 127/127 tests pass; clean build; final security review APPROVED — READY TO SHIP. ⚠️ Deploy: `npm run migrate` FIRST (creates IV2 columns + `rate_limits` table), THEN `vercel deploy --prod`; then **click-test the admin** (auth changed). Remaining audit items: M-2 Google id_token (OAuth not live), `npm audit fix` (dev-only), L/I hygiene.*

*v7.8 — Intelligence v2 BUILT (was designed in v7.6). Outcome attribution + decoupled Omar precision implemented subagent-driven on `feat/intelligence-v2` and merged to `section-b-marketplace`: two nullable `leads` columns (`outcome_reason`, `omar_grade_correct`), `omarVerdict()` (correct/wrong/excluded — non-Omar losses excluded from precision), attribution-adjusted precision + loss-reason queries, attribution-aware re-grading matrix, decoupled phase advancement, admin inquiries capture UI, dashboard precision card + loss-reasons panel (+ old per-tier precision relabeled "Sales conversion"). 124/124 tests pass, clean build, final review APPROVED. Bundled with the chat graceful-fallback (`e729d49`) as Batch 1 — NOT yet deployed. **Deploy = `npm run migrate` FIRST, then `vercel deploy --prod` (new code reads the new columns).***

*v7.7 — VPS migration decision captured for later. Expanded `vps-deploy-runbook.md` with a "Decision Summary, Trade-offs & Risk Assessment" section (the runbook previously had only the procedural how, not the should-we) and added a pointer + key-takeaways block to §13. Conclusion unchanged: low-code/high-ops move, zero DB-migration risk (Turso is cloud-hosted), "Flask" in older notes is inaccurate (pure Next.js today), biggest break risk is the `businesses.` subdomain nginx rewrite; recommendation = stay on Vercel + Pro, move to VPS only on a concrete trigger.*

*v7.6 — Intelligence v2 **designed** (spec + plan committed, NOT built) — outcome attribution + decoupled Omar precision (`outcome_reason` + `omar_grade_correct`; separates Omar's accuracy from sales execution / external factors). Recorded current state in §11: **businesses-surface Omar currently 500s** (KB-heavy prompt exceeds Groq free-tier limit; fix = paid Groq tier / model upgrade, JA ~05-25/26); chat graceful-fallback safeguard committed (`e729d49`) not yet deployed; teaser hook + intelligence nav-hide are deployed. Build of intelligence v2 deferred per JA ("proceed later") — needs `npm run migrate` at deploy.*

*v7.5 — Security first-pass audit. Findings doc at `delivery/shared/gto-security-audit-2026-05-24.md`; summary mapped in HANDOVER §14. `npm audit` = 9 vulns (all DEV-only via vitest). Code review: 5 High (no rate limiting on public endpoints; legacy `ADMIN_TOKEN` non-timing-safe + role bypass; OTP via `Math.random`; owner-gate missing on intelligence/omar-phase; `/api/leads` `RETURNING *` leaks internal fields publicly), 6 Medium, several Low/Info. `.env` verified git-ignored + not committed. Remediation order documented; fixes NOT yet applied.*

*v7.4 — Post-deploy housekeeping + planning. Phase 9 (intelligence dashboard) + Phase 10 (Omar phasing/KB) deployed to production; reviewer-link 404 fixed; Intelligence removed from the admin sidebar (soft-hide only — a hard owner-only gate is still pending since more than one admin account exists). Added Section 11 (completed/pending snapshot), Section 12 (compliance & privacy requirements — privacy policy, ToS, cookie notice/consent, Oman PDPL + GDPR, sub-processors, data-rights), and Section 13 (infra + model direction: leaning to stay on Vercel + Pro; leaning to an upgraded chatbot model with Haiku 4.5 a strong candidate, cost TBD; LiteLLM deferred).*

*v7.3 — Omar phasing + knowledge-base integration (Thread 2 item 2). Surface-scoped 15-topic KB reference layer (full structured injection) replacing the 8 hardcoded facts (tax/ownership corrected); surface-aware prompt + per-page greeting hooks; Azizi buyer-qualification logic on the businesses surface; settings-backed "new employee" phasing ladder + Omar Roadmap panel on `/admin/intelligence`; WhatsApp handoff for HOT leads; `[WHATSAPP_HANDOFF]`/`[KB_GAP]` signals. New modules: `lib/ai/{surface,knowledge-base,phase,whatsapp,prompt-assembler}.ts`; new `app/api/admin/omar-phase/route.ts`; `components/admin/intelligence/OmarRoadmap.tsx`; `components/chat/WhatsAppHandoffButton.tsx`. 115 tests green; build clean. Merged to `section-b-marketplace` and **deployed to production 2026-05-24** (`intelligence_notes` migrated to live Turso; `omar_phase` settings row auto-created; reviewer-link 404 fixed). Verified live: `/api/admin/omar-phase` returns 401 (route present). Multiple-choice answer UI (piece F) deferred to a follow-up.*
