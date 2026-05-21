# Gateway to Oman — Project Handover Document

**Prepared by:** JA (Developer)
**Prepared for:** Ahmed Al-Azizi — Al Azizi Group
**Last Updated:** May 21, 2026
**Live URL:** https://gateway-to-oman.vercel.app
**Marketplace landing:** https://gateway-to-oman.vercel.app/businesses
**Marketplace grid:** https://gateway-to-oman.vercel.app/businesses/listings
**Subscriber sign-in / sign-up:** https://gateway-to-oman.vercel.app/businesses/sign-in
**Admin URL:** https://gateway-to-oman.vercel.app/admin
**Repository:** https://github.com/jalookout7-eng/gateway-to-oman (private)
**Active Branch:** `section-b-marketplace` (master has diverged — see Section 10)

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

**Document Version:** 7.2
**Last Updated:** May 21, 2026
