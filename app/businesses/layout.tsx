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
        </div>
      </footer>
    </div>
  );
}
