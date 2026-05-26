import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Gateway to Oman. All rights reserved.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-400 uppercase tracking-wide text-xs">Legal</span>
            <Link href="/privacy" className="hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gold transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-gold transition-colors">
              Cookie Notice
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
