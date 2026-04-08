# Gateway to Oman — Project Handover Document

**Prepared by:** JA (Developer)
**Prepared for:** Ahmed Al-Azizi — Al Azizi Group
**Last Updated:** April 8, 2026
**Live URL:** https://gateway-to-oman.vercel.app
**Admin URL:** https://gateway-to-oman.vercel.app/admin
**Repository:** https://github.com/jalookout7-eng/gateway-to-oman (private)

---

## 1. Project Overview

Gateway to Oman is a lead-generation website with an AI-powered chatbot, built to attract and qualify entrepreneurs, investors, professionals, and retirees interested in opportunities in Oman. It replaces/complements the existing WordPress site at gatewaytooman.com.

### What It Does
- **Landing page** showcasing Oman opportunities, services, and Ahmed's credentials — with real photography from Muscat, Oman's wadis, and key landmarks
- **Context-aware AI chatbot** that auto-opens after 7 seconds, OR opens in a centered modal when any CTA or opportunity card is clicked — pre-seeded with the relevant context
- **Lead capture** with name, email, and phone — triggered intelligently by AI signals or after 5 exchanges max; chat closes fully after submission
- **Consultation booking flow** — AI asks for preferred day and time, creates a booking record, generates a draft confirmation email for Ahmed to review and send
- **Admin dashboard** with charts, lead management, AI lead summaries, conversation transcripts, booking calendar, and settings
- **Push notifications** to Ahmed's browser (and phone when installed as PWA) — new leads, new bookings, upcoming meeting reminders
- **Email approval workflow** — all outbound emails to leads are drafted and held until Ahmed clicks Send
- **PWA-installable** — can be added to home screen on iOS and Android; push notifications work on both
- **All conversations recorded** in the database, even if the visitor doesn't submit a form

---

## 2. Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Hosting | Vercel (Free / Hobby tier) | Deployment and CDN |
| Database | Turso (hosted SQLite) | Privacy-first, serverless database |
| AI | Groq + Llama 3.1 8B | Fast AI chat responses |
| Styling | Tailwind CSS | Utility-first CSS |
| Animations | Framer Motion | Scroll and interaction animations |
| Charts | Recharts | Dashboard visualizations |
| Icons | Lucide React | SVG icon library (stroke-based, consistent) |
| Email | Nodemailer / Resend / SendGrid | Multi-provider email sending |
| Calendar | ical-generator | .ics calendar file generation for booking emails |
| Push | web-push + Web Push API | Browser push notifications (VAPID) |
| Photos | Local + Pexels CDN | Hero: Sultan Qaboos Mosque (local PNG). Section photos: Pexels CDN |

---

## 3. Access Credentials

### Admin Dashboard
- **URL:** https://gateway-to-oman.vercel.app/admin
- **Token:** `gto-admin-2026`
- Log in with this token to access leads, conversations, calendar, charts, and settings

### Vercel (Hosting)
- **Account:** jalookout7-eng (GitHub-linked)
- **Project:** gateway-to-oman
- **Dashboard:** https://vercel.com/jalookout7-1526s-projects/gateway-to-oman

### Turso (Database)
- **Database name:** gateway-to-oman
- **URL:** `libsql://gateway-to-oman-jalookout7.aws-ap-northeast-1.turso.io`
- **Region:** AWS AP Northeast 1 (Tokyo)
- **Auth Token:** Stored in Vercel environment variables

### Groq (AI)
- **Provider:** Groq Cloud
- **Model:** Llama 3.1 8B (fast, free tier available)
- **API Key:** Stored in Vercel environment variables

### GitHub (Code)
- **Repo:** https://github.com/jalookout7-eng/gateway-to-oman
- **Branch:** master
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
│   ├── page.tsx                    # Landing page (assembles all sections)
│   ├── layout.tsx                  # Root layout — fonts, ChatWidget, ChatModal, ChatModalProvider, PWA manifest link
│   ├── globals.css                 # Tailwind base, font-heading on h1-h6, gold-gradient
│   ├── admin/
│   │   ├── layout.tsx              # Admin shell — sidebar (desktop), bottom nav (mobile), push subscription registration
│   │   ├── page.tsx                # Dashboard with charts
│   │   ├── leads/page.tsx          # Leads table — expandable AI summary, email draft approval, Call/Email actions
│   │   ├── calendar/page.tsx       # Booking calendar — week view, block/unblock days and slots
│   │   ├── conversations/page.tsx  # Conversation viewer with AI summary header
│   │   └── settings/page.tsx       # Email config, consultation time slots, chatbot settings
│   └── api/
│       ├── auth/route.ts           # Token validation
│       ├── chat/route.ts           # AI chat — context injection, availability injection, booking signal handling
│       ├── availability/route.ts   # Returns available days/slots for next 7 days (Oman time)
│       ├── bookings/route.ts       # Booking records CRUD
│       ├── leads/                  # Lead CRUD — triggers AI summary + push notification on creation
│       ├── conversations/          # Conversation list + detail
│       ├── email/                  # Send, test, config
│       ├── cron/reminders/route.ts # Vercel Cron — finds upcoming meetings, drafts reminder emails, sends push
│       └── admin/
│           ├── stats/route.ts      # Dashboard analytics
│           ├── blocked-slots/      # Block/unblock availability slots
│           ├── emails/[id]/send/   # Ahmed approves and sends a draft email
│           ├── leads/[id]/summarize/ # Regenerate AI summary for a lead
│           └── push/subscribe/     # Save browser push subscription
├── components/
│   ├── landing/                    # 10+ landing page sections — Navbar (hamburger mobile), opportunity cards as modal buttons
│   ├── chat/
│   │   ├── ChatWidget.tsx          # Floating chat — centered on desktop, hidden on admin, closes after capture
│   │   ├── ChatModal.tsx           # Centered modal — context-aware, fresh conversation per open
│   │   ├── ChatMessages.tsx        # Shared message list component
│   │   ├── ChatInput.tsx           # Input with font-size:16px (prevents iOS zoom), WhatsApp layout
│   │   ├── LeadCaptureForm.tsx     # Lead form (shared by Widget and Modal)
│   │   └── BookingButton.tsx       # High-intent booking prompt
│   ├── admin/                      # Scorecard, charts (6 components)
│   └── ui/                         # Button, Card, Badge, Input, Modal
├── lib/
│   ├── ai/
│   │   ├── prompts.ts              # System prompt — 3-layer personality, hard 3-5 exchange cap, anti-sales guardrail
│   │   ├── provider.ts             # Groq API integration
│   │   └── signals.ts              # Signal parsing — includes BOOKING_DAY and BOOKING_TIME
│   ├── context/
│   │   └── ChatModalContext.tsx    # Global context — openModal(intent, topic), closeModal
│   ├── email/
│   │   ├── sender.ts               # Multi-provider email sender (SMTP/Resend/SendGrid)
│   │   └── booking.ts              # Booking confirmation email + .ics calendar attachment generator
│   ├── push/
│   │   └── notify.ts               # sendPushNotification() — sends to all stored subscriptions
│   ├── auth/                       # Token validation middleware
│   └── db/                         # Turso client + schema.sql
├── public/
│   ├── sw.js                       # Service worker — handles push events, notification clicks
│   ├── manifest.json               # PWA manifest — enables "Add to Home Screen"
│   ├── icon-192.png                # PWA icon
│   ├── icon-512.png                # PWA icon
│   └── hero-muscat.png             # Hero background — Sultan Qaboos Grand Mosque photo
├── scripts/
│   └── migrate.ts                  # Database migration script
├── docs/
│   └── superpowers/
│       ├── specs/2026-04-07-gateway-phase5-design.md   # Phase 5 design decisions
│       └── plans/2026-04-07-gateway-phase5.md          # Phase 5 implementation plan (19 tasks)
├── vercel.json                     # Vercel Cron config — reminders every 30 min
├── next.config.js                  # images.pexels.com remote patterns
├── tailwind.config.ts              # Color tokens + font families
└── .env.example                    # Template for environment variables
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

8 tables in Turso (5 original + 3 added in Phase 5):

| Table | Purpose |
|-------|---------|
| `conversations` | Every chat session (id, session_id, outcome, segment, timestamps) |
| `messages` | Every message in every conversation (role, content, raw_content with signals) |
| `leads` | Captured leads — name, email, phone, segment, qualification, status, `ai_summary`, `booking_id` |
| `emails` | Email log — subject, body, status (draft/sent/failed), `to_address`, `booking_id`, `approved_at` |
| `settings` | Key-value config store (email settings, chatbot settings, `consultation_slots`) |
| `bookings` | Consultation bookings — lead_id, conversation_id, preferred_date, preferred_time, status |
| `blocked_slots` | Days or time slots Ahmed has blocked — date, time_slot (null = full day), reason |
| `push_subscriptions` | Browser push subscriptions — endpoint, p256dh, auth keys |

Run migrations on a fresh database: `npm run migrate`

---

## 10. Deployment & Updates

### How to deploy changes
1. Make code changes locally
2. Commit and push to `master` branch on GitHub
3. Vercel auto-deploys on every push — no manual action needed

### Critical: Vercel Hobby Plan Committer Rule
Vercel Hobby blocks deploys if the git committer can't be associated with the repo owner's GitHub account. Always commit with:
```bash
git config user.email "jalookout7-eng@users.noreply.github.com"
git config user.name "jalookout7-eng"
```
Do NOT use `Co-Authored-By` trailers — Vercel treats them as collaboration and blocks the deploy.

### Vercel Cron
`vercel.json` configures a cron job at `/api/cron/reminders` running every 30 minutes. Protected by `CRON_SECRET` environment variable. Vercel Hobby supports up to 2 cron jobs.

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

### Backlog (not yet scoped)
- [ ] Email template editor in admin settings
- [ ] Lead scoring automation
- [ ] WhatsApp integration
- [ ] Analytics tracking (Google Analytics or Vercel Analytics)
- [ ] AI signal leaking — full regex improvement pass

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
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (Free) | $0/mo |
| Turso | Starter (Free) | $0/mo |
| Groq | Free tier | $0/mo |
| GitHub | Free (private repo) | $0/mo |
| Pexels photos | Free commercial license | $0 |
| **Total** | | **$0/mo** |

Free tiers have limits. If traffic grows significantly, Vercel Pro ($20/mo) and Turso Scaler ($29/mo) are the likely first upgrades needed.

---

**Document Version:** 4.0
**Last Updated:** April 8, 2026
