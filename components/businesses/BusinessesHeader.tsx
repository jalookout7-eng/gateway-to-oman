import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ChevronLeft } from "lucide-react";
import {
  MARKETPLACE_SESSION_COOKIE,
  getMarketplaceSession,
} from "@/lib/auth/marketplace";
import { ProfileMenu } from "./ProfileMenu";

/**
 * Server-rendered marketplace header. Reads the marketplace session cookie
 * directly so signed-in visitors see a profile chip instead of "Sign in",
 * with no client-side roundtrip on first paint. The interactive dropdown
 * (sign-out etc.) is a client component (ProfileMenu).
 */
export async function BusinessesHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MARKETPLACE_SESSION_COOKIE)?.value;
  const user = await getMarketplaceSession(token).catch(() => null);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 py-3">
        <Link href="/businesses" className="flex items-center gap-3">
          <Image
            src="/gto-logo.png"
            alt="Gateway to Oman"
            width={160}
            height={48}
            priority
            className="h-10 w-auto"
          />
          <span className="hidden sm:inline-block h-6 w-px bg-gray-300" aria-hidden="true" />
          <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-gold">
            Businesses for Sale
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-700">
          <Link href="/businesses" className="hover:text-gold transition-colors">
            Browse
          </Link>
          {/* Why us anchor — scrolls to the "What makes us different" section
              on the marketplace landing page (Notes 3 item 1). Replaces the
              Calendly link from Notes 2; the Calendly CTA is now on the hero
              and the final-CTA section, so the nav slot is used for in-page
              navigation that helps a browsing visitor self-educate. */}
          <Link href="/businesses#why-us" className="hover:text-gold transition-colors">
            Why us
          </Link>
          <Link href="/businesses/about" className="hover:text-gold transition-colors">
            How it works
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Main site
          </Link>
          {user ? (
            <ProfileMenu
              user={{
                full_name: user.full_name,
                email: user.email,
                access_activated: user.access_activated,
              }}
            />
          ) : (
            <Link
              href="/businesses/sign-in"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-gold hover:text-gold transition-all"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
