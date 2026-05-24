# Omar Phasing + Knowledge-Base Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Omar a surface-scoped knowledge-base reference layer, fix the wrong facts he states today, wire in Azizi's buyer-qualification logic, add WhatsApp handoff for hot leads, and ship a settings-backed phasing/trust ladder that's tracked + advanced from the intelligence dashboard.

**Architecture:** Structured data + pure functions + prompt assembly — no schema migration (reuses the existing `settings` key/value table). A pure `buildSystemPrompt({surface, phase, context})` composes `BASE_PROMPT` + the surface variant + a surface/phase-scoped KB subset + phase capabilities + (businesses) Azizi qualification. The chat route reads the active phase from `settings` and passes it in. A small admin route + dashboard panel surface and advance the phase.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@libsql/client` (Turso), Vitest, groq-sdk (LLM), lucide-react, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-24-omar-phasing-kb-design.md`
**Living roadmap:** `delivery/shared/gto-omar-phasing-roadmap.md`

**Conventions for every task:**
- Tests live under `tests/ai/`. Run a single test file with:
  `npx vitest run tests/ai/<file>.test.ts --no-file-parallelism`
  (the `--no-file-parallelism` flag avoids vitest worker-spawn timeouts under Drive-sync/VS load — a known gotcha in this repo).
- Pure-logic modules get full TDD. React components and the chat route follow the repo convention (logic tested, components verified via `npm run build`).
- Commit after each task with the message shown.

---

## File structure

| File | New/Edit | Responsibility |
|------|----------|----------------|
| `lib/ai/surface.ts` | New | `Surface`/`GreetingKey` types, `resolveSurface(pathname)` |
| `lib/ai/knowledge-base.ts` | New | `KB_TOPICS`, `BUYER_QUALIFICATION`, `GTO_REFERENCES` |
| `lib/ai/phase.ts` | New | `PHASES`, `getActivePhase`/`setActivePhase`, `capabilitiesFor`, `getPhaseProgress` |
| `lib/ai/whatsapp.ts` | New | `buildWhatsAppHandoff()` |
| `lib/ai/prompts.ts` | Edit | Remove hardcoded facts; KB-grounding rules; new greeting keys; export base + variants |
| `lib/ai/prompt-assembler.ts` | New | Pure `buildSystemPrompt({surface, phase, context})` |
| `lib/ai/signals.ts` | Edit | Parse/strip `[WHATSAPP_HANDOFF]` + `[KB_GAP]` |
| `app/api/chat/route.ts` | Edit | Resolve phase + surface, assemble prompt, return `whatsappUrl`, log `kbGap` |
| `components/chat/WhatsAppHandoffButton.tsx` | New | Inline WhatsApp CTA (mirrors `BookingButton`) |
| `components/chat/ChatWidget.tsx` | Edit | `resolveSurface`, per-page greeting, render WhatsApp CTA |
| `app/api/admin/omar-phase/route.ts` | New | GET phase+progress / POST advance (requireAuth) |
| `components/admin/intelligence/OmarRoadmap.tsx` | New | Roadmap panel + Advance control |
| `app/admin/intelligence/page.tsx` | Edit | Mount `OmarRoadmap` |

---

## Task 1: Surface resolution (`lib/ai/surface.ts`)

**Files:**
- Create: `lib/ai/surface.ts`
- Test: `tests/ai/surface.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/surface.test.ts
import { describe, it, expect } from "vitest";
import { resolveSurface } from "@/lib/ai/surface";

describe("resolveSurface", () => {
  it("homepage → main / default", () => {
    expect(resolveSurface("/")).toEqual({ surface: "main", page: "default" });
  });
  it("main sub-pages keep their greeting key", () => {
    expect(resolveSurface("/opportunities")).toEqual({ surface: "main", page: "opportunities" });
    expect(resolveSurface("/services")).toEqual({ surface: "main", page: "services" });
    expect(resolveSurface("/contact")).toEqual({ surface: "main", page: "contact" });
  });
  it("businesses landing → businesses / businesses", () => {
    expect(resolveSurface("/businesses")).toEqual({ surface: "businesses", page: "businesses" });
  });
  it("listings + listing detail → businesses-listings", () => {
    expect(resolveSurface("/businesses/listings")).toEqual({ surface: "businesses", page: "businesses-listings" });
    expect(resolveSurface("/businesses/listing/some-slug")).toEqual({ surface: "businesses", page: "businesses-listings" });
  });
  it("unknown path → main / default", () => {
    expect(resolveSurface("/anything-else")).toEqual({ surface: "main", page: "default" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/surface.test.ts --no-file-parallelism`
Expected: FAIL — cannot find module `@/lib/ai/surface`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ai/surface.ts
export type Surface = "main" | "businesses";

export type GreetingKey =
  | "default"
  | "opportunities"
  | "services"
  | "contact"
  | "businesses"
  | "businesses-listings";

export interface SurfaceResolution {
  surface: Surface;
  page: GreetingKey;
}

/** Map a pathname to the chat surface (KB scope + prompt variant) and greeting key. */
export function resolveSurface(pathname: string): SurfaceResolution {
  const path = pathname || "/";
  if (path.startsWith("/businesses/listing")) {
    return { surface: "businesses", page: "businesses-listings" };
  }
  if (path.startsWith("/businesses")) {
    return { surface: "businesses", page: "businesses" };
  }
  if (path.startsWith("/opportunities")) return { surface: "main", page: "opportunities" };
  if (path.startsWith("/services")) return { surface: "main", page: "services" };
  if (path.startsWith("/contact")) return { surface: "main", page: "contact" };
  return { surface: "main", page: "default" };
}
```

> Note: `/businesses/listings` and `/businesses/listing/<slug>` both match `startsWith("/businesses/listing")`, so the order above is correct — check the `listing` prefix before the generic `/businesses`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/surface.test.ts --no-file-parallelism`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/surface.ts tests/ai/surface.test.ts
git commit -m "feat(ai): surface resolution for Omar (KB scope + greeting key)"
```

---

## Task 2: Knowledge-base data (`lib/ai/knowledge-base.ts`)

**Files:**
- Create: `lib/ai/knowledge-base.ts`
- Test: `tests/ai/knowledge-base.test.ts`
- Source content: `assets/_extracted_knowledgebase_v2.txt` (already extracted from Ahmed's KB v2 docx; lives in the client `assets/` folder one level up from the repo). Apply the corrections in spec §4.4.

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/knowledge-base.test.ts
import { describe, it, expect } from "vitest";
import { KB_TOPICS, BUYER_QUALIFICATION, GTO_REFERENCES } from "@/lib/ai/knowledge-base";

describe("KB_TOPICS", () => {
  it("has all 15 topics, each well-formed", () => {
    expect(KB_TOPICS).toHaveLength(15);
    for (const t of KB_TOPICS) {
      expect(t.id).toMatch(/^[a-z0-9-]+$/);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(40);
      expect(t.surfaces.length).toBeGreaterThan(0);
      expect(t.minPhase).toBe(1);
    }
  });

  it("ids are unique", () => {
    const ids = KB_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the business-sale engagement timeline is businesses-only", () => {
    const t = KB_TOPICS.find((x) => x.id === "engagement-timeline");
    expect(t?.surfaces).toEqual(["businesses"]);
  });

  it("tax facts are corrected (15% foreign-owned, no '0% for 5 years')", () => {
    const tax = KB_TOPICS.find((x) => x.id === "tax-compliance");
    expect(tax).toBeDefined();
    expect(tax!.body).toMatch(/15%/);
    expect(tax!.body.toLowerCase()).not.toContain("0% corporate tax for first 5 years");
    expect(tax!.body.toLowerCase()).not.toContain("first 5 years");
  });

  it("ownership facts are corrected (effective 2020, not 2019)", () => {
    const own = KB_TOPICS.find((x) => x.id === "ownership-structures");
    expect(own!.body).toContain("2020");
    expect(own!.body).not.toContain("2019");
  });

  it("no topic repeats the dropped/unverified claims", () => {
    const all = KB_TOPICS.map((t) => t.body).join("\n").toLowerCase();
    expect(all).not.toContain("2 billion consumers");
    expect(all).not.toContain("omr 50,000"); // unverified ITC minimum
  });
});

describe("BUYER_QUALIFICATION", () => {
  it("is businesses-surface and has all four classifications", () => {
    expect(BUYER_QUALIFICATION.surface).toBe("businesses");
    expect(Object.keys(BUYER_QUALIFICATION.classification).sort()).toEqual(["COLD", "HOT", "JOBS", "WARM"]);
    expect(BUYER_QUALIFICATION.keyQuestion.toLowerCase()).toContain("operate");
  });
});

describe("GTO_REFERENCES", () => {
  it("carries Azizi's contact + routing links", () => {
    expect(GTO_REFERENCES.whatsappE164).toBe("96895108257");
    expect(GTO_REFERENCES.goldenVisaWaitlist).toContain("forms.gle");
    expect(GTO_REFERENCES.cvSubmission).toContain("advisorex.org");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/knowledge-base.test.ts --no-file-parallelism`
Expected: FAIL — cannot find module `@/lib/ai/knowledge-base`.

- [ ] **Step 3: Write the implementation**

Create `lib/ai/knowledge-base.ts`. Define the shapes, then populate the 15 topics by transcribing each from `assets/_extracted_knowledgebase_v2.txt`, using the id/title/surfaces table below and applying spec §4.4 corrections. Two topics are fully written here (the corrected ones) — follow the same shape for the rest.

```ts
// lib/ai/knowledge-base.ts
import type { Surface } from "./surface";

export interface KbTopic {
  id: string;
  title: string;
  body: string;
  surfaces: Surface[];
  minPhase: 1 | 2 | 3;
}

const BOTH: Surface[] = ["main", "businesses"];

export const KB_TOPICS: KbTopic[] = [
  // 1
  { id: "professional-bio", title: "About Gateway to Oman & Azizi Al Azizi", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 1 from source>" },
  // 2
  { id: "consultation-pricing", title: "Consultation Duration & Pricing", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 2>" },
  // 3
  { id: "booking-process", title: "Consultation Booking Process", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 3>" },
  // 4
  { id: "documents-required", title: "Documents Required from Clients", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 4 — note: Omar informs, does not collect>" },
  // 5  (businesses-only)
  { id: "engagement-timeline", title: "Engagement Timeline — Business Sale", surfaces: ["businesses"], minPhase: 1,
    body: "<transcribe topic 5>" },
  // 6
  { id: "investment-advisory", title: "Investment Advisory Service", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 6>" },
  // 7
  { id: "business-setup", title: "Business Setup Service", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 7>" },
  // 8
  { id: "immigration-relocation", title: "Immigration & Relocation Service", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 8>" },
  // 9  (CORRECTED — fully written)
  { id: "ownership-structures", title: "Ownership Structures — Foreign Ownership Rules", surfaces: BOTH, minPhase: 1,
    body:
      "Oman has progressively liberalised foreign ownership under the Foreign Capital Investment Law. " +
      "Foreign investors can own up to 100% of companies in most sectors, effective from 2020 onwards under Royal Decree. " +
      "Some strategic sectors (defense, media, certain utilities) remain restricted or require an Omani partner. " +
      "Companies in Special Economic Zones such as Duqm and Salalah have additional benefits and ownership flexibility. " +
      "The most common structure for foreign investors is the Limited Liability Company (LLC); branch and representative offices are also available. " +
      "For current sector-specific restrictions, the official Invest in Oman portal (investinoman.gov.om) is the reference; GTO can facilitate that introduction." },
  // 10
  { id: "visa-types", title: "Visa Types — Investor, Residency & Family", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 10>" },
  // 11
  { id: "investment-vehicles", title: "Investment Vehicles Available in Oman", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 11 — keep ITC residency-eligibility, DO NOT state an OMR 50,000 minimum>" },
  // 12  (CORRECTED — fully written)
  { id: "tax-compliance", title: "Tax & Compliance Framework", surfaces: BOTH, minPhase: 1,
    body:
      "Corporate Income Tax in Oman has three rates: 0% for 100%-Omani-owned companies meeting all qualifying conditions, " +
      "3% for qualifying SMEs, and 15% for all other companies including foreign-owned ones. Foreign investors and joint " +
      "ventures with foreign ownership should expect the standard 15% rate. " +
      "VAT is 5% (introduced April 2021); registration is mandatory above OMR 38,500 in annual taxable supplies. " +
      "Withholding tax applies to certain payments to foreign entities; the rate depends on any Double Taxation Agreement. " +
      "A Personal Income Tax takes effect in 2028 at 5% on individual income above OMR 42,000/year — Oman remains one of the " +
      "lowest personal-tax environments in the GCC even after this. " +
      "Businesses must register with the Tax Authority within 60 days of commencing operations and file annual returns. " +
      "Official source: tms.taxoman.gov.om." },
  // 13
  { id: "long-term-residency", title: "Long-Term Residency Planning", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 13 — keep 'stable political environment'>" },
  // 14
  { id: "oman-comparison", title: "Oman vs UAE / Qatar — Honest Comparison", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 14 — keep lower cost of living vs UAE/Qatar>" },
  // 15
  { id: "banking", title: "Banking for Foreign Investors", surfaces: BOTH, minPhase: 1,
    body: "<transcribe topic 15>" },
];

export interface BuyerQualification {
  surface: Surface;
  dualIntentFilter: string;
  hotSignals: string[];
  seriousnessTriggers: string[];
  coldSignals: string[];
  keyQuestion: string;
  classification: Record<"HOT" | "WARM" | "COLD" | "JOBS", string>;
}

export const BUYER_QUALIFICATION: BuyerQualification = {
  surface: "businesses",
  dualIntentFilter:
    "A marketplace buyer here is buying a business AND moving to Oman. That dual intent is the key filter.",
  hotSignals: [
    "defined timeline (moving/operating within 6–18 months)",
    "capital available, not just 'exploring financing'",
    "asks about operations, staff, licensing — not just price and returns",
    "has researched Oman or has a prior connection",
    "mentions family or relocation context",
  ],
  seriousnessTriggers: [
    "asks the steps to transfer ownership / get the license in their name",
    "asks about staff retention or management continuity",
    "mentions involving a lawyer, accountant, or advisor",
    "asks for audited financials or proof of revenue",
    "does not make price the first or only topic",
  ],
  coldSignals: [
    "price-first questions",
    "visa-only interest (using the marketplace as a back-door to residency)",
    "no timeline",
    "unrealistic ROI expectations (30–40% annual)",
  ],
  keyQuestion: "Are you looking to operate this business yourself, or are you looking for a passive investment?",
  classification: {
    HOT: "Connect to Ahmed directly (WhatsApp handoff / book within 24–48h). Embed [WHATSAPP_HANDOFF] after capture.",
    WARM: "Nurture with knowledge-base content (residency, visas, ownership, tax, long-term residency). Do not push the inquiry fee yet.",
    COLD: "Point to the relevant knowledge-base topic or the Golden Visa waitlist. Keep it brief.",
    JOBS: "GTO's jobs platform is in development — invite them to submit a CV at the careers link; do not qualify them as a buyer.",
  },
};

export const GTO_REFERENCES = {
  whatsappDisplay: "+968 95108257",
  whatsappE164: "96895108257", // for wa.me links — country code + number, no '+' or spaces
  email: "azizi@alazizigroup.com",
  goldenVisaWaitlist: "https://forms.gle/T9jRY5DSRBtkz4Yv7",
  cvSubmission: "https://advisorex.org/resumes",
} as const;
```

**Topic transcription table** (apply when filling `<transcribe …>` from the source file):

| # | id | title | surfaces | corrections |
|---|----|-------|----------|-------------|
| 1 | professional-bio | About GTO & Azizi | both | — |
| 2 | consultation-pricing | Consultation Duration & Pricing | both | — |
| 3 | booking-process | Consultation Booking Process | both | — |
| 4 | documents-required | Documents Required | both | Omar informs, never collects |
| 5 | engagement-timeline | Engagement Timeline — Business Sale | **businesses** | — |
| 6 | investment-advisory | Investment Advisory Service | both | — |
| 7 | business-setup | Business Setup Service | both | — |
| 8 | immigration-relocation | Immigration & Relocation Service | both | — |
| 9 | ownership-structures | Ownership Structures | both | **2020 not 2019** (written above) |
| 10 | visa-types | Visa Types | both | — |
| 11 | investment-vehicles | Investment Vehicles | both | **no OMR 50,000 ITC minimum** |
| 12 | tax-compliance | Tax & Compliance | both | **15% foreign-owned** (written above) |
| 13 | long-term-residency | Long-Term Residency Planning | both | — |
| 14 | oman-comparison | Oman vs UAE/Qatar | both | — |
| 15 | banking | Banking for Foreign Investors | both | — |

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/knowledge-base.test.ts --no-file-parallelism`
Expected: PASS (all assertions). If a `<transcribe>` body is still a placeholder, the `body.length > 40` check will fail — that's the guard that forces real content.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/knowledge-base.ts tests/ai/knowledge-base.test.ts
git commit -m "feat(ai): structured KB (15 topics, corrected facts) + buyer qualification + references"
```

---

## Task 3: Phasing model (`lib/ai/phase.ts`)

**Files:**
- Create: `lib/ai/phase.ts`
- Test: `tests/ai/phase.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/phase.test.ts
import { describe, it, expect } from "vitest";
import { makeTestDb, seedLead } from "../intelligence/helpers";
import {
  PHASES, DEFAULT_PHASE, capabilitiesFor, guardrailsFor,
  getActivePhase, setActivePhase, getPhaseProgress,
} from "@/lib/ai/phase";

describe("phase definitions", () => {
  it("has three phases, the first being Qualifier + Librarian", () => {
    expect(PHASES.map((p) => p.phase)).toEqual([1, 2, 3]);
    expect(PHASES[0].name).toMatch(/Qualifier/i);
  });
  it("capabilitiesFor accumulates lower-phase capabilities", () => {
    const p1 = capabilitiesFor(1);
    const p2 = capabilitiesFor(2);
    expect(p1.length).toBeGreaterThan(0);
    expect(p2.length).toBeGreaterThan(p1.length); // phase 2 unlocks more
    expect(p1.every((c) => p2.includes(c))).toBe(true);
  });
  it("guardrailsFor returns the active phase restrictions", () => {
    expect(guardrailsFor(1).join(" ")).toMatch(/book|schedule/i);
  });
});

describe("active phase (settings-backed)", () => {
  it("defaults to 1 when no row exists, and round-trips", async () => {
    const db = await makeTestDb();
    expect(await getActivePhase(db)).toBe(DEFAULT_PHASE);
    await setActivePhase(db, 2);
    expect(await getActivePhase(db)).toBe(2);
  });
});

describe("getPhaseProgress", () => {
  it("reports active phase, resolved leads, and hot precision", async () => {
    const db = await makeTestDb();
    await seedLead(db, { qualification: "hot", outcome: "converted" });
    await seedLead(db, { qualification: "hot", outcome: "rejected" });
    const prog = await getPhaseProgress(db);
    expect(prog.activePhase).toBe(1);
    expect(prog.resolvedLeads).toBe(2);
    expect(prog.hotPrecisionPct).toBe(50); // 1 of 2 hot converted
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/phase.test.ts --no-file-parallelism`
Expected: FAIL — cannot find module `@/lib/ai/phase`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ai/phase.ts
import type { Client } from "@libsql/client";
import { getTierPrecision, getDataCoverage } from "@/lib/intelligence/queries";

export type PhaseNumber = 1 | 2 | 3;
export const DEFAULT_PHASE: PhaseNumber = 1;
const SETTINGS_KEY = "omar_phase";

export interface PhaseCapability { minPhase: PhaseNumber; instruction: string; }

export interface PhaseDef {
  phase: PhaseNumber;
  name: string;
  summary: string;
  capabilities: PhaseCapability[];
  guardrails: string[]; // active restrictions AT this phase
  unlock: { precisionTarget: number | null; minResolvedLeads: number | null; notes: string };
}

export const PHASES: PhaseDef[] = [
  {
    phase: 1,
    name: "Qualifier + Librarian",
    summary: "Qualify visitors and answer their questions accurately from the knowledge base.",
    capabilities: [
      { minPhase: 1, instruction: "Ask targeted qualifying questions to learn whether Oman is the right fit." },
      { minPhase: 1, instruction: "Answer visitor questions using only the knowledge base provided above." },
      { minPhase: 1, instruction: "Classify the visitor (hot/warm/cold/jobs) and route them to the right next step." },
      { minPhase: 1, instruction: "Capture the lead's details once you have enough context." },
    ],
    guardrails: [
      "Do not promise or quote anything beyond what the knowledge base states.",
      "Do not book or schedule on Ahmed's behalf — offer the WhatsApp handoff or the booking option instead.",
      "Do not collect documents — you may say what's needed, but documents go to the team directly.",
      "Do not give legal, tax, or financial advice beyond the knowledge base; tell visitors to verify specifics with the team.",
    ],
    unlock: { precisionTarget: null, minResolvedLeads: null, notes: "Set once enough resolved leads exist to set a credible bar." },
  },
  {
    phase: 2,
    name: "Limited Concierge",
    summary: "Adds limited customer-service: walk visitors through process questions and ease relocation/visa anxiety.",
    capabilities: [
      { minPhase: 2, instruction: "Walk visitors through process questions (required documents, license-transfer steps, typical timelines) using the knowledge base." },
      { minPhase: 2, instruction: "Proactively ease relocation and visa anxiety by pointing warm visitors to the relevant residency, visa, and ownership topics." },
    ],
    guardrails: [
      "Do not book or schedule on Ahmed's behalf — offer the WhatsApp handoff or the booking option instead.",
      "Do not collect documents — you may say what's needed, but documents go to the team directly.",
      "Do not give legal, tax, or financial advice beyond the knowledge base; tell visitors to verify specifics with the team.",
    ],
    unlock: { precisionTarget: null, minResolvedLeads: null, notes: "Sustained precision + low KB-gap rate + Ahmed sign-off." },
  },
  {
    phase: 3,
    name: "Scheduler",
    summary: "Omar books consultations directly into Ahmed's calendar (needs calendar integration).",
    capabilities: [
      { minPhase: 3, instruction: "Offer to book a consultation directly into Ahmed's calendar when a visitor is ready." },
    ],
    guardrails: [
      "Do not collect documents — you may say what's needed, but documents go to the team directly.",
      "Do not give legal, tax, or financial advice beyond the knowledge base; tell visitors to verify specifics with the team.",
    ],
    unlock: { precisionTarget: null, minResolvedLeads: null, notes: "Sustained precision + booking accuracy." },
  },
];

/** Flattened capability instructions available at the given phase. */
export function capabilitiesFor(phase: PhaseNumber): string[] {
  return PHASES.flatMap((p) => p.capabilities)
    .filter((c) => c.minPhase <= phase)
    .map((c) => c.instruction);
}

/** Active restrictions at the given phase. */
export function guardrailsFor(phase: PhaseNumber): string[] {
  return PHASES.find((p) => p.phase === phase)?.guardrails ?? PHASES[0].guardrails;
}

function coercePhase(raw: unknown): PhaseNumber {
  const n = Number(raw);
  return n === 2 || n === 3 ? n : DEFAULT_PHASE;
}

/** Read the active phase from the settings table (defaults to 1). */
export async function getActivePhase(db: Client): Promise<PhaseNumber> {
  const res = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [SETTINGS_KEY] });
  const v = res.rows[0]?.value;
  return typeof v === "string" && v.length > 0 ? coercePhase(v) : DEFAULT_PHASE;
}

/** Set the active phase (settings upsert). */
export async function setActivePhase(db: Client, phase: PhaseNumber): Promise<void> {
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [SETTINGS_KEY, String(phase)],
  });
}

export interface PhaseProgress {
  activePhase: PhaseNumber;
  resolvedLeads: number;
  hotPrecisionPct: number | null; // % of hot-graded leads that converted
  nextTarget: number | null;      // precision target to unlock the next phase
}

/** Roadmap progress for the dashboard panel. */
export async function getPhaseProgress(db: Client): Promise<PhaseProgress> {
  const activePhase = await getActivePhase(db);
  const coverage = await getDataCoverage(db);
  const tiers = await getTierPrecision(db);
  const hot = tiers.find((t) => t.tier === "hot");
  const next = PHASES.find((p) => p.phase === ((activePhase + 1) as PhaseNumber));
  return {
    activePhase,
    resolvedLeads: coverage.resolved,
    hotPrecisionPct: hot?.convertedPct ?? null,
    nextTarget: next?.unlock.precisionTarget ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/phase.test.ts --no-file-parallelism`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/phase.ts tests/ai/phase.test.ts
git commit -m "feat(ai): settings-backed Omar phasing model + dashboard progress"
```

---

## Task 4: WhatsApp handoff link (`lib/ai/whatsapp.ts`)

**Files:**
- Create: `lib/ai/whatsapp.ts`
- Test: `tests/ai/whatsapp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/whatsapp.test.ts
import { describe, it, expect } from "vitest";
import { buildWhatsAppHandoff } from "@/lib/ai/whatsapp";

describe("buildWhatsAppHandoff", () => {
  it("targets Azizi's wa.me number with a prefilled, encoded message", () => {
    const url = buildWhatsAppHandoff({ segment: "investor", interest: "F&B acquisition", surface: "businesses" });
    expect(url.startsWith("https://wa.me/96895108257?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("investor");
    expect(text).toContain("F&B acquisition");
    expect(text.toLowerCase()).toContain("marketplace");
  });

  it("works with no segment/interest", () => {
    const url = buildWhatsAppHandoff({ surface: "main" });
    expect(url.startsWith("https://wa.me/96895108257?text=")).toBe(true);
    expect(() => decodeURIComponent(url.split("text=")[1])).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/whatsapp.test.ts --no-file-parallelism`
Expected: FAIL — cannot find module `@/lib/ai/whatsapp`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ai/whatsapp.ts
import { GTO_REFERENCES } from "./knowledge-base";
import type { Surface } from "./surface";

export interface WhatsAppHandoffInput {
  segment?: string | null;
  interest?: string | null;
  surface: Surface;
}

/** Build a wa.me deep link to Azizi, prefilled with the lead's gist. */
export function buildWhatsAppHandoff(input: WhatsAppHandoffInput): string {
  const parts = [
    "Hi Ahmed — I'm a serious lead from the Gateway to Oman site.",
    input.segment ? `Profile: ${input.segment}.` : "",
    input.interest ? `Interested in: ${input.interest}.` : "",
    input.surface === "businesses"
      ? "Source: businesses-for-sale marketplace."
      : "Source: main Gateway to Oman site.",
  ].filter(Boolean);
  const text = encodeURIComponent(parts.join(" "));
  return `https://wa.me/${GTO_REFERENCES.whatsappE164}?text=${text}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/whatsapp.test.ts --no-file-parallelism`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/whatsapp.ts tests/ai/whatsapp.test.ts
git commit -m "feat(ai): WhatsApp handoff link builder for hot leads"
```

---

## Task 5: Edit `lib/ai/prompts.ts` — remove hardcoded facts, add KB-grounding rules + greeting keys

**Files:**
- Modify: `lib/ai/prompts.ts`
- Test: `tests/ai/greeting.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/greeting.test.ts
import { describe, it, expect } from "vitest";
import { getContextualGreeting, BASE_PROMPT, MAIN_SITE_VARIANT, BUSINESSES_VARIANT } from "@/lib/ai/prompts";

describe("getContextualGreeting", () => {
  it("has per-surface businesses hooks", () => {
    const biz = getContextualGreeting("businesses");
    const listings = getContextualGreeting("businesses-listings");
    expect(biz).not.toEqual(getContextualGreeting("default"));
    expect(listings).not.toEqual(getContextualGreeting("default"));
    expect(biz.length).toBeGreaterThan(0);
    expect(listings.length).toBeGreaterThan(0);
  });
  it("falls back to default for unknown keys", () => {
    expect(getContextualGreeting(undefined)).toEqual(getContextualGreeting("default"));
  });
});

describe("BASE_PROMPT no longer carries wrong hardcoded facts", () => {
  it("drops the OMAN FACTS block and its incorrect tax claim", () => {
    expect(BASE_PROMPT).not.toContain("0% corporate tax for first 5 years");
    expect(BASE_PROMPT).not.toContain("## OMAN FACTS");
  });
  it("instructs KB-grounding + KB_GAP", () => {
    expect(BASE_PROMPT).toContain("[KB_GAP]");
    expect(BASE_PROMPT).toContain("[WHATSAPP_HANDOFF]");
  });
  it("still exports the surface variants", () => {
    expect(MAIN_SITE_VARIANT.length).toBeGreaterThan(0);
    expect(BUSINESSES_VARIANT.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/greeting.test.ts --no-file-parallelism`
Expected: FAIL — `BASE_PROMPT`/`MAIN_SITE_VARIANT` not exported, or greeting keys missing.

- [ ] **Step 3: Edit `lib/ai/prompts.ts`**

3a. **Export** `BASE_PROMPT`, `MAIN_SITE_VARIANT`, `BUSINESSES_VARIANT` (change `const BASE_PROMPT` → `export const BASE_PROMPT`, same for the two variants).

3b. **Delete** the `## OMAN FACTS` section (the heading line through the 8 bullet lines, currently lines ~108–119).

3c. **Replace** it with this KB-grounding section (same location):

```ts
## USING YOUR KNOWLEDGE

Everything you state about Oman — tax, ownership, visas, pricing, banking, timelines —
must come from the KNOWLEDGE BASE section provided below your role description. Never
invent figures or dates. One relevant fact per exchange at most, and only when it
answers what the visitor asked. Never recite the knowledge base. Never use it to sell.

If a visitor asks something the knowledge base does not cover, say you'll have the team
confirm it rather than guessing — and embed [KB_GAP] at the very end of that message.
```

3d. In the `## SIGNALS` list, **add** these two lines (after `[CLOSE_CHAT]`):

```ts
[KB_GAP] — the visitor asked something the knowledge base doesn't cover; you deferred to the team
[WHATSAPP_HANDOFF] — a HOT, ready-to-talk visitor should be connected to Ahmed directly on WhatsApp (businesses surface, after capture)
```

3e. **Add** the two greeting keys to `getContextualGreeting`'s `greetings` record:

```ts
    businesses:
      "Welcome to the businesses-for-sale marketplace. Are you looking to buy a business to run yourself, or as an investment — and is moving to Oman part of the plan?",
    "businesses-listings":
      "Browsing the listings? Tell me the kind of business you're after and your rough budget, and I'll tell you straight whether it's a fit — and what the move to Oman would involve.",
```

3f. Leave `getSystemPrompt` in place for now (Task 6 supersedes its callers); it stays valid because the variants still exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/greeting.test.ts --no-file-parallelism`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/prompts.ts tests/ai/greeting.test.ts
git commit -m "feat(ai): drop wrong hardcoded facts, add KB-grounding rules + per-surface greetings"
```

---

## Task 6: Prompt assembler (`lib/ai/prompt-assembler.ts`)

**Files:**
- Create: `lib/ai/prompt-assembler.ts`
- Test: `tests/ai/prompt-assembler.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/prompt-assembler.test.ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/prompt-assembler";

describe("buildSystemPrompt", () => {
  it("injects KB topics scoped to the surface", () => {
    const main = buildSystemPrompt({ surface: "main", phase: 1 });
    const biz = buildSystemPrompt({ surface: "businesses", phase: 1 });
    // businesses-only topic appears only on businesses
    expect(biz).toContain("Engagement Timeline");
    expect(main).not.toContain("Engagement Timeline");
    // shared topic appears on both
    expect(main).toContain("Tax & Compliance");
    expect(biz).toContain("Tax & Compliance");
  });

  it("includes the buyer-qualification playbook only on businesses", () => {
    expect(buildSystemPrompt({ surface: "businesses", phase: 1 })).toMatch(/operate this business yourself/i);
    expect(buildSystemPrompt({ surface: "main", phase: 1 })).not.toMatch(/operate this business yourself/i);
  });

  it("never leaks the corrected-away wrong facts", () => {
    for (const surface of ["main", "businesses"] as const) {
      const p = buildSystemPrompt({ surface, phase: 1 });
      expect(p).not.toContain("0% corporate tax for first 5 years");
      expect(p).not.toContain("2 billion consumers");
      expect(p.toLowerCase()).not.toContain("omr 50,000");
    }
  });

  it("gates capabilities by phase", () => {
    const p1 = buildSystemPrompt({ surface: "businesses", phase: 1 });
    const p2 = buildSystemPrompt({ surface: "businesses", phase: 2 });
    expect(p1).not.toMatch(/license-transfer steps/i); // phase-2 capability
    expect(p2).toMatch(/license-transfer steps/i);
  });

  it("appends booking/intent context when provided", () => {
    const p = buildSystemPrompt({ surface: "main", phase: 1, context: { intent: "consultation", availability: "[AVAILABLE_DAYS: Mon]" } });
    expect(p).toContain("[AVAILABLE_DAYS: Mon]");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/prompt-assembler.test.ts --no-file-parallelism`
Expected: FAIL — cannot find module `@/lib/ai/prompt-assembler`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/ai/prompt-assembler.ts
import { BASE_PROMPT, MAIN_SITE_VARIANT, BUSINESSES_VARIANT } from "./prompts";
import { KB_TOPICS, BUYER_QUALIFICATION, GTO_REFERENCES } from "./knowledge-base";
import { capabilitiesFor, guardrailsFor, type PhaseNumber } from "./phase";
import type { Surface } from "./surface";

export interface AssembleContext {
  intent?: string;
  topic?: string;
  availability?: string; // pre-fetched availability fragment, if any
}

export interface AssembleInput {
  surface: Surface;
  phase: PhaseNumber;
  context?: AssembleContext;
}

function renderKb(surface: Surface, phase: PhaseNumber): string {
  const topics = KB_TOPICS.filter((t) => t.surfaces.includes(surface) && t.minPhase <= phase);
  const blocks = topics.map((t) => `### ${t.title}\n${t.body}`).join("\n\n");
  return `## KNOWLEDGE BASE\n\nUse these to answer accurately. ${blocks}`;
}

function renderQualification(): string {
  const q = BUYER_QUALIFICATION;
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  const cls = (Object.keys(q.classification) as (keyof typeof q.classification)[])
    .map((k) => `- ${k}: ${q.classification[k]}`).join("\n");
  return [
    "## BUYER QUALIFICATION (this marketplace)",
    q.dualIntentFilter,
    `Key question to separate operators from speculators: "${q.keyQuestion}"`,
    "Hot signals:", list(q.hotSignals),
    "Seriousness triggers:", list(q.seriousnessTriggers),
    "Cold signals:", list(q.coldSignals),
    "Classification → action:", cls,
  ].join("\n");
}

function renderCapabilities(phase: PhaseNumber): string {
  const can = capabilitiesFor(phase).map((c) => `- ${c}`).join("\n");
  const cannot = guardrailsFor(phase).map((c) => `- ${c}`).join("\n");
  return `## WHAT YOU CAN DO RIGHT NOW (CURRENT PHASE)\n${can}\n\n## CURRENT LIMITS\n${cannot}`;
}

function renderReferences(surface: Surface): string {
  const lines = [
    `If a visitor only wants jobs: point them to ${GTO_REFERENCES.cvSubmission} (jobs platform in development).`,
    `If a visitor only wants residency/visa (not buying a business): point them to the Golden Visa waitlist ${GTO_REFERENCES.goldenVisaWaitlist}.`,
  ];
  if (surface === "businesses") {
    lines.push(`For a HOT, ready-to-talk visitor (after capturing their details), offer to connect them with Ahmed directly on WhatsApp and embed [WHATSAPP_HANDOFF].`);
  }
  return `## ROUTING REFERENCES\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

/** Compose the full system prompt. Pure — no I/O. */
export function buildSystemPrompt(input: AssembleInput): string {
  const { surface, phase, context } = input;
  const variant = surface === "businesses" ? BUSINESSES_VARIANT : MAIN_SITE_VARIANT;

  const sections = [
    BASE_PROMPT,
    variant,
    renderKb(surface, phase),
    surface === "businesses" ? renderQualification() : "",
    renderCapabilities(phase),
    renderReferences(surface),
  ];

  if (context?.intent) {
    sections.push(
      `[CONTEXT: visitor clicked '${context.topic ?? context.intent}' — they are interested in ${
        context.intent === "consultation" ? "booking a consultation with our team" : context.topic
      }. Open with the right qualifying question for this specific interest.]`
    );
  }
  if (context?.availability) {
    sections.push(context.availability);
    sections.push(
      "For consultation bookings: after qualifying, ask for preferred day from AVAILABLE_DAYS above, then preferred time from that day's slots. Embed [BOOKING_DAY:YYYY-MM-DD] and [BOOKING_TIME:HH:MM] when visitor confirms."
    );
  }

  return sections.filter(Boolean).join("\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/prompt-assembler.test.ts --no-file-parallelism`
Expected: PASS (5 tests). The phase-2 test depends on the Task-2 body for `engagement-timeline` and the Task-3 phase-2 capability text "license-transfer steps" — both present.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/prompt-assembler.ts tests/ai/prompt-assembler.test.ts
git commit -m "feat(ai): pure system-prompt assembler (surface + phase scoped KB)"
```

---

## Task 7: Edit `lib/ai/signals.ts` — `[WHATSAPP_HANDOFF]` + `[KB_GAP]`

**Files:**
- Modify: `lib/ai/signals.ts`
- Test: `tests/ai/signals.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/signals.test.ts
import { describe, it, expect } from "vitest";
import { parseSignals, stripSignals } from "@/lib/ai/signals";

describe("new signals", () => {
  it("parses whatsappHandoff and kbGap", () => {
    const s = parseSignals("Here you go. [WHATSAPP_HANDOFF] [KB_GAP]");
    expect(s.whatsappHandoff).toBe(true);
    expect(s.kbGap).toBe(true);
  });
  it("defaults both to false", () => {
    const s = parseSignals("plain message");
    expect(s.whatsappHandoff).toBe(false);
    expect(s.kbGap).toBe(false);
  });
  it("strips both from visible text", () => {
    const out = stripSignals("Answer here. [WHATSAPP_HANDOFF] [KB_GAP]");
    expect(out).toBe("Answer here.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/signals.test.ts --no-file-parallelism`
Expected: FAIL — `whatsappHandoff`/`kbGap` undefined.

- [ ] **Step 3: Edit `lib/ai/signals.ts`**

3a. Add to the `Signals` interface:

```ts
  whatsappHandoff: boolean;
  kbGap: boolean;
```

3b. Add to the returned object in `parseSignals`:

```ts
    whatsappHandoff: /\[WHATSAPP_HANDOFF\]/.test(text),
    kbGap: /\[KB_GAP\]/.test(text),
```

3c. Add to `stripSignals` (before the whitespace-collapse lines):

```ts
    .replace(/\[WHATSAPP_HANDOFF\]/g, "")
    .replace(/\[KB_GAP\]/g, "")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/signals.test.ts --no-file-parallelism`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/signals.ts tests/ai/signals.test.ts
git commit -m "feat(ai): parse + strip [WHATSAPP_HANDOFF] and [KB_GAP] signals"
```

---

## Task 8: Wire the chat route (`app/api/chat/route.ts`)

**Files:**
- Modify: `app/api/chat/route.ts`

No new unit test (the route hits the DB + LLM; its logic is covered by the assembler/phase/signals tests). Verify via `npm run build`.

- [ ] **Step 1: Replace prompt construction with the assembler**

Replace the import of `getSystemPrompt` with the assembler + phase helpers:

```ts
import { buildSystemPrompt, type AssembleContext } from "@/lib/ai/prompt-assembler";
import { getActivePhase } from "@/lib/ai/phase";
import { buildWhatsAppHandoff } from "@/lib/ai/whatsapp";
```

- [ ] **Step 2: Build the system prompt via the assembler**

Replace the block currently starting at `let systemPrompt = getSystemPrompt(conversationSource);` through the consultation-availability `if` block with:

```ts
    const phase = await getActivePhase(db);
    const assembleContext: AssembleContext = {};
    if (context?.intent) {
      assembleContext.intent = context.intent;
      assembleContext.topic = context.topic;
    }
    if (context?.intent === "consultation") {
      assembleContext.availability = await getAvailabilityContext();
    }
    const systemPrompt = buildSystemPrompt({
      surface: conversationSource,
      phase,
      context: assembleContext,
    });
```

(`getAvailabilityContext()` already returns the `\n[AVAILABLE_DAYS: …]` fragment, which the assembler appends — keep that helper as-is.)

- [ ] **Step 3: Surface the WhatsApp handoff + KB gap**

After `const signals = parseSignals(rawResponse);`, add:

```ts
    const whatsappUrl = signals.whatsappHandoff
      ? buildWhatsAppHandoff({
          segment: signals.segment,
          interest: signals.interest,
          surface: conversationSource,
        })
      : null;
    if (signals.kbGap) {
      console.warn("[KB_GAP]", { conversationId, message });
    }
```

Then add `whatsappUrl` to the JSON response and `whatsappHandoff`/`kbGap` to the returned `signals` object:

```ts
    return NextResponse.json({
      message: cleanResponse,
      whatsappUrl,
      signals: {
        captureReady: signals.captureReady,
        segment: signals.segment,
        interest: signals.interest,
        highIntent: signals.highIntent,
        closeChat: signals.closeChat,
        bookingDay: signals.bookingDay,
        bookingTime: signals.bookingTime,
        whatsappHandoff: signals.whatsappHandoff,
        kbGap: signals.kbGap,
      },
      conversationId,
    });
```

> Note: `kbGap` durable persistence is deliberately deferred (no schema migration in this plan, per spec §12). It is logged + returned now; durable storage can piggyback on later intelligence work.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: compiles with no type errors. (`getSystemPrompt` may now be unused — if the lint build fails on an unused export, that's fine; it's still exported from `prompts.ts`. Do not delete it.)

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(chat): assemble prompt by surface+phase, return WhatsApp handoff, log KB gaps"
```

---

## Task 9: Chat widget — per-page greeting + WhatsApp CTA

**Files:**
- Create: `components/chat/WhatsAppHandoffButton.tsx`
- Modify: `components/chat/ChatWidget.tsx`

Verified via `npm run build` (component, per repo convention).

- [ ] **Step 1: Create the WhatsApp CTA (mirrors the existing `BookingButton` slot)**

```tsx
// components/chat/WhatsAppHandoffButton.tsx
import { MessageCircle } from "lucide-react";

export function WhatsAppHandoffButton({ href }: { href: string }) {
  return (
    <div className="px-4 pb-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Continue on WhatsApp with Ahmed
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Import surface resolver + the new button in `ChatWidget.tsx`**

```tsx
import { getContextualGreeting } from "@/lib/ai/prompts";
import { resolveSurface } from "@/lib/ai/surface";
import { WhatsAppHandoffButton } from "./WhatsAppHandoffButton";
```

- [ ] **Step 3: Add WhatsApp URL state**

After `const [showBooking, setShowBooking] = useState(false);` add:

```tsx
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
```

- [ ] **Step 4: Use the per-page greeting in `handleOpen`**

Replace `const greeting = getContextualGreeting();` with:

```tsx
      const greeting = getContextualGreeting(resolveSurface(pathname ?? "/").page);
```

Add `pathname` to the `handleOpen` dependency array: `}, [messages.length, pathname]);`

- [ ] **Step 5: Send the resolved surface + capture the handoff URL in `sendMessage`**

Replace `const source = pathname?.startsWith("/businesses") ? "businesses" : "main";` with:

```tsx
        const { surface } = resolveSurface(pathname ?? "/");
```

and change the body field `source,` to `source: surface,`.

After `setMessages((prev) => [...prev, assistantMessage]);` add:

```tsx
        if (data.whatsappUrl) {
          setWhatsappUrl(data.whatsappUrl);
        }
```

- [ ] **Step 6: Render the CTA next to the booking button**

Find `{showBooking && <BookingButton onClick={handleBookingClick} />}` and add directly below it:

```tsx
            {whatsappUrl && <WhatsAppHandoffButton href={whatsappUrl} />}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: compiles, no type errors.

- [ ] **Step 8: Commit**

```bash
git add components/chat/WhatsAppHandoffButton.tsx components/chat/ChatWidget.tsx
git commit -m "feat(chat): per-page greeting hook + WhatsApp handoff CTA"
```

---

## Task 10: Admin route — `app/api/admin/omar-phase/route.ts`

**Files:**
- Create: `app/api/admin/omar-phase/route.ts`

Logic is covered by `getActivePhase`/`setActivePhase`/`getPhaseProgress` tests (Task 3). The route is a thin auth-guarded wrapper — verify via `npm run build`. Follows the `app/api/admin/reviewer-link/route.ts` pattern.

- [ ] **Step 1: Write the route**

```ts
// app/api/admin/omar-phase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { PHASES, setActivePhase, getPhaseProgress, type PhaseNumber } from "@/lib/ai/phase";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;
  const progress = await getPhaseProgress(getDb());
  return NextResponse.json({ phases: PHASES, ...progress });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const target = Number(body?.phase);
  if (target !== 1 && target !== 2 && target !== 3) {
    return NextResponse.json({ error: "phase must be 1, 2, or 3" }, { status: 400 });
  }

  const db = getDb();
  const { activePhase } = await getPhaseProgress(db);
  // Only allow single-step moves (up or down) — no skipping.
  if (Math.abs(target - activePhase) > 1) {
    return NextResponse.json({ error: "can only move one phase at a time" }, { status: 400 });
  }

  await setActivePhase(db, target as PhaseNumber);
  const progress = await getPhaseProgress(db);
  return NextResponse.json({ phases: PHASES, ...progress });
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: compiles, route appears under `/api/admin/omar-phase`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/omar-phase/route.ts
git commit -m "feat(admin): omar-phase API (read progress / advance one step)"
```

---

## Task 11: Omar Roadmap panel on the dashboard

**Files:**
- Create: `components/admin/intelligence/OmarRoadmap.tsx`
- Modify: `app/admin/intelligence/page.tsx`

Verified via `npm run build` (component). Mirrors the `ReviewerLinkCard` fetch/auth pattern.

- [ ] **Step 1: Create the panel**

```tsx
// components/admin/intelligence/OmarRoadmap.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Rocket, Lock, Check, Loader2 } from "lucide-react";

interface PhaseDef {
  phase: 1 | 2 | 3;
  name: string;
  summary: string;
  capabilities: { minPhase: number; instruction: string }[];
  guardrails: string[];
  unlock: { precisionTarget: number | null; minResolvedLeads: number | null; notes: string };
}
interface RoadmapState {
  phases: PhaseDef[];
  activePhase: 1 | 2 | 3;
  resolvedLeads: number;
  hotPrecisionPct: number | null;
  nextTarget: number | null;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}`,
    "Content-Type": "application/json",
  };
}

export function OmarRoadmap() {
  const [state, setState] = useState<RoadmapState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/omar-phase", { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error("Failed to load roadmap");
      setState(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function move(target: number) {
    if (!confirm(`Move Omar to Phase ${target}? This changes what Omar is allowed to do, live.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/omar-phase", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ phase: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to advance");
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to advance");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 text-sm text-red-600">{error}</div>;
  if (!state) return <div className="rounded-xl bg-white ring-1 ring-gray-200 p-5 text-sm text-gray-500">Loading roadmap…</div>;

  return (
    <section className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Rocket className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-navy">Omar Roadmap</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {state.resolvedLeads} resolved leads · hot precision{" "}
            {state.hotPrecisionPct === null ? "—" : `${state.hotPrecisionPct}%`}
            {state.nextTarget !== null ? ` (target ${state.nextTarget}%)` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {state.phases.map((p) => {
          const active = p.phase === state.activePhase;
          const done = p.phase < state.activePhase;
          return (
            <div
              key={p.phase}
              className={`rounded-lg border p-4 ${active ? "border-gold bg-gold/5" : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {done ? <Check className="h-4 w-4 text-emerald-600" /> : active ? <Rocket className="h-4 w-4 text-gold" /> : <Lock className="h-4 w-4 text-gray-400" />}
                  <span className="font-semibold text-navy text-sm">Phase {p.phase} — {p.name}</span>
                  {active && <span className="text-[10px] uppercase tracking-wide text-gold font-bold">Active</span>}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-600">{p.summary}</p>
              <ul className="mt-2 space-y-0.5">
                {p.capabilities.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700">• {c.instruction}</li>
                ))}
              </ul>
              {p.unlock.notes && <p className="mt-2 text-[11px] text-gray-400">Unlock: {p.unlock.notes}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        {state.activePhase > 1 && (
          <button
            disabled={busy}
            onClick={() => move(state.activePhase - 1)}
            className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Step back to Phase {state.activePhase - 1}
          </button>
        )}
        {state.activePhase < 3 && (
          <button
            disabled={busy}
            onClick={() => move(state.activePhase + 1)}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-light disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Advance to Phase {state.activePhase + 1}
          </button>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount it on the intelligence page**

In `app/admin/intelligence/page.tsx`, import and render `<OmarRoadmap />` near the version card:

```tsx
import { OmarRoadmap } from "@/components/admin/intelligence/OmarRoadmap";
```

Place `<OmarRoadmap />` in the page layout adjacent to the existing `VersionCard` (match the surrounding grid/section structure already in that file).

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: compiles; `/admin/intelligence` includes the roadmap panel.

- [ ] **Step 4: Commit**

```bash
git add components/admin/intelligence/OmarRoadmap.tsx app/admin/intelligence/page.tsx
git commit -m "feat(intelligence): Omar Roadmap panel — track + advance phases"
```

---

## Task 12: Full verification + docs

**Files:**
- Modify: `delivery/.../output/gto-build-log.md` (workspace), `HANDOVER.md` (repo), `delivery/shared/gto-omar-phasing-roadmap.md` (workspace)

- [ ] **Step 1: Run the full test suite sequentially**

Run: `npm test -- --no-file-parallelism`
Expected: all green — the prior 82 + the new `tests/ai/*` suites. (Sequential run avoids the worker-spawn timeouts seen under Drive-sync/VS load.)

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean compile, no type/lint errors.

- [ ] **Step 3: Update docs**

- `HANDOVER.md`: bump version, add the Omar phasing + KB integration entry (files, what changed, that KB now drives Omar's facts, phasing is settings-backed + advanced from `/admin/intelligence`).
- `gto-build-log.md`: add a Thread 2 item-2 completion entry.
- `gto-omar-phasing-roadmap.md`: change the progress table's Phase-1 row from "(planned)" to the actual ship date once deployed.

- [ ] **Step 4: Commit**

```bash
git add HANDOVER.md
git commit -m "docs(handover): Omar phasing + KB integration (Thread 2 item 2)"
```

(The workspace docs `gto-build-log.md` / `gto-omar-phasing-roadmap.md` live outside the repo — save them with the Write tool; they are not part of the git commit.)

---

## Deployment (after the plan is complete and reviewed)

- **No migration needed for this feature** — `settings` already exists; the `omar_phase` row is created on first advance (defaults to 1 when absent).
- ⚠️ If deploying alongside the not-yet-deployed intelligence dashboard (Phase 9), that feature still needs `npm run migrate` first for its `intelligence_notes` table.
- Deploy: `vercel deploy --prod --cwd "<repo path>"`.

---

## Self-review

**Spec coverage:**
- §3 architecture / module map → Tasks 1–11 (every file in the spec's map has a task).
- §4 KB data model + facts reconciliation → Task 2 (corrections enforced by tests).
- §5 surface-awareness → Task 1 (`resolveSurface`) + Task 6 (surface scoping) + Task 9 (greeting wiring).
- §6 phasing ladder (settings-backed) → Task 3 + Task 10 (advance) + Task 11 (panel).
- §7 qualification wiring → Task 2 (`BUYER_QUALIFICATION`) + Task 6 (businesses-only injection).
- §8 WhatsApp routing → Task 4 + Task 7 (signal) + Task 8 (route) + Task 9 (CTA).
- §9 signals additions → Task 7 (+ Task 8 surfacing). `kbGap` persistence intentionally deferred (logged/returned) — noted in Task 8 and consistent with §12 "no migration."
- §10 dashboard roadmap → Tasks 10–11.
- §11 testing → per-task tests + Task 12 full run.
- §12 deployment → Deployment section.

**Placeholder scan:** The only `<transcribe …>` markers are in Task 2 and point to an exact source file (`assets/_extracted_knowledgebase_v2.txt`) with a corrections table; the `body.length > 40` test guarantees they're filled before the task passes. No "TODO/handle errors/similar to" placeholders elsewhere.

**Type consistency:** `Surface` defined in Task 1, imported everywhere. `PhaseNumber` defined in Task 3, used by Tasks 6/8/10. `buildSystemPrompt({surface, phase, context})` signature matches between Tasks 6 and 8. `Signals` fields `whatsappHandoff`/`kbGap` defined in Task 7, consumed in Task 8/9. `getPhaseProgress` return shape (Task 3) matches the route (Task 10) and panel (Task 11). KB ids referenced in tests (`engagement-timeline`, `tax-compliance`, `ownership-structures`) match Task 2 definitions.
