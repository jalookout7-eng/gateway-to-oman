import { cookies } from "next/headers";
import {
  MARKETPLACE_SESSION_COOKIE,
  getMarketplaceSession,
  type MarketplaceUser,
} from "@/lib/auth/marketplace";

/**
 * Server-component helper: read the marketplace session cookie and return the
 * signed-in marketplace user (or null). Use this in pages / route handlers that
 * gate the businesses-for-sale marketplace.
 *
 * Note: a user can be signed in but NOT yet activated (access_activated = 0).
 * Gating decisions should check `user?.access_activated`, not just presence.
 */
export async function getCurrentMarketplaceUser(): Promise<MarketplaceUser | null> {
  const token = cookies().get(MARKETPLACE_SESSION_COOKIE)?.value;
  return getMarketplaceSession(token);
}
