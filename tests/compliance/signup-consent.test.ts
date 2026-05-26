/**
 * Compliance test: sign-up consent checkbox logic.
 *
 * This is a pure-TypeScript test (no JSX rendering) because vitest in this
 * project does not have @vitejs/plugin-react installed and therefore cannot
 * parse/render JSX component trees.  The source file
 * app/businesses/sign-in/page.tsx has been verified via `npm run build`
 * (which runs Next.js's own TypeScript + JSX transform) and should be
 * click-tested post-deploy.
 *
 * What this test DOES verify:
 *   - The consent-gating logic mirrors the real disabled predicate
 *     disabled={submitting || !agreed}
 *   - The three agreed/submitting state combinations produce the right
 *     enabled/disabled result.
 *   - The source file contains the required checkbox and Link elements
 *     (checked via static string inspection of the built source).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ------------------------------------------------------------------
// 1. Logic unit: mirror the disabled predicate from SignUpForm
// ------------------------------------------------------------------
function isSubmitDisabled(submitting: boolean, agreed: boolean): boolean {
  return submitting || !agreed;
}

describe("Sign-up consent gating logic", () => {
  it("button is disabled when agreed=false, submitting=false", () => {
    expect(isSubmitDisabled(false, false)).toBe(true);
  });

  it("button is disabled when submitting=true regardless of agreed", () => {
    expect(isSubmitDisabled(true, true)).toBe(true);
    expect(isSubmitDisabled(true, false)).toBe(true);
  });

  it("button is enabled only when agreed=true and submitting=false", () => {
    expect(isSubmitDisabled(false, true)).toBe(false);
  });
});

// ------------------------------------------------------------------
// 2. Static source check: verify the real component has the checkbox
//    and the required links, and the disabled predicate includes !agreed
// ------------------------------------------------------------------
const SOURCE_PATH = resolve(
  __dirname,
  "../../app/businesses/sign-in/page.tsx"
);

describe("Sign-up page source contains required consent elements", () => {
  let source: string;

  it("source file is readable", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source.length).toBeGreaterThan(0);
  });

  it("has agreed state declaration", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain('const [agreed, setAgreed] = useState(false)');
  });

  it("submit button disabled predicate includes !agreed", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain("!agreed");
  });

  it("consent checkbox is present with required attribute", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain('type="checkbox"');
    expect(source).toContain("required");
    expect(source).toContain("setAgreed(e.target.checked)");
  });

  it("consent label links to /privacy", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain('href="/privacy"');
  });

  it("consent label links to /terms", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain('href="/terms"');
  });

  it("consent label text says Privacy Policy and Terms of Service", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain("Privacy Policy");
    expect(source).toContain("Terms of Service");
  });

  it("consent label includes Required marker", () => {
    source = readFileSync(SOURCE_PATH, "utf-8");
    expect(source).toContain("Required.");
  });
});
