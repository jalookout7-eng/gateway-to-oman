/**
 * Gating logic for the timed intake popup (spec 2026-07-26).
 *
 * Kept free of React so every rule is unit-testable without rendering.
 *
 * Scope is deliberately narrow: the two home pages only. This is an
 * interruption, and an interruption on a listing detail page or a legal
 * page is just noise.
 */

export const INTAKE_POPUP_PATHS = ["/", "/businesses"] as const;
export const INTAKE_POPUP_DELAY_MS = 15_000;

/** Session-scoped: a dismissal lasts this visit only, per JA. */
export const INTAKE_DISMISSED_KEY = "gto_intake_dismissed";
/** Persistent: someone who submitted is never prompted again. */
export const INTAKE_SUBMITTED_KEY = "gto_intake_submitted";
/**
 * Session-scoped: set when the Omar panel opens. A visitor already talking
 * to Omar is engaged, and dropping a modal form over a live conversation
 * would interrupt the primary lead flow to sell them the secondary one.
 */
export const CHAT_ENGAGED_KEY = "gto_chat_engaged";

export interface PopupGateState {
  pathname: string | null;
  dismissed: boolean;
  submitted: boolean;
  chatEngaged: boolean;
}

export function isIntakePopupPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (INTAKE_POPUP_PATHS as readonly string[]).includes(pathname);
}

export function shouldArmIntakePopup(state: PopupGateState): boolean {
  return (
    isIntakePopupPath(state.pathname) &&
    !state.dismissed &&
    !state.submitted &&
    !state.chatEngaged
  );
}

// Storage access is wrapped: Safari private mode throws on write, and a
// thrown error here would take down the page that hosts the popup.
function safeSet(store: "session" | "local", key: string): void {
  if (typeof window === "undefined") return;
  try {
    (store === "session" ? window.sessionStorage : window.localStorage).setItem(key, "1");
  } catch {
    // storage unavailable: the popup simply behaves as if never dismissed
  }
}

function safeHas(store: "session" | "local", key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (store === "session" ? window.sessionStorage : window.localStorage).getItem(key) !== null;
  } catch {
    return false;
  }
}

export function markIntakeDismissed(): void { safeSet("session", INTAKE_DISMISSED_KEY); }
export function markIntakeSubmitted(): void { safeSet("local", INTAKE_SUBMITTED_KEY); }
export function markChatEngaged(): void { safeSet("session", CHAT_ENGAGED_KEY); }

export function readPopupGateState(pathname: string | null): PopupGateState {
  return {
    pathname,
    dismissed: safeHas("session", INTAKE_DISMISSED_KEY),
    submitted: safeHas("local", INTAKE_SUBMITTED_KEY),
    chatEngaged: safeHas("session", CHAT_ENGAGED_KEY),
  };
}
