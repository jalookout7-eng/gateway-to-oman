import type { Metadata } from "next";
import { BusinessesHeader } from "@/components/businesses/BusinessesHeader";

export const metadata: Metadata = {
  title: "Businesses for Sale in Oman — Gateway to Oman",
  description:
    "Vetted marketplace of businesses for sale in Oman. Cafés, gyms, industrial properties, travel agencies, and more — each one reviewed by Gateway to Oman before listing.",
};

export default function BusinessesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warm-white">
      <BusinessesHeader />
      <main>{children}</main>
      <footer className="mt-24 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Gateway to Oman — Businesses for Sale</p>
          <p className="mt-1">
            A Gateway to Oman vertical. Visit{" "}
            <a href="/" className="text-gold hover:underline">
              gatewaytooman.com
            </a>{" "}
            for immigration and investment advisory.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-gold transition-colors">Terms of Service</a>
            <a href="/cookies" className="hover:text-gold transition-colors">Cookie Notice</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
