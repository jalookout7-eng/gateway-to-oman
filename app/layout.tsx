import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ChatModalProvider } from "@/lib/context/ChatModalContext";
import { WhatsAppFloatingButton } from "@/components/chat/WhatsAppFloatingButton";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { IntakePopup } from "@/components/intake/IntakePopup";
import "./globals.css";

/**
 * Poppins everywhere (JA, 2026-07-29), replacing the previous Bodoni Moda
 * headings and Jost body.
 *
 * Loaded ONCE. `--font-heading` is aliased to `--font-body` in globals.css
 * rather than by a second Poppins() call, because two loader instances
 * emit duplicate .woff2 files for every shared weight (15 files instead of
 * 5). The `font-heading` and `font-body` utilities are both kept, even
 * though they now resolve to the same family: every page already uses
 * them, so reintroducing a separate display face later is a change to this
 * file plus one CSS line, not to every heading in the app.
 *
 * Poppins is not a variable font on Google Fonts, so weights must be listed
 * explicitly. These five cover what the UI actually uses.
 */
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gateway to Oman — Your Strategic Bridge to Opportunity",
  description:
    "Strategic advisory for entrepreneurs, investors, professionals, and families exploring opportunities in Oman.",
  openGraph: {
    title: "Gateway to Oman — Your Strategic Bridge to Opportunity",
    description:
      "Strategic advisory for entrepreneurs, investors, professionals, and families exploring opportunities in Oman.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${poppins.variable} font-body antialiased`}>
        <ChatModalProvider>
          {children}
          <WhatsAppFloatingButton />
          {/* ChatWidget now subscribes to ChatModalContext (Notes 4) — it
              receives openModal({intent, topic}) calls from landing-page
              cards and opens itself with the topic-aware greeting. The
              old centered ChatModal component has been retired. */}
          <ChatWidget />
        </ChatModalProvider>
        {/* Google Analytics 4 (Notes 7). No-op until NEXT_PUBLIC_GA_MEASUREMENT_ID
            is set in Vercel env. Consent banner (spec 2026-07-25) gates
            analytics via Consent Mode v2 — see lib/analytics/consent.ts. */}
        <GoogleAnalytics />
        <ConsentBanner />
        {/* Timed intake popup (spec 2026-07-26). Mounted globally like the
            consent banner; it gates itself to "/" and "/businesses" and
            renders nothing anywhere else, including /admin. */}
        <IntakePopup />
      </body>
    </html>
  );
}
