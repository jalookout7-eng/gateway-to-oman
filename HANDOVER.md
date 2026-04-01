# Gateway to Oman — Project Handover Document

**Prepared by:** JA (Developer)
**Prepared for:** Ahmed Al-Azizi — Al Azizi Group
**Date:** April 1, 2026
**Live URL:** https://gateway-to-oman.vercel.app
**Admin URL:** https://gateway-to-oman.vercel.app/admin
**Repository:** https://github.com/jalookout7-eng/gateway-to-oman (private)

---

## 1. Project Overview

Gateway to Oman is a lead-generation website with an AI-powered chatbot, built to attract and qualify entrepreneurs, investors, professionals, and retirees interested in opportunities in Oman. It replaces/complements the existing WordPress site at gatewaytooman.com.

### What It Does
- **Landing page** showcasing Oman opportunities, services, and Ahmed's credentials
- **AI chatbot** that auto-opens after 7 seconds, qualifies visitors through natural conversation, and captures leads
- **Lead capture** with name, email, and phone — triggered intelligently by AI signals or after 5 exchanges max
- **Admin dashboard** with interactive charts, lead management, conversation transcripts, and settings
- **Email system** configurable via admin panel (SMTP, Resend, or SendGrid)
- **All conversations recorded** in the database, even if the visitor doesn't submit a form

---

## 2. Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Hosting | Vercel (Free tier) | Deployment and CDN |
| Database | Turso (hosted SQLite) | Privacy-first, serverless database |
| AI | Groq + Llama 3.1 8B | Fast AI chat responses |
| Styling | Tailwind CSS | Utility-first CSS |
| Animations | Framer Motion | Scroll and interaction animations |
| Charts | Recharts | Dashboard visualizations |
| Email | Nodemailer / Resend / SendGrid | Multi-provider email sending |

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

These are configured in Vercel → Project Settings → Environment Variables:

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
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (assembles all sections)
│   ├── layout.tsx                # Root layout with ChatWidget
│   ├── globals.css               # Tailwind + gold-gradient utility
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx            # Admin shell (sidebar, auth gate)
│   │   ├── page.tsx              # Dashboard with charts
│   │   ├── leads/page.tsx        # Leads table with filters
│   │   ├── conversations/page.tsx # Conversation viewer
│   │   └── settings/page.tsx     # Email + chatbot config
│   └── api/                      # API routes
│       ├── auth/route.ts         # Token validation
│       ├── chat/route.ts         # AI chat endpoint
│       ├── leads/                # Lead CRUD + CSV upload
│       ├── conversations/        # Conversation list + detail
│       ├── email/                # Send, test, config
│       └── admin/stats/route.ts  # Dashboard analytics
├── components/
│   ├── landing/                  # 10 landing page sections
│   ├── chat/                     # ChatWidget, Messages, Input, LeadCapture, Booking
│   ├── admin/                    # Scorecard, charts (6 components)
│   └── ui/                       # Reusable: Button, Card, Badge, Input, Modal
├── lib/
│   ├── ai/                       # AI provider, signals, system prompt
│   ├── auth/                     # Token validation middleware
│   ├── db/                       # Turso client + schema.sql
│   └── email/                    # Multi-provider sender + templates
├── scripts/
│   └── migrate.ts                # Database migration script
├── tests/                        # Vitest test suites (22 tests)
├── .env.example                  # Template for environment variables
└── HANDOVER.md                   # This document
```

---

## 6. Key Features & How They Work

### AI Chatbot
- Auto-opens 7 seconds after page load
- Uses a detailed system prompt (`lib/ai/prompts.ts`) with Oman knowledge, conversation rules, and Ahmed's personality
- AI embeds hidden signals in responses: `[SEGMENT:entrepreneur]`, `[INTEREST:business setup]`, `[CAPTURE_READY]`, `[HIGH_INTENT]`, `[CLOSE_CHAT]`
- Server strips signals before sending to user — visitor never sees them
- Hard ceiling: lead capture form appears after 5 exchanges if AI hasn't triggered it

### Lead Capture
- Triggered by AI signal `[CAPTURE_READY]` or after 5 exchanges
- Collects: name, email, phone (with country code)
- Chat stays open after capture for continued conversation
- Off-topic/persistent users get politely redirected; `[CLOSE_CHAT]` auto-minimizes

### Admin Dashboard
- **Scorecard:** Total leads, Hot/Warm/Cold, Meetings booked, Conversion rate
- **Charts:** Lead volume (bar), Segment breakdown (donut), Chat interactions (line), Meetings (bar), Conversion funnel
- **Leads page:** Filter by segment/qualification/status, click to expand conversation, CSV export/import, manual entry
- **Conversations page:** List with outcome badges, click to view full transcript
- **Settings page:** Tabbed email config (SMTP/Resend/SendGrid), test email, chatbot greeting/delay

### Email System
- Configurable via admin Settings page (no code changes needed)
- Supports SMTP (Gmail, Outlook, etc.), Resend, and SendGrid
- Send test email to verify configuration
- Auto-send welcome email option when lead is captured

---

## 7. Database Schema

5 tables in Turso:

| Table | Purpose |
|-------|---------|
| `conversations` | Every chat session (id, session_id, outcome, segment, timestamps) |
| `messages` | Every message in every conversation (role, content, raw_content with signals) |
| `leads` | Captured leads (name, email, phone, segment, qualification, status) |
| `emails` | Email log (subject, body, status, sent_at) |
| `settings` | Key-value config store (email settings, chatbot settings) |

To run migrations on a fresh database: `npm run migrate`

---

## 8. Brand System

| Element | Value |
|---------|-------|
| Gold | `#C99B3C` |
| Gold Light | `#E8C777` |
| Navy | `#1A1A2E` |
| Teal | `#7EBEC5` |
| Warm White | `#F8F5F0` |
| Font | Inter (all weights) |
| Gold Gradient | `#C99B3C → #E8C777` (left to right) |

---

## 9. Deployment & Updates

### How to deploy changes
1. Make code changes locally
2. Commit and push to `master` branch on GitHub
3. Vercel auto-deploys on every push (no manual action needed)

### How to add a custom domain
1. Vercel Dashboard → Project → Settings → Domains
2. Add domain (e.g., `gatewaytooman.com` or `app.gatewaytooman.com`)
3. Update DNS records as Vercel instructs (CNAME or A record)
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

## 10. Known Issues & Planned Improvements

### Known Issues
- **Signal leaking in AI responses** — AI sometimes outputs malformed signal tags that don't get fully stripped. Needs system prompt refinement. (Fix planned)
- **Landing page and admin dashboard** — built with basic styling, needs redesign using UI/UX Pro guidelines with high-quality photos. (Redesign planned)

### Planned Improvements
- [ ] Redesign landing page with UI/UX Pro skill guidelines and premium photography
- [ ] Redesign admin dashboard with polished UI
- [ ] Fix AI signal leaking (tighten system prompt + improve regex)
- [ ] Calendar integration for meeting booking (currently mailto link)
- [ ] Oman-specific training data for AI (real estate, visa, business setup details)
- [ ] Email template editor in admin settings
- [ ] Lead scoring automation
- [ ] WhatsApp integration
- [ ] Analytics tracking (Google Analytics / Vercel Analytics)
- [ ] PWA support for mobile

---

## 11. Client Handoff Options

When Ahmed approves the project, there are two paths:

### Option A: Keep on Your Vercel (Recommended for now)
- Add `gatewaytooman.com` as custom domain on your Vercel project
- Update DNS at domain registrar to point to Vercel
- You continue managing hosting and updates
- Client pays for any premium services if needed (Vercel Pro, Turso Pro)

### Option B: Transfer Everything to Client
1. **Vercel:** Transfer project to client's Vercel account (Settings → Transfer)
2. **GitHub:** Transfer repo to client's GitHub account (Settings → Transfer)
3. **Turso:** Export data, client creates own Turso account, import data, update env vars
4. **Groq:** Client creates own Groq account and API key
5. Update all env vars on Vercel with client's credentials

### WordPress Coexistence
- This is a standalone app — it does NOT require WordPress
- Options: replace WordPress entirely, or run as subdomain (`app.gatewaytooman.com`)
- WordPress site can redirect to this app or link to it

---

## 12. Support & Maintenance

### Routine Tasks
- **Monitor leads:** Check admin dashboard regularly
- **Configure email:** Set up via Settings page before expecting welcome emails
- **Update admin token:** Change `ADMIN_TOKEN` in Vercel env vars periodically
- **Database backups:** Turso provides automatic backups; manual export available via Turso CLI

### If Something Breaks
1. Check Vercel deployment logs (Vercel Dashboard → Deployments → latest → Logs)
2. Check Vercel Functions logs for API errors
3. Verify env vars are set correctly
4. Redeploy if needed (Deployments → Redeploy)

### Cost Breakdown (Current)
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (Free) | $0/mo |
| Turso | Starter (Free) | $0/mo |
| Groq | Free tier | $0/mo |
| GitHub | Free (private repo) | $0/mo |
| **Total** | | **$0/mo** |

*Note: Free tiers have limits. If traffic grows significantly, upgrades may be needed.*

---

**Document Version:** 1.0
**Last Updated:** April 1, 2026
