# Gateway to Oman — Phase 5 Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Quick fixes, context-aware chat modal, consultation booking system, push notifications, PWA, AI lead summary, mobile responsiveness

---

## 1. Quick Fixes

These require no architecture decisions — implement directly.

| # | Fix | File(s) |
|---|-----|---------|
| 1 | Hero text visibility — increase overlay opacity or add blur so copy is legible over photo | `components/landing/Hero.tsx` |
| 2 | Hide ChatWidget on all `/admin/*` routes — conditional render in root layout | `app/layout.tsx` |
| 3 | Chat fully closes after lead form submission — `isClosed = true`, widget collapses to nothing | `components/chat/ChatWidget.tsx` |
| 4 | Chatbot self-identifies as "AI Assistant" to visitors (Omar is internal persona only) — update greeting copy | `lib/ai/prompts.ts`, `components/chat/ChatWidget.tsx` |
| 5 | Chatbot always ends every response with a qualifying follow-up question — add to HARD RULES in prompt | `lib/ai/prompts.ts` |
| 6 | Fix duplicate Pexels image — Businesses for Sale and Digital Banking both use `18331886`. Replace Digital Banking with a different photo (fintech/banking setting) | `components/landing/Opportunities.tsx` |
| 7 | Career platform card — replace current photo with office/professional setting photo | `components/landing/Opportunities.tsx` |
| 8 | Remove "no sales pitch, just truth" text from bottom of landing page | `components/landing/` (locate section) |
| 9 | Mobile chat zoom fix — set `font-size: 16px` on all chat input fields to prevent iOS auto-zoom. Redesign chat input area in WhatsApp style: input hugs the bottom, send button right-aligned, clear tap targets min 44px | `components/chat/ChatWidget.tsx`, `globals.css` |
| 10 | Email button stays as `mailto:` — no chat modal logic | No change needed |

---

## 2. Context-Aware Chat Modal

### Overview
Any CTA button or opportunity card (except email mailto links) opens a centered chat modal instead of the floating widget. Each modal open starts a fresh conversation with the AI pre-seeded with context about what was clicked.

### Global State
New `ChatModalContext` (React context) in `lib/context/ChatModalContext.tsx`:
```ts
interface ChatModalState {
  isOpen: boolean
  intent: 'consultation' | 'opportunity' | null
  topic: string | null  // e.g. "Businesses for Sale"
  openModal: (intent, topic?) => void
  closeModal: () => void
}
```
`<ChatModalProvider>` wraps the root layout. Any component calls `useChatModal().openModal(...)`.

### ChatModal Component
New file: `components/chat/ChatModal.tsx`

- **Desktop/tablet (≥768px):** Fixed centered overlay, `max-w-[480px]`, `h-[600px]`, dark backdrop (`bg-black/60`), rounded-2xl, gold border top
- **Mobile (<768px):** Full-screen bottom sheet, slides up with Framer Motion spring, same WhatsApp-style input layout as the fixed floating chat
- Floating `<ChatWidget />` is hidden (`pointer-events-none opacity-0`) while modal is open
- X button top-right closes the modal
- Backdrop click closes the modal
- `[CLOSE_CHAT]` signal closes the modal

### Context Injection
When modal opens, a silent context note is prepended to the conversation's first system message:
```
[CONTEXT: visitor clicked 'Businesses for Sale' opportunity]
```
This is stripped server-side like all other signals. The AI uses it to open with the right qualifying question.

### Updated AI Prompt (consultation context)
When `intent === 'consultation'`, the AI follows this flow:
- Exchange 1: Qualify what they want from the consultation
- Exchange 2: One more qualifying question
- Exchange 3: Ask preferred day — offer only days from `[AVAILABLE_DAYS:...]` signal
- Exchange 4: Ask preferred time — offer only slots for that day from `[AVAILABLE_SLOTS:...]`
- Exchange 5: `[CAPTURE_READY]` + `[BOOKING_DAY:YYYY-MM-DD]` + `[BOOKING_TIME:HH:MM]`

### Triggers
- All 6 Opportunity cards become `<button>` elements with `onClick={() => openModal('opportunity', cardTitle)}`
- "Book Free Consultation" button: `openModal('consultation')`
- Any other CTA buttons on the page (except mailto links): `openModal('consultation')`
- Email buttons: unchanged, remain `mailto:` links

---

## 3. Consultation Booking System

### Database — 2 new tables

```sql
CREATE TABLE blocked_slots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  date TEXT NOT NULL,           -- YYYY-MM-DD (Oman time GMT+4)
  time_slot TEXT,               -- HH:MM or NULL (NULL = full day blocked)
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  lead_id TEXT REFERENCES leads(id),
  conversation_id TEXT REFERENCES conversations(id),
  preferred_date TEXT NOT NULL,   -- YYYY-MM-DD
  preferred_time TEXT NOT NULL,   -- HH:MM (Oman time)
  status TEXT DEFAULT 'pending',  -- pending | confirmed | cancelled
  created_at TEXT DEFAULT (datetime('now'))
);
```

`leads` table: add `booking_id TEXT REFERENCES bookings(id)`.

### Availability API
`GET /api/availability`
- Computes next 7 days from today (Oman time)
- Filters out: dates in `blocked_slots` (full-day blocks), individual blocked time slots
- Returns: `{ availableDays: ['2026-04-08', ...], slotsByDay: { '2026-04-08': ['09:00','13:00','16:00'] } }`
- If all 7 days are fully blocked, returns days 8–14 instead

### Chat API — availability injection
When a conversation has `intent === 'consultation'`, before calling Groq the chat API:
1. Calls `GET /api/availability`
2. Injects into system prompt (stripped server-side):
```
[AVAILABLE_DAYS: Mon Apr 7, Wed Apr 9, Fri Apr 11]
[AVAILABLE_SLOTS_FOR_MON: 9:00am, 1:00pm, 4:00pm]
```

### New Signals
```
[BOOKING_DAY:YYYY-MM-DD]   — visitor confirmed a day
[BOOKING_TIME:HH:MM]       — visitor confirmed a time
```
Both stripped server-side. When detected, server creates a booking record and links to the lead.

### Admin — Available Time Slots (Settings)
New section in admin Settings tab: "Consultation Hours"
- Ahmed configures his default available time slots per day (e.g., 09:00, 13:00, 16:00)
- Stored in `settings` table as key-value: `consultation_slots = '09:00,13:00,16:00'`
- Timezone note shown: "All times are Oman time (GMT+4)"

### Admin — Booking Calendar (new tab)
New page: `app/admin/calendar/page.tsx`
- Week view showing Mon–Sun
- Each day shows: bookings (lead name + time), blocked slots (grayed)
- Ahmed clicks a day → modal to block full day or specific time slot
- Ahmed clicks an existing block → option to unblock
- Forward/back week navigation
- Upcoming meetings within 24 hours highlighted in gold

---

## 4. Email Approval Workflow

### Principle
No email is sent to a lead without Ahmed explicitly clicking Send. All outbound lead emails are drafted and held for approval.

### Draft Storage
`emails` table — add columns:
- `status TEXT DEFAULT 'draft'` — draft | sent | failed
- `booking_id TEXT REFERENCES bookings(id)`
- `to_address TEXT`
- `approved_at TEXT`

### Email Types (both require Ahmed approval)

**Booking Confirmation Email** (generated when booking is created):
- To: lead's email
- Subject: "Your consultation with Ahmed Al-Azizi is confirmed"
- Body: date, time (Oman GMT+4), what to expect, Ahmed's contact
- Attachment: `.ics` calendar file (generated server-side using `ical-generator` package)
- Stored as `status = 'draft'`
- Push notification sent to Ahmed: "[Name] booked for [date] at [time] — review confirmation email"

**Meeting Reminder Email** (generated by Vercel Cron ~90 min before meeting):
- To: lead's email
- Subject: "Reminder: Your consultation with Ahmed is in 1 hour"
- Body: date, time, any prep notes
- Stored as `status = 'draft'`
- Push notification sent to Ahmed: "[Name]'s meeting is in 1 hour — send reminder?"

### Admin Email Review UI
- **Leads table:** Badge "1 email pending review" when drafts exist for a lead
- **Lead expanded view:** Shows draft email with subject + body preview, Edit button, and **Send** button
- Clicking Send → `POST /api/email/send` with the draft id → email dispatched, status updated to `sent`
- Ahmed can also click **Call** (opens `tel:[phone]`) or compose a custom email

---

## 5. Push Notifications + PWA

### Architecture
- `web-push` npm package for server-side push delivery
- VAPID keys: `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel env vars (generated once with `web-push generate-vapid-keys`)
- Service worker: `/public/sw.js` — handles `push` events, shows OS notification, handles `notificationclick` to open correct admin URL
- `push_subscriptions` table in Turso: stores Ahmed's subscription per browser/device

```sql
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Subscription Flow
1. Ahmed logs into admin → `useEffect` checks `Notification.permission`
2. If not granted, shows a one-time banner: "Enable push notifications to get alerts for new leads and meetings"
3. Ahmed clicks Enable → browser prompts → subscription POSTed to `/api/admin/push/subscribe`
4. Subscription stored in `push_subscriptions`

### Notification Triggers

| Event | Push Message | Click Action |
|-------|-------------|--------------|
| New lead created | "New lead: [Name] — [segment]" | Opens `/admin/leads` |
| Booking confirmed by AI | "[Name] booked [date] at [time] — review email" | Opens `/admin/leads?lead=[id]&tab=email` |
| Meeting in ~90 min (Cron) | "[Name]'s meeting in 1 hour — send reminder?" | Opens `/admin/leads?lead=[id]&tab=email` |

### Vercel Cron
`/api/cron/reminders` — runs every 30 minutes
- Finds bookings with `preferred_date` and `preferred_time` within next 60–90 minutes
- Generates reminder email draft for each (if not already drafted)
- Sends push notification to all stored subscriptions
- Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/reminders", "schedule": "*/30 * * * *" }]
}
```

### PWA Manifest
`/public/manifest.json`:
```json
{
  "name": "Gateway to Oman Admin",
  "short_name": "GTO Admin",
  "start_url": "/admin",
  "display": "standalone",
  "background_color": "#1A1A2E",
  "theme_color": "#C99B3C",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
Link in `<head>`: `<link rel="manifest" href="/manifest.json" />`

Push notifications work on:
- Android Chrome (installed or browser tab)
- iOS Safari 16.4+ (must be installed to home screen)
- Desktop Chrome/Edge

---

## 6. AI Lead Summary

### Generation
Triggered server-side inside `POST /api/leads`, after the lead row is inserted:
1. Fetch all messages for the conversation from `messages` table
2. Build a summary prompt (see below)
3. Call Groq (same model, non-streaming)
4. Store result in `leads.ai_summary`

Runs async — does not block the API response to the visitor.

### Summary Prompt
```
You are summarizing a sales qualification conversation for Ahmed Al-Azizi.

Conversation:
[full message history]

Write a concise summary with these four sections:
WHO: One sentence about who this person is (background, country, situation).
WANTS: What they are specifically looking for in Oman.
SIGNALS: Key qualifying indicators — hot/warm/cold and why.
BOTTLENECKS: Concerns, hesitations, or obstacles they raised.
NEXT STEP: Recommended action for Ahmed.

Keep each section to 1-2 sentences. No bullet points within sections. Plain prose.
```

### Database
`leads` table: add `ai_summary TEXT`.
Migration: `ALTER TABLE leads ADD COLUMN ai_summary TEXT;`

### Admin UI
- **Leads table row:** Expandable chevron on the right
- Expanding reveals the AI summary as a styled card (dark bg, gold left border) with the 5 sections labeled
- **Conversations page:** Summary shown as a header card above the message transcript
- **Regenerate button:** Small refresh icon in the summary card — calls `POST /api/admin/leads/:id/summarize` to regenerate

### Short Conversation Fallback
If fewer than 2 messages in conversation: summary = "Lead submitted with minimal conversation. [Segment] interested in [interests]. Review lead details directly."

---

## 7. Mobile Responsiveness

### Admin Dashboard
- Sidebar collapses to a bottom tab bar on mobile (<768px) — 4 icons: Dashboard, Leads, Calendar, Settings
- Charts stack vertically on mobile (currently side-by-side)
- Leads table: hide lower-priority columns on mobile, show name + status + segment only, tap row to expand
- Booking calendar: day view on mobile instead of week view (swipe left/right between days)

### Landing Page
- Audit all sections for horizontal overflow
- Opportunity cards: 1 column on mobile (currently 3 col grid)
- Hero trust badges: wrap to 2 rows if needed
- Chat modal on mobile: full-screen bottom sheet (already covered in Section 2)
- Navbar: hamburger menu on mobile (if not already implemented)

---

## 8. Implementation Order

1. Quick fixes (Hero, admin hide, chat close, identity, follow-up, images, mobile zoom, "no sales pitch")
2. Database migrations (blocked_slots, bookings, push_subscriptions, ai_summary column)
3. Context-aware chat modal + ChatModalContext
4. Availability API + booking flow (signals, booking creation)
5. Admin calendar page
6. Push notifications + PWA manifest + service worker
7. Email draft system + approval UI in admin
8. Vercel Cron for reminders
9. AI lead summary (generation + admin UI)
10. Mobile responsiveness pass (admin + landing)

---

## 9. New Dependencies

| Package | Purpose |
|---------|---------|
| `web-push` | Server-side Web Push API (VAPID) |
| `ical-generator` | Generate .ics calendar attachments |

No other new dependencies — all other features use existing stack.

---

## 10. Environment Variables to Add

| Variable | Value |
|----------|-------|
| `VAPID_PUBLIC_KEY` | Generated with `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Generated with `web-push generate-vapid-keys` |
| `VAPID_EMAIL` | `mailto:your@email.com` (contact for push service) |
