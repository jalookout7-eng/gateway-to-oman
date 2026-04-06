# Gateway to Oman — Project Handover Document

**Prepared by:** JA (Developer)
**Prepared for:** Ahmed Al-Azizi — Al Azizi Group
**Last Updated:** April 6, 2026
**Live URL:** https://gateway-to-oman.vercel.app
**Admin URL:** https://gateway-to-oman.vercel.app/admin
**Repository:** https://github.com/jalookout7-eng/gateway-to-oman (private)

---

## 1. Project Overview

Gateway to Oman is a lead-generation website with an AI-powered chatbot, built to attract and qualify entrepreneurs, investors, professionals, and retirees interested in opportunities in Oman. It replaces/complements the existing WordPress site at gatewaytooman.com.

### What It Does
- **Landing page** showcasing Oman opportunities, services, and Ahmed's credentials — with real photography from Muscat, Oman's wadis, and key landmarks
- **AI chatbot (Omar)** that auto-opens after 7 seconds, qualifies visitors through natural conversation, and captures leads
- **Lead capture** with name, email, and phone — triggered intelligently by AI signals or after 5 exchanges max
- **Admin dashboard** with interactive charts, lead management, conversation transcripts, and settings
- **Email system** configurable via admin panel (SMTP, Resend, or SendGrid)
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
| Photos | Pexels CDN | Free commercial-use Oman photography |

---

## 3. Access Credentials

### Admin Dashboard
- **URL:** https://gateway-to-oman.vercel.app/admin
- **Token:** `gto-admin-2026`
- Log in with this token to access leads, conversations, charts, and settings

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
| `EMAIL_PROVIDER` | `smtp`, `resend`, or `sendgrid` | For email |
| `SMTP_HOST` | SMTP server hostname | If SMTP |
| `SMTP_PORT` | SMTP port (usually 587) | If SMTP |
| `SMTP_USER` | SMTP username | If SMTP |
| `SMTP_PASS` | SMTP password/app password | If SMTP |
| `RESEND_API_KEY` | Resend API key | If Resend |
| `SENDGRID_API_KEY` | SendGrid API key | If SendGrid |
| `EMAIL_FROM_NAME` | Sender display name | For email |
| `EMAIL_FROM_ADDRESS` | Sender email address | For email |
| `EMAIL_REPLY_TO` | Reply-to address | For email |

---

## 5. Project Structure

```
gateway-to-oman/
├── app/
│   ├── page.tsx                  # Landing page (assembles all sections)
│   ├── layout.tsx                # Root layout — Bodoni Moda + Jost fonts, ChatWidget
│   ├── globals.css               # Tailwind base, font-heading on h1-h6, gold-gradient
│   ├── admin/
│   │   ├── layout.tsx            # Admin shell (sidebar, auth gate)
│   │   ├── page.tsx              # Dashboard with charts
│   │   ├── leads/page.tsx        # Leads table with filters
│   │   ├── conversations/page.tsx # Conversation viewer
│   │   └── settings/page.tsx     # Email + chatbot config
│   └── api/
│       ├── auth/route.ts         # Token validation
│       ├── chat/route.ts         # AI chat endpoint + signal parsing
│       ├── leads/                # Lead CRUD + CSV upload
│       ├── conversations/        # Conversation list + detail
│       ├── email/                # Send, test, config
│       └── admin/stats/route.ts  # Dashboard analytics
├── components/
│   ├── landing/                  # 10 landing page sections (all with Pexels photos + Lucide icons)
│   ├── chat/                     # ChatWidget, Messages, Input, LeadCapture, Booking
│   ├── admin/                    # Scorecard, charts (6 components)
│   └── ui/                       # Button, Card, Badge, Input, Modal
├── lib/
│   ├── ai/
│   │   ├── prompts.ts            # System prompt (Omar persona) + contextual greetings
│   │   ├── provider.ts           # Groq API integration
│   │   └── signals.ts            # Signal parsing and extraction
│   ├── auth/                     # Token validation middleware
│   ├── db/                       # Turso client + schema.sql
│   └── email/                    # Multi-provider sender + templates
├── scripts/
│   └── migrate.ts                # Database migration script
├── tests/                        # Vitest test suites (22 tests)
├── next.config.js                # images.pexels.com remote patterns
├── tailwind.config.ts            # Color tokens + font families (body/heading)
└── .env.example                  # Template for environment variables
```

---

## 6. What Has Been Built

### Phase 1 — Core Application (completed April 1, 2026)
- Full Next.js 14 project scaffold with Tailwind brand config (navy/gold/teal)
- All API routes: chat, leads, conversations, email, admin stats, auth
- Database layer with Turso (5 tables: conversations, messages, leads, emails, settings)
- AI chatbot with Groq + signal system (hidden tags for visitor segmentation)
- Complete landing page (10 sections)
- Admin dashboard with charts, leads management, conversation viewer, settings
- Multi-provider email system (SMTP / Resend / SendGrid)
- 22 Vitest tests

### Phase 2 — Photography & Visual Polish (April 6, 2026)
- Added **real Oman photography** from Pexels (free commercial license) across all landing sections:
  - Hero: full-screen aerial Muscat background (Pexels #18331886) with navy overlay
  - Who We Help: 4 contextual photos (coastal road, aerial city, minaret, Snake Canyon)
  - Why Oman: 4 contextual photos matching each reason
  - Opportunities: photo header on each of the 6 opportunity cards
- Chat button changed from circular icon to **pill-shaped "AI Assistant" label**
- Added `images.pexels.com` to `next.config.js` remote patterns for `next/image`

### Phase 3 — UI/UX Pro Max Redesign (April 6, 2026)
- **Typography:** Replaced Inter with **Bodoni Moda** (headings, luxury serif) + **Jost** (body, clean modern) via `next/font/google`
- **Icons:** Replaced all emoji icons with **Lucide React SVG icons** throughout:
  - Who We Help: Rocket, TrendingUp, Briefcase, Users
  - Why Oman: Globe, BarChart3, Building2, Sunrise
  - Why Work With Us: Target, Handshake, BadgeCheck, Star (in gold circle badges)
  - Track Record: Users, Building2, CircleDollarSign, Globe
  - Sectors: Landmark, HeartPulse, Truck, Leaf, BrainCircuit, Hotel (inline in pills)
  - Core Services: Map, Package, LineChart, Home (inline with service title)
  - Hero trust badges: ShieldCheck, Users, Star
  - Contact CTA buttons: Mail, CalendarDays
  - Founder quote: decorative Quote icon
- **Hero enhancements:**
  - Gold eyebrow label ("Strategic Advisory for Oman Opportunities")
  - 3 trust badges below hero CTA (150+ Families, Verified Opportunities, 26 Years Expertise)
  - Second CTA button (Book Free Consultation)
- **UX compliance:**
  - `cursor-pointer` on all interactive elements (Button, links, anchors via globals.css)
  - `focus-visible:ring` on Button for keyboard navigation (WCAG)
  - Card hover: `hover:-translate-y-0.5` with 200ms spring transition
  - `tabular-nums` on animated counters (number-tabular rule)

### Phase 4 — AI Personality Rebuild (April 6, 2026)
The chatbot persona was rebuilt using a 3-layer system:

**Layer 1 — Voice:** Full banned-words list (delve, robust, leverage, etc.), short paragraph rules, sentence burstiness, lead-with-conclusion structure. No headers/bullets/bold in conversational output. No filler openers.

**Layer 2 — Emotional Intelligence:** 7 calibrated state protocols:
- Frustration → skip acknowledgment, go straight to the answer
- Excitement → match briefly, channel forward
- Confusion → fewer words, different angle
- Vulnerability → direct warmth, concrete examples, no therapy
- Adversarial → hold ground with specific evidence
- Urgency → fastest answer first, label shortcuts
- Low engagement → match energy, don't over-explain

**Layer 3 — Character:** Named persona **Omar** — senior Oman country advisor, 10 years experience, opinionated but adaptive. Signature moves: direct verdicts, "the question is really...", "be straight with you:", "the move is...". 12 hard "never do" rules. Greetings rewritten without emoji.

---

## 7. Key Features & How They Work

### AI Chatbot (Omar)
- Auto-opens 7 seconds after page load
- Named persona: Omar, a senior country advisor with strong opinions on Oman fit
- Uses a detailed system prompt (`lib/ai/prompts.ts`) with 3-layer personality, Oman knowledge, conversation flow, and signal rules
- AI embeds hidden signals in responses: `[SEGMENT:entrepreneur]`, `[INTEREST:business setup]`, `[CAPTURE_READY]`, `[HIGH_INTENT]`, `[CLOSE_CHAT]`
- Server strips signals before sending to user — visitor never sees them
- Hard ceiling: lead capture form appears after 5 exchanges if AI hasn't triggered it

### Lead Capture
- Triggered by `[CAPTURE_READY]` signal or after 5 exchanges
- Collects: name, email, phone (with country code)
- Chat stays open after capture for continued conversation
- Off-topic users get redirected up to 3 times; `[CLOSE_CHAT]` auto-minimizes

### Admin Dashboard
- **Scorecard:** Total leads, Hot/Warm/Cold, Meetings booked, Conversion rate
- **Charts:** Lead volume (bar), Segment breakdown (donut), Chat interactions (line), Meetings (bar), Conversion funnel
- **Leads page:** Filter by segment/qualification/status, CSV export/import, manual entry
- **Conversations page:** Full transcript viewer with outcome badges
- **Settings page:** Tabbed email config, test email, chatbot settings

### Email System
- Configurable via admin Settings (no code changes needed)
- Supports SMTP (Gmail, Outlook, etc.), Resend, and SendGrid
- Send test email to verify configuration

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

5 tables in Turso:

| Table | Purpose |
|-------|---------|
| `conversations` | Every chat session (id, session_id, outcome, segment, timestamps) |
| `messages` | Every message in every conversation (role, content, raw_content with signals) |
| `leads` | Captured leads (name, email, phone, segment, qualification, status) |
| `emails` | Email log (subject, body, status, sent_at) |
| `settings` | Key-value config store (email settings, chatbot settings) |

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
| AI signal leaking | Partially fixed | Occasionally malformed tags reach the user. New system prompt structure reduces this. A regex improvement pass is still pending. |
| Admin dashboard UI | Pending redesign | Functional but basic styling. Full UI/UX Pro redesign planned. |
| Meeting booking | Placeholder | Currently opens a mailto link. Calendar integration (Calendly or similar) planned. |

---

## 12. Planned Improvements

- [ ] Redesign admin dashboard with polished UI (UI/UX Pro Max)
- [ ] Fix AI signal leaking — improve regex in `lib/ai/signals.ts`
- [ ] Calendar integration for meeting booking (replace mailto link)
- [ ] Email template editor in admin settings
- [ ] Lead scoring automation
- [ ] WhatsApp integration
- [ ] Analytics tracking (Google Analytics or Vercel Analytics)
- [ ] PWA support for mobile

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
5. Update all Vercel env vars with client credentials

### WordPress Coexistence
- This is a standalone Next.js app — no WordPress dependency
- Options: replace WordPress entirely, or run as subdomain (`app.gatewaytooman.com`)

---

## 14. Support & Maintenance

### Routine Tasks
- **Monitor leads:** Check admin dashboard regularly
- **Configure email:** Set up via Settings page before expecting welcome emails
- **Update admin token:** Change `ADMIN_TOKEN` in Vercel env vars periodically
- **Database backups:** Turso provides automatic backups; manual export via Turso CLI

### If Something Breaks
1. Check Vercel deployment logs (Vercel Dashboard → Deployments → latest → Logs)
2. Check Vercel Functions logs for API errors
3. Verify env vars are set correctly in Vercel
4. Redeploy if needed (Deployments → Redeploy)

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

**Document Version:** 2.0
**Last Updated:** April 6, 2026
