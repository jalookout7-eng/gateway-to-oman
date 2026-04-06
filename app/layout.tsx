import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
      <body className={`${bodoniModa.variable} ${jost.variable} font-body antialiased`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
