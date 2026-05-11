import Link from "next/link";
import { ChevronLeft, Clock, Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "List Your Business — Coming Soon | Gateway to Oman",
  description:
    "Self-service business listing on the Gateway to Oman marketplace is coming soon. In the meantime, contact us directly to have your business listed.",
};

export default function ListYourBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to marketplace
      </Link>

      <div className="mt-8 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-navy to-navy-light px-8 py-12 text-white text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold-light ring-1 ring-gold/30">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </span>
          <h1 className="mt-5 font-heading text-3xl sm:text-4xl font-semibold leading-tight">
            Self-service listing is on the way.
          </h1>
          <p className="mt-4 text-base text-gray-200 leading-relaxed max-w-2xl mx-auto">
            We&apos;re building the seller side of the marketplace — a portal where business owners
            can submit listings, manage their inventory, and connect with verified buyers. Sign up
            below and we&apos;ll let you know the moment it&apos;s live.
          </p>
        </div>

        <div className="px-8 py-10">
          <h2 className="font-heading text-xl font-semibold text-navy">
            Want to list your business now?
          </h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Gateway to Oman is already vetting and listing businesses directly. Reach out to
            Ahmed and his team — share your business details, financials, and reason for sale,
            and we&apos;ll handle the rest.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://wa.me/?text=Hi%2C%20I%27d%20like%20to%20list%20my%20business%20on%20Gateway%20to%20Oman."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
            >
              Contact us on WhatsApp
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="mailto:azizi@alazizigroup.com?subject=I%27d%20like%20to%20list%20my%20business"
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-navy bg-white px-5 py-3 text-base font-semibold text-navy hover:bg-navy hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email Ahmed
            </a>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-gray-100 bg-warm-cream/30">
          <p className="text-sm text-gray-600 text-center">
            What&apos;s coming in the self-service portal: title and description, category and
            location, financials, photos and video, status management, and direct buyer inquiries.
          </p>
        </div>
      </div>
    </div>
  );
}
