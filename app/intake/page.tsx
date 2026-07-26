import Image from "next/image";
import Link from "next/link";
import { IntakeForm } from "@/components/intake/IntakeForm";

export const metadata = {
  title: "Start Your Oman Journey | Gateway to Oman",
  description: "Tell the Gateway to Oman advisory team about your goals and we will be in touch.",
  // Unlisted: this is a link Ahmed shares directly with prospects, not a
  // page we want competing with the landing page in search results.
  robots: { index: false, follow: false },
};

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            {/* Use the same logo asset as the admin loading screen. */}
            <Image src="/icon-192.png" alt="Gateway to Oman" width={32} height={32} className="rounded" />
            <span className="font-heading text-lg text-navy">Gateway to Oman</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-navy">Start Your Oman Journey</h1>
            <p className="mt-2 text-sm text-gray-600">
              Share a few details and our advisory team will be in touch to discuss your goals.
            </p>
          </div>
          <IntakeForm variant="page" />
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-500">
        <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
      </footer>
    </div>
  );
}
