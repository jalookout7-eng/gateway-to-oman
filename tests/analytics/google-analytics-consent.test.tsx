import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { writeConsent, CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useSearchParams: () => new URLSearchParams(),
}));

// next/script renders nothing useful in jsdom; stand in with a marker element
// so "did the tag render?" is observable.
vi.mock("next/script", () => ({
  default: ({ id, src }: { id?: string; src?: string }) => (
    <div data-testid="ga-script" data-id={id ?? ""} data-src={src ?? ""} />
  ),
}));

// GoogleAnalytics.tsx reads NEXT_PUBLIC_GA_MEASUREMENT_ID into a module-level
// `const` at import time. A static top-level import would evaluate that
// module before any `beforeEach` runs, so `vi.stubEnv` in `beforeEach` would
// be stubbing the env var after the value is already frozen as `undefined` —
// every "loads gtag" assertion would fail regardless of consent logic. Stub
// the env once in `beforeAll`, then import the module dynamically so the
// stub is in place at the module's first (and only) evaluation.
let GoogleAnalytics: (typeof import("@/components/analytics/GoogleAnalytics"))["GoogleAnalytics"];
let buildGtagInit: (typeof import("@/components/analytics/GoogleAnalytics"))["buildGtagInit"];

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
  ({ GoogleAnalytics, buildGtagInit } = await import(
    "@/components/analytics/GoogleAnalytics"
  ));
});

beforeEach(() => {
  localStorage.clear();
  pathnameMock.mockReturnValue("/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("GoogleAnalytics consent gating", () => {
  it("loads gtag when no choice is stored (opt-out default)", async () => {
    const { queryAllByTestId } = render(<GoogleAnalytics />);
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBeGreaterThan(0));
  });

  it("loads gtag after an explicit Accept", async () => {
    writeConsent("granted");
    const { queryAllByTestId } = render(<GoogleAnalytics />);
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBeGreaterThan(0));
  });

  it("does NOT load gtag when consent is denied", async () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "denied", at: new Date().toISOString() }),
    );
    const { container } = render(<GoogleAnalytics />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("unmounts the tag when Decline happens live on the page", async () => {
    const { queryAllByTestId } = render(<GoogleAnalytics />);
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBeGreaterThan(0));
    act(() => {
      writeConsent("denied");
    });
    await waitFor(() => expect(queryAllByTestId("ga-script").length).toBe(0));
  });

  it("still never loads on admin routes regardless of consent", async () => {
    writeConsent("granted");
    pathnameMock.mockReturnValue("/admin");
    const { container } = render(<GoogleAnalytics />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("sets Consent Mode v2 defaults before config, with ad storage always denied", async () => {
    const { findAllByTestId } = render(<GoogleAnalytics />);
    const scripts = await findAllByTestId("ga-script");
    const init = scripts.find((s) => s.getAttribute("data-id") === "gtag-init");
    expect(init).toBeTruthy();
    // The inline script body is passed via dangerouslySetInnerHTML, which the
    // mock drops — assert on the component's exported builder instead.
    const body = buildGtagInit("G-TEST12345", "granted");
    expect(body.indexOf("consent', 'default'")).toBeGreaterThan(-1);
    expect(body.indexOf("consent', 'default'")).toBeLessThan(body.indexOf("'config'"));
    expect(body).toContain("ad_storage: 'denied'");
    expect(body).toContain("ad_user_data: 'denied'");
    expect(body).toContain("ad_personalization: 'denied'");
    expect(body).toContain("analytics_storage: 'granted'");
  });

  it("builds the init script with analytics_storage denied when that is the default", async () => {
    expect(buildGtagInit("G-TEST12345", "denied")).toContain("analytics_storage: 'denied'");
  });
});
