import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
