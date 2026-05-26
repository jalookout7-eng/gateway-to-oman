# Compliance Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or executing-plans). Steps use `- [ ]` checkboxes.

**Goal:** Ship `/privacy`, `/terms`, `/cookies` with the full final wording from the spec, plus footer links and the consent UI (required sign-up checkbox + passive consent on lead/access forms).

**Architecture:** Three Next 14 App Router pages using a shared `LegalLayout`, with all wording sourced verbatim from the spec. Company-specific facts isolated in one `CompanyFacts.ts` so a future edit by Ahmed/his lawyer is a one-file change. No DB, no migration, no new env var.

**Tech Stack:** Next 14 App Router, TypeScript, Tailwind, Next `<Link>`. Existing brand tokens (navy/gold, Bodoni Moda + Jost) via the project's Tailwind config.

**Spec (source of truth for wording):** `docs/superpowers/specs/2026-05-26-compliance-pages-design.md`

**Conventions:**
- Build verification: `npm run build` after each task (legal pages are content; behavior is minimal).
- One unit test required: sign-up consent gating (the only real behavior introduced).
- Commit after each task with the message shown. Append the Co-Authored-By trailer to every commit message.

---

## Task 1: `CompanyFacts.ts` + `LegalLayout` shared wrapper

**Files:**
- Create: `components/legal/CompanyFacts.ts`
- Create: `components/legal/LegalLayout.tsx`

- [ ] **Step 1: Create `components/legal/CompanyFacts.ts`** with this exact content (these are the only `[bracketed]` fill-ins in the entire pass — single edit point):

```ts
/**
 * Company-specific facts referenced from the legal pages.
 * Edit this single file when Ahmed supplies the registered details — every
 * legal page picks the new values up automatically.
 */
export const COMPANY = {
  tradingName: "Gateway to Oman",
  legalEntity: "[Legal entity name — to be added]",
  crNumber: "[Commercial Registration No. — to be added]",
  address: "[Registered address, Sultanate of Oman — to be added]",
  privacyContact: "gatewaytooman@gmail.com",
  jurisdiction: "Sultanate of Oman",
} as const;

export const EFFECTIVE_DATE = "26 May 2026";
```

- [ ] **Step 2: Create `components/legal/LegalLayout.tsx`** — a server-component-safe wrapper used by all three pages:

```tsx
import Link from "next/link";
import { EFFECTIVE_DATE } from "./CompanyFacts";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, children }: Props) {
  return (
    <main className="min-h-screen bg-warm-white px-4 py-12 md:py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-navy">&larr; Back to Gateway to Oman</Link>
        <h1 className="mt-4 font-heading text-3xl md:text-4xl font-semibold text-navy">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Effective date: {EFFECTIVE_DATE}</p>
        <div className="mt-8 prose prose-navy max-w-none text-gray-800 leading-relaxed
                        prose-headings:font-heading prose-headings:text-navy prose-headings:font-semibold
                        prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3
                        prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
                        prose-p:text-[15px] prose-li:text-[15px]
                        prose-a:text-gold hover:prose-a:underline
                        prose-table:text-sm
                        prose-th:text-navy prose-th:font-semibold">
          {children}
        </div>
        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:text-navy">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-navy">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-navy">Cookie Notice</Link>
        </div>
      </article>
    </main>
  );
}
```

> Note: if `prose-navy` / `bg-warm-white` aren't existing utilities, swap to the closest token in `tailwind.config.ts` (e.g. drop the `prose-navy` modifier; for background use `bg-[#F8F5F0]` per HANDOVER §8). Match the project's existing landing-page styling rather than fight the design system.

- [ ] **Step 3: Verify**

`npm run build` — confirm both files compile (they're TS-only with no runtime side-effects).

- [ ] **Step 4: Commit**

```
git add components/legal/CompanyFacts.ts components/legal/LegalLayout.tsx
git commit -m "feat(compliance): CompanyFacts source + LegalLayout wrapper"
```

---

## Task 2: `/privacy` Privacy Policy page

**Files:**
- Create: `app/privacy/page.tsx`

- [ ] **Step 1: Create the page**

This page renders the Privacy Policy. **Source the wording verbatim from `docs/superpowers/specs/2026-05-26-compliance-pages-design.md` § "`/privacy` — Privacy Policy"** — read that section and convert each numbered section into a `<section>` with an `<h2>` for the heading and `<p>`/`<ul>`/`<table>` for the body. Replace `{COMPANY.legalEntity}`, `{COMPANY.tradingName}`, etc. with `{COMPANY.legalEntity}` JSX expressions (import `COMPANY` from `@/components/legal/CompanyFacts`). The sub-processors block is a real HTML `<table>` with the four columns/rows shown in the spec.

Skeleton (fill the `<section>...</section>` blocks from the spec):

```tsx
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/components/legal/CompanyFacts";

export const metadata = { title: "Privacy Policy — Gateway to Oman" };

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <section>
        <p>This Privacy Policy explains how {COMPANY.tradingName} ("Gateway to Oman", "we", "us") — operated by {COMPANY.legalEntity} (CR {COMPANY.crNumber}), {COMPANY.address} — collects, uses, shares, and protects personal information when you use our website (<code>gatewaytooman.com</code> and <code>gateway-to-oman.vercel.app</code>), the businesses-for-sale marketplace, our AI assistant, and related services (together, the "Service").</p>
        <p>We are the <strong>data controller</strong> of the personal information we collect about you.</p>
      </section>

      <section>
        <h2>1. Information we collect</h2>
        {/* Bullet list from spec §1 */}
      </section>

      {/* §2 through §13 in order, each as its own <section> */}
    </LegalLayout>
  );
}
```

Carry **every numbered section 1–13** from the spec into the page, including the sub-processor `<table>`. Do not paraphrase — the wording is the source of truth.

- [ ] **Step 2: Verify**

`npm run build` — `/privacy` MUST appear in the build's route list as a static route.

- [ ] **Step 3: Commit**

```
git add app/privacy/page.tsx
git commit -m "feat(compliance): /privacy Privacy Policy"
```

---

## Task 3: `/terms` Terms of Service page

**Files:**
- Create: `app/terms/page.tsx`

- [ ] **Step 1: Create the page** — same pattern as Task 2; source the wording verbatim from spec § "`/terms` — Terms of Service" §1 through §16. Use uppercase exactly where the spec uses uppercase (the standard limitation-of-liability + disclaimer formatting). Skeleton mirrors `app/privacy/page.tsx`.

```tsx
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/components/legal/CompanyFacts";

export const metadata = { title: "Terms of Service — Gateway to Oman" };

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service">
      {/* §1 Acceptance through §16 Contact — verbatim from spec */}
    </LegalLayout>
  );
}
```

- [ ] **Step 2: Verify**

`npm run build` — `/terms` appears as a static route.

- [ ] **Step 3: Commit**

```
git add app/terms/page.tsx
git commit -m "feat(compliance): /terms Terms of Service"
```

---

## Task 4: `/cookies` Cookie Notice page

**Files:**
- Create: `app/cookies/page.tsx`

- [ ] **Step 1: Create the page** — wording verbatim from spec § "`/cookies` — Cookie Notice", including the cookie inventory `<table>`.

```tsx
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/components/legal/CompanyFacts";

export const metadata = { title: "Cookie Notice — Gateway to Oman" };

export default function CookieNoticePage() {
  return (
    <LegalLayout title="Cookie Notice">
      {/* What this notice covers; Why we don't show a banner today;
          Inventory <table>; How to control cookies; Third-party services;
          Changes; Contact — verbatim from spec */}
    </LegalLayout>
  );
}
```

- [ ] **Step 2: Verify**

`npm run build` — `/cookies` appears as a static route.

- [ ] **Step 3: Commit**

```
git add app/cookies/page.tsx
git commit -m "feat(compliance): /cookies Cookie Notice"
```

---

## Task 5: Footer links on both surfaces

**Files:**
- Modify: main-site footer (likely `components/landing/Footer.tsx` — find via grep `components/landing/Footer` if path differs)
- Modify: `app/businesses/layout.tsx` (carries the marketplace footer block)

- [ ] **Step 1: Find the two footers**

Grep `components/landing` and `app/businesses/layout.tsx` for an existing footer block. The main site footer is in `components/landing/Footer.tsx`. The businesses surface renders its footer inline inside `app/businesses/layout.tsx` (or via a `BusinessesFooter` component if one exists — grep `BusinessesFooter`).

- [ ] **Step 2: Add a "Legal" link group**

On the main-site footer, add a new column (or append to an existing "Company"/"Resources" column if the layout dictates) titled **Legal**, containing three `<Link>`s:

```tsx
<Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
<Link href="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
<Link href="/cookies" className="hover:text-gold transition-colors">Cookie Notice</Link>
```

Match the existing link typography (font, size, spacing). On the businesses footer, add the same three links in the same row/grid style as that footer's existing links.

- [ ] **Step 3: Verify**

`npm run build` — clean. Visually-spot-check `app/page.tsx` + `/businesses` route renders both footers with the new links (Next dev or by reading the page output).

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "feat(compliance): footer links to Privacy / Terms / Cookies on main + /businesses"
```

---

## Task 6: Required sign-up consent checkbox (+ test)

**Files:**
- Modify: `app/businesses/sign-in/page.tsx`
- Test: `tests/compliance/signup-consent.test.tsx` (only if there's a tests/* dir convention for React components — otherwise skip the test and rely on `npm run build` + manual click-test post-deploy; check `tests/` for any existing React-Testing-Library setup before writing).

- [ ] **Step 1: Inspect the sign-up tab**

Read `app/businesses/sign-in/page.tsx`. Identify the sign-up form's `handleSubmit` (or equivalent), its existing local `useState` declarations, and the submit `<button>`'s `disabled` prop.

- [ ] **Step 2: Add the consent state + checkbox**

Add `const [agreed, setAgreed] = useState(false);` to the sign-up form's state. Above the submit button, insert:

```tsx
<label className="flex items-start gap-2 text-xs text-gray-600 leading-snug">
  <input
    type="checkbox"
    required
    checked={agreed}
    onChange={(e) => setAgreed(e.target.checked)}
    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold/30"
  />
  <span>
    I agree to the <Link href="/privacy" className="text-gold underline">Privacy Policy</Link> and{" "}
    <Link href="/terms" className="text-gold underline">Terms of Service</Link>.{" "}
    <span className="text-gray-400">Required.</span>
  </span>
</label>
```

Extend the submit button's `disabled={...}` predicate with `|| !agreed` so submit is blocked until the box is checked. (Make sure `Link` from `next/link` is imported.)

- [ ] **Step 3: Test (if RTL is set up)**

If `tests/` contains React-Testing-Library tests (grep `@testing-library/react`), add a small test asserting the submit button is disabled while `agreed === false` and enabled after the user checks the box (with all other required fields filled). Otherwise note in the commit message that this is build-verified + must be click-tested post-deploy.

- [ ] **Step 4: Verify**

`npm run build` — clean. If a test was written: `npx vitest run tests/compliance --no-file-parallelism` — passes.

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "feat(compliance): required sign-up consent checkbox (links Privacy + Terms)"
```

---

## Task 7: Passive consent lines on lead-capture + access-request forms

**Files:**
- Modify: `components/chat/LeadCaptureForm.tsx`
- Modify: `components/businesses/AccessRequestForm.tsx`

- [ ] **Step 1: LeadCaptureForm**

Read the file. Directly **below the submit button** (still inside the form), add:

```tsx
<p className="mt-3 text-[11px] text-gray-400 leading-snug">
  By submitting, you agree to our <Link href="/privacy" className="underline hover:text-navy">Privacy Policy</Link> and{" "}
  <Link href="/terms" className="underline hover:text-navy">Terms</Link>.
</p>
```

Import `Link` from `next/link` if not already imported.

- [ ] **Step 2: AccessRequestForm**

Same passive consent paragraph, same placement.

- [ ] **Step 3: Verify**

`npm run build` — clean.

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "feat(compliance): passive consent line on lead-capture + access-request forms"
```

---

## Task 8: Final verification + docs

- [ ] **Step 1: Full suite + build**

```
npm test -- --no-file-parallelism
npm run build
```

Both must be green. Confirm the build output lists `/privacy`, `/terms`, `/cookies` as static (`○`) routes.

- [ ] **Step 2: Update HANDOVER + build-log**

- `HANDOVER.md`: bump version (v7.11); §11 — move compliance from "design approved, build pending" to "built on `section-b-marketplace`, bundled into the same pending deploy"; note no migration required for compliance specifically; reaffirm the existing migrate-first guidance is unchanged.
- Workspace build-log (`delivery/stages/04-build/output/gto-build-log.md`): append a "Compliance Batch 3 — BUILT" entry summarising the pages + wiring shipped + the four `[bracketed]` fill-ins still pending from Ahmed.

- [ ] **Step 3: Commit docs**

```
git add HANDOVER.md
git commit -m "docs(handover): v7.11 — compliance Batch 3 built (Privacy/Terms/Cookies + consent)"
```

---

## Self-review

**Spec coverage:**
- §3 page wording → Tasks 2 / 3 / 4 (verbatim source from spec).
- §4 consent UI → Tasks 6 (required checkbox) + 7 (passive lines).
- §5 footer links → Task 5.
- §6 out-of-scope → respected (no banner, no marketing-consent code).
- §2 architecture (CompanyFacts + LegalLayout) → Task 1.

**Placeholder discipline:** the only `[bracketed]` strings in the shipped product are the four FILL-INs in `CompanyFacts.ts` — every other piece of text in the pages is final-form. No "TODO" / "DRAFT" appears anywhere.

**Type consistency:** all pages import `COMPANY` and `EFFECTIVE_DATE` from the same module; `LegalLayout` consumes only `EFFECTIVE_DATE`. No naming drift.

**Risk:** the only behavioral change is the sign-up consent gating; build-verified and (where RTL is configured) unit-tested. The legal text is content-only — no runtime risk.
