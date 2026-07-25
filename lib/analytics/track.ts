/**
 * Shared helper for GA4 conversion events (Notes 7).
 *
 * Importable from any client component. No-op when gtag isn't loaded (e.g.
 * GA env var not set, or running server-side) — callers don't have to
 * defend against that themselves.
 *
 * Suggested events to wire up:
 *   - `lead_submit`              when the chat lead form is submitted
 *   - `access_request_submit`    when the marketplace access form is submitted
 *   - `marketplace_sign_up`      when an OTP signup is verified
 *   - `marketplace_sign_in`      when an existing user verifies OTP
 *   - `whatsapp_click`           when the green floating button is tapped
 *   - `calendly_click`           when "Book a consultation" is tapped
 *   - `chat_opened`              when Omar floating button is opened
 *   - `listing_view`             when a listing detail page loads
 *
 * The consent banner is live (see GoogleAnalytics.tsx) and gtag respects
 * `analytics_storage` automatically, so these calls need no per-call
 * consent guard.
 */

type GtagWindow = Window & {
  gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
};

export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", eventName, params);
}
