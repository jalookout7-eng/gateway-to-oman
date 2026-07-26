import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { IntakePopup } from "@/components/intake/IntakePopup";
import { markIntakeSubmitted, markChatEngaged, INTAKE_DISMISSED_KEY } from "@/lib/intake/popup";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/";
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  act(() => { vi.advanceTimersByTime(ms); });
}

describe("IntakePopup", () => {
  it("stays hidden before eight seconds", () => {
    render(<IntakePopup />);
    advance(7_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens at eight seconds on the main home page", () => {
    render(<IntakePopup />);
    advance(8_000);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("opens on the marketplace home page", () => {
    pathname = "/businesses";
    render(<IntakePopup />);
    advance(8_000);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("never opens on admin", () => {
    pathname = "/admin/leads";
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never opens on a listing page", () => {
    pathname = "/businesses/listings";
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never opens for a visitor who already submitted", () => {
    markIntakeSubmitted();
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never opens for a visitor who opened the chat", () => {
    markChatEngaged();
    render(<IntakePopup />);
    advance(60_000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on the close button and records a session dismissal", () => {
    render(<IntakePopup />);
    advance(8_000);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.sessionStorage.getItem(INTAKE_DISMISSED_KEY)).toBe("1");
  });

  it("closes on Escape", () => {
    render(<IntakePopup />);
    advance(8_000);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a backdrop click", () => {
    render(<IntakePopup />);
    advance(8_000);
    fireEvent.click(screen.getByTestId("intake-popup-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stacks above the consent banner and the chat", () => {
    render(<IntakePopup />);
    advance(8_000);
    expect(screen.getByTestId("intake-popup-backdrop").className).toContain("z-[60]");
  });
});

describe("IntakePopup handoff to Omar", () => {
  it("broadcasts a dismissal when closed without submitting", () => {
    const listener = vi.fn();
    window.addEventListener("gto:intake-dismissed", listener);
    render(<IntakePopup />);
    advance(8_000);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("gto:intake-dismissed", listener);
  });

  it("does not broadcast after a successful submission", async () => {
    const listener = vi.fn();
    window.addEventListener("gto:intake-dismissed", listener);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ success: true, id: "x" }) })),
    );

    render(<IntakePopup />);
    advance(8_000);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane Smith" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "jane@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit/i }));
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener("gto:intake-dismissed", listener);
  });
});
