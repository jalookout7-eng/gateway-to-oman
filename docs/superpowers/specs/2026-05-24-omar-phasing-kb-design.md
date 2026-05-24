# Omar Phasing + Knowledge-Base Integration — Design Spec

**Date:** 2026-05-24
**Status:** Approved (design) — pending plan
**Author:** JA / JALAI
**Related:** `delivery/shared/gto-omar-phasing-roadmap.md`, `assets/GTO_KnowledgeBase_BuyerQualification v2.docx`, `delivery/shared/gto-lead-scoring-v1.md`

---

## 1. Context & problem

Omar (the AI advisor) currently:

- Has **no knowledge-base reference layer**. He carries 8 hardcoded "OMAN FACTS" in
  `BASE_PROMPT`, **several of which are factually wrong** (e.g. tells visitors "0%
  corporate tax for first 5 years" — foreign-owned companies actually pay 15%).
- Is only coarsely **surface-aware**: `getSystemPrompt(source)` distinguishes
  `main` vs `businesses`, but neither variant references the KB, and
  `getContextualGreeting()` is called with **no argument**, so the per-page hook is
  never applied (every visitor gets the generic homepage greeting).
- Has a **placeholder** set of businesses qualifying questions, not Azizi's real
  buyer-qualification logic.
- Has **no trust/phasing model** — there is no notion of capabilities being unlocked
  as Omar proves himself.

Ahmed has delivered a knowledge base (v2 docx): **Part 1** = 15 reference topics
(~3,100 words of GTO-wide knowledge), **Part 2** = buyer-qualification logic
(4 questions → HOT/WARM/COLD/JOBS signals + recommended actions, including direct
WhatsApp routing to Azizi for HOT leads).

This spec covers the **"brain layer"**: how Omar reads the KB, how surface-awareness
works, the phasing/trust ladder, qualification wiring, and human handoff — plus a
small **Omar Roadmap** panel on the Intelligence Dashboard so the phasing can be
tracked and advanced.

## 2. Goals / non-goals

**Goals**
1. Give Omar a real, **surface-scoped KB reference layer** (full structured injection).
2. **Reconcile/replace** the wrong hardcoded facts so every fact Omar states is
   KB-grounded.
3. Make Omar genuinely **surface-aware**: correct KB scope, qualifying style, CTAs,
   and per-page greeting hook for main vs businesses (and per-page within those).
4. Implement the **phasing / trust ladder** ("new employee" model), with the active
   phase stored in the backend and advanceable from the dashboard.
5. Wire **Azizi's buyer-qualification logic** into Omar's businesses-surface prompt.
6. Add **WhatsApp handoff** routing for HOT / high-intent visitors.
7. Add an **Omar Roadmap** panel to `/admin/intelligence` to track + advance phases.

**Non-goals (deferred)**
- **Multiple-choice / quick-reply answer UI** (the "guided answers" layer, piece F) —
  its own follow-up spec. Requires a structured message protocol + chat UI components.
- **Admin-editable KB from a UI** — Phase-2 capability; KB ships in code now.
- **Vector/RAG retrieval** — unnecessary at this KB size.
- **Calendar/Calendly integration** — prerequisite for Omar Phase 3, tracked separately.
- Changes to the deterministic `scoreLead` math (kept stable as the precision backstop).

## 3. Architecture & data flow

No new infra, no schema migration (reuses the existing `settings` key/value table).
The feature is **structured data + pure functions + prompt assembly**.

```
lib/ai/
  knowledge-base.ts   NEW  KB_TOPICS[] (15) + BUYER_QUALIFICATION + GTO_REFERENCES.
  surface.ts          NEW  Surface types, resolveSurface(pathname), per-surface config.
  phase.ts            NEW  Phase definitions + getActivePhase()/setActivePhase() (settings).
  prompt-assembler.ts NEW  buildSystemPrompt({surface, phase, context}) — pure.
  whatsapp.ts         NEW  buildWhatsAppHandoff() → wa.me/96895108257?text=…
  prompts.ts          EDIT BASE_PROMPT loses hardcoded facts; getSystemPrompt delegates
                           to assembler; getContextualGreeting gains businesses keys.
  signals.ts          EDIT add [WHATSAPP_HANDOFF] and [KB_GAP] parse + strip.
  scoring.ts          —    unchanged.

app/api/chat/route.ts          EDIT resolve phase (settings) + surface; assemble prompt;
                                    surface whatsappUrl + kbGap in response/DB.
app/api/admin/omar-phase/route.ts  NEW GET (phase + criteria + precision-vs-target),
                                       POST (advance, confirm-guarded, requireAuth).
components/chat/ChatWidget.tsx  EDIT compute finer surface from pathname; pass page key
                                    to getContextualGreeting; render inline WhatsApp link.
app/admin/intelligence/page.tsx EDIT mount Omar Roadmap panel.
components/admin/intelligence/OmarRoadmap.tsx  NEW the roadmap panel + Advance control.
```

**Per-message flow:** `ChatWidget` resolves surface from the URL → POSTs
`{message, sessionId, surface, …}` → route reads active phase from `settings` and
calls `buildSystemPrompt({surface, phase, context})` → assembler emits
BASE + surface variant + surface/phase-scoped KB subset + phase capabilities +
(businesses) qualification playbook → LLM → `parseSignals` (now incl. WhatsApp
handoff + KB gap) → response (incl. `whatsappUrl` when handoff fired) + DB writes.

`buildSystemPrompt` is **pure** → the entire scoping/gating logic is unit-testable
without the LLM.

## 4. KB data model & facts reconciliation

### 4.1 Reference topics (Part 1)

```ts
export type Surface = "main" | "businesses";

export interface KbTopic {
  id: string;            // "tax-compliance"
  title: string;         // "Tax & Compliance Framework"
  body: string;          // concise, corrected facts — neutral, not sales copy
  surfaces: Surface[];   // which surfaces it is injected on
  minPhase: 1 | 2 | 3;   // knowledge gate (all 15 topics are minPhase 1)
}
export const KB_TOPICS: KbTopic[] = [ /* 15 topics, sourced from KB v2 */ ];
```

The 15 topics: professional bio, consultation duration/pricing, booking process,
documents required, engagement timeline, investment advisory, business setup,
immigration/relocation, ownership structures, visa types, investment vehicles, tax &
compliance, long-term residency, Oman-vs-UAE/Qatar, banking. Nearly all are
`surfaces: ["main","businesses"]` (GTO-wide knowledge). Marketplace-mechanic topics
(business-sale engagement timeline, OMR-100/OMR-50 access mechanics) are
`["businesses"]` only.

### 4.2 Buyer-qualification logic (Part 2) — businesses surface

Structured guidance that **shapes how Omar probes and classifies** (not recited):

```ts
export const BUYER_QUALIFICATION = {
  surface: "businesses",
  dualIntentFilter: "buyer is buying a business AND moving to Oman — the key filter",
  hotSignals: [/* defined timeline 6–18mo; capital ready; asks ops/staff/licensing;
                 researched Oman; mentions family/relocation */],
  seriousnessTriggers: [/* license-transfer steps; staff retention; lawyer/accountant;
                          asks audited financials; price not first topic */],
  coldSignals: [/* price-first; visa-only; no timeline; unrealistic ROI 30–40% */],
  keyQuestion: "Are you looking to operate this yourself, or as a passive investment?",
  classification: {
    HOT:  "human handoff (WhatsApp Ahmed / booking) within 24–48h",
    WARM: "nurture with KB topics 9–13; no inquiry-fee push yet; follow up 7–14d",
    COLD: "route to relevant KB topic or Golden Visa page; minimal follow-up",
    JOBS: "canned response + CV link (advisorex.org/resumes)",
  },
};
```

### 4.3 References block

```ts
export const GTO_REFERENCES = {
  whatsapp: "+968 95108257",          // Azizi — HOT handoff
  email: "azizi@alazizigroup.com",
  goldenVisaWaitlist: "https://forms.gle/T9jRY5DSRBtkz4Yv7", // visa-only routing
  cvSubmission: "https://advisorex.org/resumes",              // JOBS routing
};
```

### 4.4 Facts reconciliation (safety fix)

Delete the 8 hardcoded `OMAN FACTS` from `BASE_PROMPT`; correct facts live in topic
bodies. Corrections:

| Current (wrong/unverified) | Corrected per KB v2 | Action |
|---|---|---|
| "0% corporate tax for first 5 years" | 15% foreign-owned; 0% only 100%-Omani qualifying; 3% qualifying SME; 5% VAT; no PIT until 2028 (then 5% over OMR 42k) | Fix → tax topic |
| "100% foreign ownership (changed 2019)" | Up to 100% most sectors, effective **2020**; some strategic sectors restricted | Fix → ownership topic |
| "ITCs from OMR 50,000 + residency" | ITC property qualifies for residency — **no minimum stated** | Drop the number |
| "Businesses for sale OMR 2,500–200,000" | No such range in KB; access is OMR 100/yr + OMR 50/inquiry | Drop (use live listings) |
| "Digital banking licenses from CBO" | Not in KB | Drop |
| "2-hour flight / 2 billion consumers" | Marketing claim, not in KB | Drop |
| "Political neutrality / stability" | KB: "stable political environment" | Keep → residency topic |
| "Family-friendly, affordable, safe, English" | KB Oman-vs-UAE supports lower cost of living | Keep → comparison topic |

## 5. Surface-awareness model

```ts
// lib/ai/surface.ts
export type GreetingKey =
  | "default" | "opportunities" | "services" | "contact"
  | "businesses" | "businesses-listings";

export function resolveSurface(pathname: string): {
  surface: Surface;     // drives KB scope + prompt variant
  page: GreetingKey;    // drives the opening hook
};
```

| Path | `surface` | `page` |
|---|---|---|
| `/` | main | `default` *(unchanged per client)* |
| `/opportunities`, `/services`, `/contact` | main | existing keys |
| `/businesses` (landing) | businesses | `businesses` (new) |
| `/businesses/listings`, `/businesses/listing/*` | businesses | `businesses-listings` (new) |

**What `surface` controls:**

| | Main-site mode | Businesses mode |
|---|---|---|
| KB injected | Part 1 topics tagged `main` | Part 1 (`businesses`) + Part 2 buyer qualification |
| Qualifying style | Broad — all GTO packages | Marketplace buyer — dual-intent, operator-vs-passive |
| CTAs / routing | Relevant service; point to `/businesses` only if buying a business | Marketplace inquiry → booking / WhatsApp handoff |
| Greeting | per `page` key | per `page` key |

The existing `main`/`businesses` prompt-variant split is retained; we feed it scoped
KB and finally wire the greeting. `ChatWidget` upgrades its current
`pathname.startsWith("/businesses")` check to `resolveSurface(pathname)` and passes
the `page` key into `getContextualGreeting(page)`.

## 6. Phasing / trust ladder

Full ladder + philosophy: `delivery/shared/gto-omar-phasing-roadmap.md`.

**Mechanism**
- Active phase stored in `settings` under key `omar_phase` (default `1`) — same
  backend-managed pattern as the reviewer token; no redeploy to advance.
- Phase **definitions** in `lib/ai/phase.ts`:

```ts
export interface PhaseDef {
  phase: 1 | 2 | 3;
  name: string;
  capabilities: { minPhase: 1 | 2 | 3; instruction: string }[];
  unlock: { precisionTarget: number | null; minResolvedLeads: number | null; notes: string };
}
export const PHASES: PhaseDef[];
export async function getActivePhase(db): Promise<1 | 2 | 3>; // reads settings, default 1
export async function setActivePhase(db, n): Promise<void>;    // writes settings
```

- The assembler injects only capabilities where `minPhase <= active phase`.

**Phases (summary):**
- **Phase 1 — Qualifier + Librarian (active):** qualify; answer from KB; classify;
  route hot to human; capture. Cannot quote beyond KB pricing, book autonomously,
  collect docs, advise beyond "verify with team", or negotiate. KB-grounded only
  (emits `[KB_GAP]` on unknowns).
- **Phase 2 — Limited Concierge (locked):** limited customer-service for *process*
  questions + proactively route relocation/visa anxiety to KB 9/10/13.
- **Phase 3 — Scheduler (locked):** books consultations directly (needs calendar
  integration). Anticipated verbatim in KB v2.

Advancement is a **manual human action**, informed by — never driven by — the
dashboard precision metric. Reversible (step-down) if quality drops.

## 7. Qualification logic wiring

- `scoreLead` unchanged (deterministic precision backstop measured by the dashboard).
- **Businesses-surface prompt** gains Azizi's playbook (§4.2): dual-intent filter,
  HOT/seriousness/COLD probes, the operate-vs-passive key question (sharpening
  `[SEGMENT:entrepreneur]` operator vs `[SEGMENT:investor]` passive), and the
  classification→action mapping.
- **JOBS** → canned response + CV link. **Visa-only** → Golden Visa waitlist link.
- **Main surface** keeps broad cross-vertical qualifying (no Part 2).

## 8. WhatsApp routing & handoff

- New signal **`[WHATSAPP_HANDOFF]`** fired for HOT + post-capture / high-intent.
- `lib/ai/whatsapp.ts`:

```ts
export function buildWhatsAppHandoff(input: {
  segment?: string | null; interest?: string | null; surface: Surface;
}): string; // https://wa.me/96895108257?text=<url-encoded prefilled context>
```

- **Delivery (minimal):** route returns `whatsappUrl`; `ChatWidget` renders it as a
  single inline link/button — no structured-options protocol (that's piece F).
- Booking flow (`[BOOKING_DAY/TIME]`) remains the consultation rail; WhatsApp is the
  immediate-intent rail. COLD/visa-only get the Golden Visa link, not Ahmed's WhatsApp.

## 9. Signals additions

`lib/ai/signals.ts` gains, in both `parseSignals` and `stripSignals`:
- `[WHATSAPP_HANDOFF]` → `whatsappHandoff: boolean`.
- `[KB_GAP]` → `kbGap: boolean` (logged on the conversation/message for later
  intelligence — "what couldn't Omar answer").

`Signals` interface extended accordingly; chat route persists `kbGap` and returns
`whatsappHandoff` + `whatsappUrl`.

## 10. Intelligence Dashboard — Omar Roadmap panel

- `app/api/admin/omar-phase/route.ts` (mirrors `reviewer-link` route, `requireAuth`):
  - **GET** → `{ activePhase, phases: PhaseDef[], precision, target, resolvedLeads }`
    (precision/resolvedLeads from the existing intelligence queries).
  - **POST** `{ phase }` → `setActivePhase`; returns new state. Guarded server-side
    (can only step to an adjacent phase; confirm on the client).
- `components/admin/intelligence/OmarRoadmap.tsx`: renders the 3 phases (current
  highlighted), each phase's capabilities + unlock criteria, a progress bar
  (precision vs target), and an **Advance to Phase N** button (confirm dialog, like
  the reviewer shuffle). Mounted on `/admin/intelligence`.
- Pairs with the existing `VersionCard` (`OMAR_VERSION`).

## 11. Testing strategy

Pure-function unit tests (Vitest), run sequentially under load
(`--no-file-parallelism`) per the known worker-timeout gotcha:

- `prompt-assembler`: businesses includes Part 2; main excludes it; **wrong facts
  absent** (no "0% 5-yr tax", no "2019", no "OMR 50,000 ITC", no "2,500–200,000");
  corrected facts present; phase-1 excludes phase-2 capabilities; phase-2 includes them.
- `surface.resolveSurface`: every path → correct `surface` + `page`.
- `whatsapp.buildWhatsAppHandoff`: correct number, URL-encoded prefill, surface-aware text.
- `phase`: `getActivePhase` defaults to 1 with no settings row; `setActivePhase`
  round-trips; assembler respects `minPhase`.
- `signals`: `[WHATSAPP_HANDOFF]` / `[KB_GAP]` parsed and stripped.
- Existing 82 tests stay green.

## 12. Deployment notes

- **No schema migration** — `settings` table already exists; `omar_phase` row is
  created on first write (defaults to 1 when absent).
- Standard prod deploy: `vercel deploy --prod --cwd "<repo>"`.
- Note: the separately-merged intelligence-dashboard (Phase 9) deploy still requires
  `npm run migrate` for its `intelligence_notes` table — track that if deploying both.

## 13. Open decisions / future

- **Precision target + N** for the Phase 1→2 gate — placeholder until enough resolved
  leads exist; set from the dashboard.
- **Admin-editable KB** (move KB from code to DB + admin CRUD) — Phase-2 capability,
  pairs with Omar versioning.
- **Retrieval graduation** — if the KB ever balloons, move from full injection to the
  index + on-demand approach.
- **Step-down policy** — automatic precision-drop detection (manual for now).

## 14. Out of scope (this spec)

- Multiple-choice / quick-reply answer UI (piece F) — separate spec.
- Calendar integration (Omar Phase 3 prerequisite).
- The broader pending fixes (media uploads/Cloudflare, lead-column editing, AI lead
  summaries, booking calendar mobile + Calendly, security/scaling, sign-up phone code
  + OTP, Poppins font) — tracked in the build log / meeting-notes audit.
