import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BusinessesHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/businesses" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gold-gradient text-white font-heading text-base font-bold">
            G
          </div>
          <div className="leading-tight">
            <p className="font-heading text-base font-semibold text-navy">Gateway to Oman</p>
            <p className="text-xs text-gold font-medium">Businesses for Sale</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-700">
          <Link href="/businesses" className="hover:text-gold transition-colors">
            Browse
          </Link>
          <Link href="/businesses/list-your-business" className="hover:text-gold transition-colors">
            List a business
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
          <Link
            href="/businesses/sign-in"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-gold hover:text-gold transition-all"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
