import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { readConsent, CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

const pathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

beforeEach(() => {
  localStorage.clear();
  document.body.className = "";
  pathnameMock.mockReturnValue("/");
});

afterEach(cleanup);

describe("ConsentBanner", () => {
  it("shows Accept and Decline when no choice is stored", async () => {
    render(<ConsentBanner />);
    await waitFor(() => expect(screen.getByRole("region", { name: /cookie consent/i })).toBeTruthy());
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^decline$/i })).toBeTruthy();
  });

  it("links to the privacy policy", async () => {
    render(<ConsentBanner />);
    await waitFor(() => screen.getByRole("region", { name: /cookie consent/i }));
    expect(screen.getByRole("link", { name: /privacy/i }).getAttribute("href")).toBe("/privacy");
  });

  it("stores 'granted' and hides itself on Accept", async () => {
    render(<ConsentBanner />);
    await waitFor(() => screen.getByRole("region", { name: /cookie consent/i }));
    fireEvent.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(readConsent()).toBe("granted");
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /cookie consent/i })).toBeNull(),
    );
  });

  it("stores 'denied' and hides itself on Decline", async () => {
    render(<ConsentBanner />);
    await waitFor(() => screen.getByRole("region", { name: /cookie consent/i }));
    fireEvent.click(screen.getByRole("button", { name: /^decline$/i }));
    expect(readConsent()).toBe("denied");
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /cookie consent/i })).toBeNull(),
    );
  });

  it("stays hidden when a valid choice already exists", async () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ value: "granted", at: new Date().toISOString() }),
    );
    const { container } = render(<ConsentBanner />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("never renders on admin routes", async () => {
    pathnameMock.mockReturnValue("/admin/leads");
    const { container } = render(<ConsentBanner />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("toggles the body class so floating buttons lift while it is visible", async () => {
    render(<ConsentBanner />);
    await waitFor(() => expect(document.body.classList.contains("consent-banner-open")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => expect(document.body.classList.contains("consent-banner-open")).toBe(false));
  });
});
