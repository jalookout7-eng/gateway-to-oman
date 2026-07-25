import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { writeConsent, CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useSearchParams: () => new URLSearchParams(),
}));

// next/script renders nothing useful in jsdom; stand in with a marker element
// so "did the tag render?" is observable. dangerouslySetInnerHTML is threaded
// through as data-html so tests can assert on the COMPONENT's actual rendered
// output (the real ordering the browser would execute), not just the
// separately-exported buildGtagInit() helper — a regression introduced only
// in the component (e.g. call order, wrong prop) would otherwise slip past.
vi.mock("next/script", () => ({
  default: ({
    id,
    src,
    dangerouslySetInnerHTML,
  }: {
    id?: string;
    src?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }) => (
    <div
      data-testid="ga-script"
      data-id={id ?? ""}
      data-src={src ?? ""}
      data-html={dangerouslySetInnerHTML?.__html ?? ""}
    />
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
    // Assert on the RENDERED component's actual inline script body (threaded
    // through the next/script mock via data-html), not just the separately
    // exported buildGtagInit() helper — this is what would actually catch a
    // regression in the component itself (e.g. passing the wrong prop, or
    // reordering the <Script> tags).
    const body = init!.getAttribute("data-html") ?? "";
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

describe("GoogleAnalytics decline hardening", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).gtag;
    delete (window as unknown as Record<string, unknown>)["ga-disable-G-TEST12345"];
  });

  it("updates gtag consent and sets the ga-disable kill switch on a same-tab Decline, clearing it on a later Accept", async () => {
    const gtagSpy = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtagSpy;

    render(<GoogleAnalytics />);
    // GoogleAnalyticsInner fires its own page_view call on mount — that's
    // unrelated to consent, so only assert no *consent* call has happened
    // yet, rather than asserting gtag was never called at all.
    expect(gtagSpy).not.toHaveBeenCalledWith("consent", "update", expect.anything());

    act(() => writeConsent("denied"));
    await waitFor(() =>
      expect(gtagSpy).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" }),
    );
    // The kill switch is gtag.js's own documented per-property opt-out flag:
    // it stops Enhanced Measurement / trackEvent() from sending further
    // cookieless pings, which the consent-mode update alone does not.
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST12345"]).toBe(true);

    act(() => writeConsent("granted"));
    await waitFor(() =>
      expect(gtagSpy).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" }),
    );
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST12345"]).toBe(false);
  });

  it("reacts to a Decline written by another tab via the storage event", async () => {
    const gtagSpy = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtagSpy;

    render(<GoogleAnalytics />);

    // Simulate another tab's writeConsent("denied"): by the time the
    // `storage` event reaches this tab, the OTHER tab has already persisted
    // it to localStorage. The event itself only ever fires in tabs that did
    // NOT make the write, and jsdom doesn't emulate that cross-tab delivery
    // automatically, so the test performs both steps by hand.
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "denied", at: new Date().toISOString() }),
    );
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: CONSENT_STORAGE_KEY, newValue: "denied" }),
      );
    });

    await waitFor(() =>
      expect(gtagSpy).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" }),
    );
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST12345"]).toBe(true);
  });

  it("ignores storage events for unrelated keys", async () => {
    const gtagSpy = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtagSpy;

    render(<GoogleAnalytics />);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key", newValue: "x" }));
    });
    // Only the unrelated page_view call from mount should have happened —
    // the storage listener must ignore a key that isn't the consent key.
    expect(gtagSpy).not.toHaveBeenCalledWith("consent", "update", expect.anything());
  });
});
