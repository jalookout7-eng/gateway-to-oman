# Compliance Pages — Design Spec

**Date:** 2026-05-26 · **Status:** APPROVED, build pending
**Source of truth for:** the wording of `/privacy`, `/terms`, `/cookies` and the consent/footer wiring that links them.

## 1. Goal

Ship the legal pages + consent wiring that GTO needs for Oman PDPL + GDPR compliance, in production-ready (non-DRAFT) form. JA + Ahmed + a lawyer will run final review post-build; the content here is structured to make that easy (only `[bracketed]` company facts remain to fill).

## 2. Architecture

### Files to create
| File | Responsibility |
|------|----------------|
| `components/legal/LegalLayout.tsx` | Shared layout wrapper — title, effective date, navy/gold styling, max-w-3xl prose, footer back-link |
| `app/privacy/page.tsx` | Privacy Policy page (uses `LegalLayout`) |
| `app/terms/page.tsx` | Terms of Service page |
| `app/cookies/page.tsx` | Cookie Notice page |
| `components/legal/CompanyFacts.ts` | One source of company-fact placeholders consumed by all three pages (single edit point when Ahmed supplies them) |

### Files to modify
| File | Change |
|------|--------|
| `components/landing/Footer.tsx` (main-site footer — find via grep if path differs) | Add Privacy · Terms · Cookies links |
| `app/businesses/layout.tsx` (the marketplace footer block inside the businesses layout) | Add same three links |
| `app/businesses/sign-in/page.tsx` | Add required, unticked-by-default consent checkbox to the sign-up tab; submit blocked until checked |
| `components/chat/LeadCaptureForm.tsx` | Passive consent line below the submit button |
| `components/businesses/AccessRequestForm.tsx` | Passive consent line below the submit button |

### Effective date

All three pages display **"Effective date: 26 May 2026"** at the top, sourced from a constant `EFFECTIVE_DATE = "26 May 2026"` in `LegalLayout`.

### Company facts (single source — `components/legal/CompanyFacts.ts`)

```ts
export const COMPANY = {
  tradingName: "Gateway to Oman",
  legalEntity: "[Legal entity name — to be added]",         // FILL-IN 1
  crNumber: "[Commercial Registration No. — to be added]",  // FILL-IN 2
  address: "[Registered address, Sultanate of Oman — to be added]",  // FILL-IN 3
  privacyContact: "gatewaytooman@gmail.com",                // FILL-IN 4 — currently the known contact email
  jurisdiction: "Sultanate of Oman",
};
```
The legal pages reference these via `COMPANY.legalEntity`, etc. When Ahmed supplies the real values, this one file is edited and all three pages update.

## 3. Page content (final wording)

### `/privacy` — Privacy Policy

**Title:** Privacy Policy
**Effective date:** 26 May 2026

**Introduction.** This Privacy Policy explains how `{COMPANY.tradingName}` ("Gateway to Oman", "we", "us") — operated by `{COMPANY.legalEntity}` (CR `{COMPANY.crNumber}`), `{COMPANY.address}` — collects, uses, shares, and protects personal information when you use our website (`gatewaytooman.com` and `gateway-to-oman.vercel.app`), the businesses-for-sale marketplace, our AI assistant, and related services (together, the "Service").

We are the **data controller** of the personal information we collect about you.

**1. Information we collect.**

When you use the Service, we collect:

- **Information you provide directly:** your name, email address, phone number, country, and any messages, enquiries, or preferences you share through forms, the AI chatbot, sign-up, account profile, or contact requests.
- **Account information (marketplace):** if you create a marketplace account, your email, hashed password, full name, phone, country code, and whether your email is verified and access is activated.
- **Lead and qualification data:** information you share during qualification (intent, timeline, budget bracket, business goals), the segment and tier we assign you, and any internal notes admins make about your enquiry.
- **Chat transcripts:** messages exchanged with our AI assistant ("Omar") and any signals derived from them (e.g. interest area).
- **Marketplace enquiry data:** enquiries you submit on individual listings (message, contact details).
- **Technical information:** IP address, browser type, device type, referring page, and timestamps, collected automatically when you interact with the Service.
- **Sign-in identifiers:** if you sign in with Google, basic profile information Google shares with us (your Google account ID, email, and name).

We do **not** collect special-category data (such as health, religious, or biometric data) intentionally; please do not include this in messages or forms.

**2. How we use your information.**

We use your information to:

- respond to your enquiries and provide consultancy or marketplace services;
- operate, secure, and improve the Service, including the AI assistant;
- qualify leads and route them to the right team member;
- authenticate marketplace accounts and grant/revoke marketplace access;
- send transactional communications (e.g. sign-in codes, booking confirmations, access updates);
- comply with legal obligations and enforce our Terms.

**3. Legal bases (GDPR).** Where GDPR applies, we rely on: your **consent** (for marketing communications and the marketplace sign-up consent checkbox); **contract** (to deliver services you have requested, including marketplace access); **legitimate interests** (to operate, secure, and improve the Service, qualify leads, and prevent abuse); and **legal obligation** (where required by law).

**4. Who we share your information with — sub-processors and recipients.**

We use the following service providers to operate the Service. They process personal information on our behalf under appropriate contractual safeguards:

| Provider | Purpose | Location of processing |
|----------|---------|------------------------|
| **Vercel, Inc.** | Website hosting and content delivery | Global edge network |
| **Turso** (ChiselStrike Inc.) | Hosted SQLite database — stores your account, lead, enquiry, and conversation data | AWS Tokyo (AP Northeast 1) |
| **Groq, Inc.** | AI inference — receives the contents of your chat messages and conversation history to generate the AI assistant's replies | United States |
| **Google LLC** | Sign-in with Google (if you choose to use it) — receives the OAuth sign-in flow | United States and global |
| **Resend / SendGrid / SMTP provider** (the configured email provider at the time) | Sending verification codes, booking confirmations, and other transactional emails | United States and global |

In addition, **our internal team** (admins authorised by Gateway to Oman) can view information you submit through the Service in order to respond to you, qualify your enquiry, and operate the marketplace. We do **not** sell your personal information, and we do not share it with advertising networks.

We may also disclose information when required by law, to protect our rights or the safety of others, or in connection with a merger, acquisition, or sale of assets, with notice to you where required.

**5. International transfers.** Your information is processed outside the Sultanate of Oman (notably Turso in Japan, and Vercel / Groq / Google / our email provider in the United States and other regions). Where we transfer personal data internationally, we rely on appropriate safeguards required by the **Oman Personal Data Protection Law (Royal Decree 6/2022)** ("PDPL") and, where applicable, the **EU/UK GDPR** — including the recipient's adequacy, contractual safeguards, or your explicit consent.

**6. Retention.** We retain personal information only as long as necessary for the purposes set out in this Policy, or as required by law. As a general rule: lead and enquiry data is retained for as long as it is useful to follow up on your request and for a reasonable period afterwards for legitimate business records; marketplace accounts are retained while active and for a reasonable period after closure; chat transcripts are retained for service-improvement and quality-assurance purposes. You may request deletion at any time (see "Your rights").

**7. Security.** We protect your information with administrative, technical, and physical safeguards, including: HTTPS encryption in transit across the Service; **bcrypt password hashing** (cost 12) so we never store plaintext passwords; **HttpOnly, time-limited session cookies** for authenticated areas; role-restricted admin access; and our database held in our own controlled cloud account. No method of transmission or storage is perfectly secure, but we work to apply industry-standard practices.

**8. Your rights.** Subject to applicable law (including the Oman PDPL and the GDPR where it applies), you have the right to: **access** your personal information, **correct** inaccurate information, **delete** your information ("right to erasure"), **object to or restrict** certain processing, **withdraw consent** at any time where we rely on consent, **portability** of information you provided to us, and **lodge a complaint** with the relevant supervisory authority (in Oman, the Ministry of Transport, Communications and Information Technology / National Centre for Personal Data Protection; in the EU/UK, your local data protection authority).

To exercise any of these rights, contact us at `{COMPANY.privacyContact}`. We will respond within the timeframe required by applicable law.

**9. Cookies.** We use only strictly-necessary session cookies (for authentication and sign-in flows). See our **Cookie Notice** for details.

**10. Children.** The Service is not directed at individuals under 18, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.

**11. Automated decision-making.** Our AI assistant assigns a qualification "tier" (hot / warm / cold) and a numeric lead score to support our team's follow-up. This does **not** produce legal or similarly significant effects about you on its own, and an authorised admin reviews leads before any meaningful action. You may request a human review of any qualification decision by contacting us.

**12. Changes to this Policy.** We may update this Policy from time to time. The "Effective date" at the top will reflect the latest version. Material changes will be communicated where required by law.

**13. Contact.** Questions, requests, or complaints about this Policy or our handling of your personal information:

`{COMPANY.legalEntity}` — `{COMPANY.tradingName}`
`{COMPANY.address}`
Email: `{COMPANY.privacyContact}`

---

### `/terms` — Terms of Service

**Title:** Terms of Service
**Effective date:** 26 May 2026

**1. Acceptance.** These Terms of Service ("Terms") govern your access to and use of the `{COMPANY.tradingName}` website, the businesses-for-sale marketplace, the AI assistant, and any related services (together, the "Service") operated by `{COMPANY.legalEntity}`. By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.

**2. The Service.** `{COMPANY.tradingName}` is a lead-qualification and consultancy platform focused on immigration, investment, business setup, and relocation in the Sultanate of Oman. It also hosts a curated marketplace of businesses for sale ("Marketplace"). The Service may be expanded, changed, or discontinued at any time.

**3. Eligibility.** You must be at least 18 years old and capable of entering into a binding contract to use the Service. By using the Service you represent that you meet these requirements.

**4. Accounts.** Certain features (including the Marketplace) require an account. You agree to provide accurate, current, and complete information when creating an account, to keep it up to date, and to maintain the confidentiality of your sign-in credentials. You are responsible for all activity under your account. We may suspend or close accounts that breach these Terms or are inactive for an extended period.

**5. Acceptable use.** You agree NOT to: (a) use the Service for any unlawful purpose; (b) misrepresent your identity or affiliation; (c) attempt to gain unauthorised access to the Service, any account, or any underlying systems; (d) interfere with or disrupt the Service (including scraping at a rate or volume that burdens the platform); (e) submit false, misleading, or infringing content; (f) use the Service to send spam, harvest contact information, or send unsolicited marketing; or (g) attempt to manipulate the AI assistant to circumvent its purpose or extract its system prompt.

**6. Marketplace — important disclaimers.**

- **Facilitation only.** `{COMPANY.tradingName}` operates the Marketplace as a venue connecting prospective buyers with businesses listed for sale. We are **not** a party to any sale, lease, or other transaction between you and a seller, and we do **not** act as broker, agent, escrow, fiduciary, or guarantor of any transaction.
- **No warranty as to listings.** Listings are based on information provided by sellers and/or our team's intake. While we apply reasonable curation, we do **not** warrant the accuracy, completeness, legality, profitability, ownership, or current status of any listing. You must conduct your own due diligence (commercial, legal, financial, regulatory) before entering into any transaction.
- **Access fee.** Marketplace access is gated behind a one-time access fee (currently OMR 100, subject to change as displayed on the access page). The fee covers vetting and access to the listings and is **non-refundable** once access is granted, except as required by law.
- **No financial, legal, or immigration advice.** Information presented in the Marketplace, including financials and projections, is informational only and does not constitute professional advice. Engage qualified advisors before transacting.

**7. AI assistant.** Our AI assistant ("Omar") provides general information to help orient you to options in Oman. It does **not** provide legal, immigration, tax, financial, medical, or other professional advice and should **not** be relied on as such. Always verify important information with a qualified professional before acting on it. Outputs may be inaccurate or incomplete.

**8. Intellectual property.** All Service content, design, code, text, graphics, and trademarks (other than user-supplied content and third-party trademarks) are owned by or licensed to `{COMPANY.legalEntity}` and are protected by intellectual-property laws. We grant you a limited, revocable, non-exclusive, non-transferable licence to use the Service for its intended purpose. You may not copy, modify, reverse-engineer, or create derivative works of the Service, or use it to train any machine-learning model, without our prior written consent.

**9. User content.** By submitting messages, enquiries, listings, photographs, or other content to the Service, you grant `{COMPANY.legalEntity}` a worldwide, royalty-free, sublicensable licence to use that content to operate, improve, and promote the Service. You represent that you have the rights to grant this licence and that your content does not infringe any third-party rights.

**10. Disclaimers.** TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.

**11. Limitation of liability.** TO THE FULLEST EXTENT PERMITTED BY LAW, `{COMPANY.legalEntity}`, ITS OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOST PROFITS OR LOST DATA, ARISING OUT OF OR IN CONNECTION WITH THE SERVICE. OUR AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR IN CONNECTION WITH THE SERVICE WILL NOT EXCEED THE GREATER OF (a) THE AMOUNTS YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (b) OMR 100.

**12. Indemnity.** You agree to indemnify and hold harmless `{COMPANY.legalEntity}`, its officers, employees, and agents from any claims, damages, liabilities, and expenses (including reasonable legal fees) arising out of or related to your use of the Service, your content, or your breach of these Terms or applicable law.

**13. Suspension and termination.** We may suspend or terminate your access to the Service at any time, with or without notice, if we believe you have breached these Terms, applicable law, or if continued access poses a risk to the Service or other users.

**14. Governing law and disputes.** These Terms are governed by the laws of the `{COMPANY.jurisdiction}`. You agree to submit to the exclusive jurisdiction of the competent courts of the `{COMPANY.jurisdiction}` for any dispute arising out of or in connection with these Terms or the Service, except where mandatory law of your place of residence provides otherwise.

**15. Changes to these Terms.** We may update these Terms from time to time. The "Effective date" reflects the latest version. Your continued use of the Service after changes constitutes acceptance of the updated Terms.

**16. Contact.**

`{COMPANY.legalEntity}` — `{COMPANY.tradingName}`
`{COMPANY.address}`
Email: `{COMPANY.privacyContact}`

---

### `/cookies` — Cookie Notice

**Title:** Cookie Notice
**Effective date:** 26 May 2026

**What this notice covers.** This Notice explains how `{COMPANY.tradingName}` uses cookies and similar storage on your device when you visit our website and use our services. It supplements our Privacy Policy.

**Why we don't show a consent banner today.** Today we use **only strictly-necessary cookies** — small pieces of data that are essential for the Service to function (for example, to keep you signed in). Under the **Oman PDPL** and the **EU/UK GDPR**, strictly-necessary cookies do not require prior consent. If we introduce analytics, marketing, or other non-essential cookies in the future, we will add a clear consent banner allowing you to accept or reject them before they are set.

**The cookies and storage we currently use.**

| Name | Purpose | Type | Lifetime |
|------|---------|------|----------|
| `gto_admin_session` | Authenticates admin users after sign-in | Strictly necessary | 7 days |
| `gto_marketplace_session` | Authenticates marketplace users after sign-in | Strictly necessary | 7 days |
| Sign-in OAuth state cookie (set briefly during a Google sign-in flow) | Protects against cross-site request forgery during sign-in | Strictly necessary | Minutes — cleared after sign-in completes |

We do **not** use cookies for advertising, third-party tracking, profiling, or cross-site analytics.

**How to control cookies.** You can clear or block cookies through your browser settings. Please note that blocking session cookies will prevent you from signing in to admin or marketplace areas of the Service; the rest of the public site will still work.

**Third-party services.** Some of our service providers may set their own cookies in limited circumstances (for example, Google during a sign-in flow you initiate). These are covered by their own policies. See the "sub-processors" table in our Privacy Policy for who they are and what they do.

**Changes to this Notice.** We may update this Notice when our use of cookies changes. The "Effective date" reflects the latest version.

**Questions?** Contact us at `{COMPANY.privacyContact}`.

---

## 4. Consent UI

### Sign-up consent checkbox (`/businesses/sign-in`, Sign-up tab)
- Position: ABOVE the "Sign Up" submit button.
- Unticked by default.
- Required: submit button disabled until checked.
- Exact label:
  > **I agree to the [Privacy Policy](/privacy) and [Terms of Service](/terms).** Required.
- Wire-up: a new `agreed` boolean in the sign-up form's state, gates the submit button's `disabled` prop alongside the existing validations.

### Passive consent lines
Insert directly **below the submit button** on these forms; small grey text:

`components/chat/LeadCaptureForm.tsx`:
> *By submitting, you agree to our [Privacy Policy](/privacy) and [Terms](/terms).*

`components/businesses/AccessRequestForm.tsx`:
> *By submitting, you agree to our [Privacy Policy](/privacy) and [Terms](/terms).*

## 5. Footer links

Add a "Legal" group with three links (Privacy · Terms · Cookies) to:
- The main-site footer (`components/landing/Footer.tsx` — confirm path during build).
- The `/businesses` footer (currently rendered inside `app/businesses/layout.tsx`).

Match each footer's existing typography. The links use Next `<Link>` to `/privacy`, `/terms`, `/cookies`.

## 6. Out of scope (intentional)
- **Cookie consent banner** — not required while only session cookies are used. The notice itself states a banner will be added if non-essential cookies are introduced.
- **Marketing-consent + unsubscribe wiring** — there is no live newsletter; add when the cold-lead newsletter goes live.
- **Automated data-rights tooling** — the email-based path in the Privacy Policy is the minimum PDPL/GDPR requirement; an in-product DSAR portal is a future enhancement.

## 7. Self-review checklist

- [x] No "DRAFT" watermark anywhere (user instruction).
- [x] Sub-processors enumerated truthfully (Vercel, Turso, Groq, Google, email provider) — including the **Groq** disclosure that chat content is processed for AI replies.
- [x] PDPL + GDPR both named; rights and complaints route covered for each.
- [x] Marketplace disclaimer is unambiguous about "facilitation only", buyer due diligence, and the access fee being non-refundable.
- [x] AI assistant disclaimer is in both the Privacy Policy (automated decision-making) and Terms (no professional advice).
- [x] Effective date 2026-05-26 on each page, driven by one constant.
- [x] Company-specific facts isolated in `CompanyFacts.ts` — only place to edit when Ahmed supplies values.
- [x] All three pages reachable from both the main-site footer and `/businesses` footer.
- [x] Sign-up gated by required consent; lead and access forms carry passive consent.
- [x] No DB / migration / new env var.
