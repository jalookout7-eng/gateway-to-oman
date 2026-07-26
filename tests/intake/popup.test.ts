import { describe, it, expect, beforeEach } from "vitest";
import {
  isIntakePopupPath,
  shouldArmIntakePopup,
  readPopupGateState,
  markIntakeDismissed,
  markIntakeSubmitted,
  markChatEngaged,
  INTAKE_POPUP_DELAY_MS,
} from "@/lib/intake/popup";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("isIntakePopupPath", () => {
  it("allows exactly the two home pages", () => {
    expect(isIntakePopupPath("/")).toBe(true);
    expect(isIntakePopupPath("/businesses")).toBe(true);
  });

  it("blocks every other path", () => {
    for (const p of [
      "/admin", "/admin/leads", "/intake", "/privacy", "/terms",
      "/businesses/listings", "/businesses/access", "/businesses/listing/abc", null,
    ]) {
      expect(isIntakePopupPath(p)).toBe(false);
    }
  });
});

describe("shouldArmIntakePopup", () => {
  const base = { pathname: "/", dismissed: false, submitted: false, chatEngaged: false };

  it("arms on a clean first visit to an allowed page", () => {
    expect(shouldArmIntakePopup(base)).toBe(true);
  });

  it("does not arm on a disallowed page", () => {
    expect(shouldArmIntakePopup({ ...base, pathname: "/admin" })).toBe(false);
  });

  it("does not arm after a dismissal this session", () => {
    expect(shouldArmIntakePopup({ ...base, dismissed: true })).toBe(false);
  });

  it("does not arm for someone who already submitted", () => {
    expect(shouldArmIntakePopup({ ...base, submitted: true })).toBe(false);
  });

  it("does not arm for someone who opened the chat", () => {
    expect(shouldArmIntakePopup({ ...base, chatEngaged: true })).toBe(false);
  });
});

describe("storage markers", () => {
  it("fires after eight seconds", () => {
    expect(INTAKE_POPUP_DELAY_MS).toBe(8000);
  });

  it("keeps dismissal to the session and submission beyond it", () => {
    markIntakeDismissed();
    markIntakeSubmitted();
    const state = readPopupGateState("/");
    expect(state.dismissed).toBe(true);
    expect(state.submitted).toBe(true);

    // A new session clears sessionStorage but not localStorage.
    window.sessionStorage.clear();
    const next = readPopupGateState("/");
    expect(next.dismissed).toBe(false);
    expect(next.submitted).toBe(true);
  });

  it("records chat engagement in session storage", () => {
    markChatEngaged();
    expect(readPopupGateState("/").chatEngaged).toBe(true);
  });
});
