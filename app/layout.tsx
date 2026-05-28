import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ChatModalProvider } from "@/lib/context/ChatModalContext";
import { WhatsAppFloatingButton } from "@/components/chat/WhatsAppFloatingButton";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false,
});

const jost = Jost({
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
      <body className={`${bodoniModa.variable} ${jost.variable} font-body antialiased`}>
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
            is set in Vercel env. Consent banner is deferred — known compliance
            gap until that lands. See HANDOVER §11. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
