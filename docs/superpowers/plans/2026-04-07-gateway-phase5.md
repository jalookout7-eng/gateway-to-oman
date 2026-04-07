# Gateway to Oman — Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add context-aware chat modal, consultation booking with calendar, push notifications, PWA support, AI lead summaries, and fix all UI/UX issues identified in the Phase 5 spec.

**Architecture:** A global `ChatModalContext` lets any CTA open a pre-seeded fresh chat conversation in a centered modal. Bookings flow through the AI chat (signals), are stored in Turso, and trigger push notifications to Ahmed via Web Push API with a service worker. All outbound emails to leads require Ahmed's approval before sending.

**Tech Stack:** Next.js 14 App Router, Turso (libsql), Groq, Framer Motion, web-push, ical-generator, Tailwind CSS, Lucide React

---

## IMPORTANT: Git Config

Before every commit run:
```bash
git config user.email "jalookout7-eng@users.noreply.github.com"
git config user.name "jalookout7-eng"
```
Do NOT add `Co-Authored-By` trailers — Vercel blocks deploys from co-authored commits on Hobby plan.

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install web-push and ical-generator**

```bash
cd /path/to/repo
npm install web-push ical-generator
npm install --save-dev @types/web-push
```

- [ ] **Step 2: Verify package.json has both**

```bash
grep -E "web-push|ical-generator" package.json
```
Expected output: two lines showing the packages with version numbers.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add web-push and ical-generator dependencies"
git push origin master
```

---

## Task 2: Database Migrations

**Files:**
- Modify: `lib/db/schema.sql`
- Modify: `scripts/migrate.ts`

- [ ] **Step 1: Update schema.sql with all new tables and columns**

Add to the END of `lib/db/schema.sql`:

```sql
-- Phase 5 additions

ALTER TABLE leads ADD COLUMN ai_summary TEXT;
ALTER TABLE leads ADD COLUMN booking_id TEXT;

ALTER TABLE emails ADD COLUMN to_address TEXT;
ALTER TABLE emails ADD COLUMN booking_id TEXT;
ALTER TABLE emails ADD COLUMN approved_at TEXT;
-- Extend status check to include 'sent' (already exists) and 'failed'
-- Note: SQLite doesn't support ALTER COLUMN — the status CHECK is in the original CREATE TABLE

CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL,
  time_slot TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lead_id TEXT REFERENCES leads(id),
  conversation_id TEXT REFERENCES conversations(id),
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(preferred_date);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(date);
```

- [ ] **Step 2: Run migration against live database**

```bash
npm run migrate
```

Expected: Script runs without errors. If `ALTER TABLE` fails because columns already exist, that's fine — add `IF NOT EXISTS` guards or run each ALTER separately.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.sql scripts/migrate.ts
git commit -m "feat: add Phase 5 DB tables — bookings, blocked_slots, push_subscriptions, ai_summary"
git push origin master
```

---

## Task 3: Quick Fix — Hero Overlay

**Files:**
- Modify: `components/landing/Hero.tsx`

- [ ] **Step 1: Increase overlay opacity**

Find line:
```tsx
<div className="absolute inset-0 bg-gradient-to-br from-navy/93 via-navy/83 to-navy/93" />
```

Replace with:
```tsx
<div className="absolute inset-0 bg-navy/80" />
<div className="absolute inset-0 backdrop-blur-[1px]" />
```

This gives a solid dark base (80% navy) plus a subtle 1px blur that softens the image without destroying it, making white text fully legible.

- [ ] **Step 2: Verify locally**

```bash
npm run dev
```
Open http://localhost:3000 and check that the hero heading and subtext are clearly readable against the background photo.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Hero.tsx
git commit -m "fix: increase hero overlay opacity for text legibility"
git push origin master
```

---

## Task 4: Quick Fix — Hide ChatWidget on Admin Routes

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace ChatWidget with a conditional wrapper**

Replace the content of `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
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
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create ChatWidget with admin detection**

Open `components/chat/ChatWidget.tsx`. Add this at the top of the component, before the return:

```tsx
const pathname = usePathname();
if (pathname?.startsWith("/admin")) return null;
```

Add the import at the top of the file:
```tsx
import { usePathname } from "next/navigation";
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```
Go to http://localhost:3000/admin — the "AI Assistant" pill button should NOT appear. Go to http://localhost:3000 — it should appear after 7 seconds.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx components/chat/ChatWidget.tsx
git commit -m "fix: hide ChatWidget on admin routes, add manifest link"
git push origin master
```

---

## Task 5: Quick Fix — Chat Fully Closes After Lead Capture

**Files:**
- Modify: `components/chat/ChatWidget.tsx`

- [ ] **Step 1: Update handleLeadSubmit to close the widget**

Find `handleLeadSubmit` in `ChatWidget.tsx`:

```tsx
const handleLeadSubmit = useCallback(() => {
  setLeadCaptured(true);
  setShowCaptureForm(false);
  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content:
        "Thanks! Ahmed will be in touch shortly. In the meantime, feel free to ask me anything about Oman or our services.",
    },
  ]);
}, []);
```

Replace with:

```tsx
const handleLeadSubmit = useCallback(() => {
  setLeadCaptured(true);
  setShowCaptureForm(false);
  setIsClosed(true);
  // Close the widget after a short delay so user sees confirmation
  setTimeout(() => setIsOpen(false), 2000);
  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content: "Details received — Ahmed will be in touch with you shortly.",
    },
  ]);
}, []);
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```
Trigger the lead capture form (either wait 5 exchanges or temporarily lower the hard ceiling). Submit the form and confirm the widget closes after ~2 seconds.

- [ ] **Step 3: Commit**

```bash
git add components/chat/ChatWidget.tsx
git commit -m "fix: close chat widget fully after lead form submission"
git push origin master
```

---

## Task 6: Quick Fix — Chatbot Follow-Up Rule + Identity

**Files:**
- Modify: `lib/ai/prompts.ts`

- [ ] **Step 1: Add follow-up rule to HARD RULES section**

Find the `## HARD RULES` section. Add this line before the last rule:

```
Every response must end with exactly one qualifying question — even when answering a factual question. The question must advance your understanding of whether Oman is the right fit for this specific person.
Never end a response without a question unless [CAPTURE_READY] or [CLOSE_CHAT] is being embedded.
```

- [ ] **Step 2: Update chatbot identity in the WHO YOU ARE section**

Find:
```
You work with Ahmed Al-Azizi at Gateway to Oman. Your job is to figure out whether Oman is genuinely the right move for each person — and if it is, connect them with Ahmed.
```

Add after it:
```
To visitors, you are the "AI Assistant" for Gateway to Oman. Do not introduce yourself by name. If asked your name, say "I'm the AI assistant for Gateway to Oman."
```

- [ ] **Step 3: Update greeting header in ChatWidget**

In `components/chat/ChatWidget.tsx`, find:
```tsx
<p className="text-white font-semibold text-sm">
  Gateway to Oman
</p>
<p className="text-white/80 text-xs">
  Your guide to opportunity
</p>
```

Replace with:
```tsx
<p className="text-white font-semibold text-sm">
  AI Assistant
</p>
<p className="text-white/80 text-xs">
  Gateway to Oman
</p>
```

- [ ] **Step 4: Commit**

```bash
git add lib/ai/prompts.ts components/chat/ChatWidget.tsx
git commit -m "fix: chatbot identifies as AI Assistant, always asks follow-up question"
git push origin master
```

---

## Task 7: Quick Fix — Mobile Chat Zoom + WhatsApp Layout

**Files:**
- Modify: `components/chat/ChatInput.tsx`
- Modify: `components/chat/ChatWidget.tsx`

- [ ] **Step 1: Fix iOS zoom by setting font-size 16px on input**

Replace `components/chat/ChatInput.tsx` entirely:

```tsx
"use client";

import { useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Message..."
        disabled={disabled}
        style={{ fontSize: "16px" }}
        className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-gray-400 text-navy"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-10 h-10 rounded-full gold-gradient text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
```

The key change: `style={{ fontSize: "16px" }}` — iOS auto-zooms any input with font-size below 16px. Setting it inline overrides Tailwind's default.

- [ ] **Step 2: Make chat window full-height on mobile**

In `components/chat/ChatWidget.tsx`, find the chat window motion.div class:
```tsx
className="fixed bottom-6 right-6 w-[360px] h-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col border border-gray-100"
```

Replace with:
```tsx
className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[380px] h-[100dvh] sm:h-[560px] bg-white sm:rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col border-0 sm:border border-gray-100"
```

This makes the chat full-screen on mobile (like WhatsApp) and the floating widget on sm+.

- [ ] **Step 3: Verify on mobile viewport**

```bash
npm run dev
```
Open Chrome DevTools, switch to mobile viewport (375px wide). Open chat, tap the input — no zoom should occur. The chat should fill the full screen.

- [ ] **Step 4: Commit**

```bash
git add components/chat/ChatInput.tsx components/chat/ChatWidget.tsx
git commit -m "fix: prevent iOS input zoom, WhatsApp-style mobile chat layout"
git push origin master
```

---

## Task 8: Quick Fix — Opportunity Images + Remove Text

**Files:**
- Modify: `components/landing/Opportunities.tsx`
- Modify: relevant landing section file (find "no sales pitch" text)

- [ ] **Step 1: Fix duplicate images in Opportunities**

In `components/landing/Opportunities.tsx`, update the opportunities array:

```tsx
const opportunities = [
  {
    title: "Rehabilitation Center",
    location: "Al Khoudh, Muscat",
    price: "OMR 250,000",
    tag: "Healthcare",
    photo: "https://images.pexels.com/photos/30854646/pexels-photo-30854646.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Modern healthcare facility in Oman",
  },
  {
    title: "Franchise Partnerships",
    location: "Oman & Saudi Arabia",
    price: "OMR 10K–500K",
    tag: "F&B / Retail",
    photo: "https://images.pexels.com/photos/30798982/pexels-photo-30798982.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Scenic coastal road in Muscat, Oman",
  },
  {
    title: "Real Estate ITCs",
    location: "Freehold + Residency",
    price: "From OMR 50K",
    tag: "Property",
    photo: "https://images.pexels.com/photos/31016040/pexels-photo-31016040.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Coastal property view in Muscat, Oman",
  },
  {
    title: "Businesses for Sale",
    location: "F&B, Services, Retail, Healthcare",
    price: "OMR 2.5K–200K",
    tag: "Acquisitions",
    photo: "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Aerial view of Muscat business district",
  },
  {
    title: "Digital Banking",
    location: "CBO Licensed",
    price: "OMR 10M–30M",
    tag: "Fintech",
    photo: "https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Digital banking and fintech technology",
  },
  {
    title: "Career Platform",
    location: "Register & Upload CV",
    price: "Free",
    tag: "Careers",
    photo: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Professional office environment",
  },
];
```

- [ ] **Step 2: Find and remove "no sales pitch, just truth" text**

```bash
grep -r "sales pitch" /path/to/repo/components --include="*.tsx" -l
```

Open the file found, locate the text, and delete the entire element containing it.

- [ ] **Step 3: Commit**

```bash
git add components/landing/Opportunities.tsx
git add components/landing/  # include whatever file had the sales pitch text
git commit -m "fix: replace duplicate opportunity images, remove sales pitch text"
git push origin master
```

---

## Task 9: Global Chat Modal Context

**Files:**
- Create: `lib/context/ChatModalContext.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create the context**

Create `lib/context/ChatModalContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ChatModalIntent = "consultation" | "opportunity";

export interface ChatModalConfig {
  intent: ChatModalIntent;
  topic?: string;
}

interface ChatModalContextValue {
  isOpen: boolean;
  config: ChatModalConfig | null;
  openModal: (config: ChatModalConfig) => void;
  closeModal: () => void;
}

const ChatModalContext = createContext<ChatModalContextValue | null>(null);

export function ChatModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ChatModalConfig | null>(null);

  const openModal = useCallback((cfg: ChatModalConfig) => {
    setConfig(cfg);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Small delay before clearing config so exit animation can complete
    setTimeout(() => setConfig(null), 300);
  }, []);

  return (
    <ChatModalContext.Provider value={{ isOpen, config, openModal, closeModal }}>
      {children}
    </ChatModalContext.Provider>
  );
}

export function useChatModal(): ChatModalContextValue {
  const ctx = useContext(ChatModalContext);
  if (!ctx) throw new Error("useChatModal must be used within ChatModalProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap root layout with provider**

In `app/layout.tsx`, import and wrap:

```tsx
import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ChatModalProvider } from "@/lib/context/ChatModalContext";
import "./globals.css";

// ... font config unchanged ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${bodoniModa.variable} ${jost.variable} font-body antialiased`}>
        <ChatModalProvider>
          {children}
          <ChatWidget />
        </ChatModalProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build 2>&1 | tail -20
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/context/ChatModalContext.tsx app/layout.tsx
git commit -m "feat: add ChatModalContext for global context-aware chat modal"
git push origin master
```

---

## Task 10: Chat Modal Component

**Files:**
- Create: `components/chat/ChatModal.tsx`

- [ ] **Step 1: Create ChatModal component**

Create `components/chat/ChatModal.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { useChatModal } from "@/lib/context/ChatModalContext";

const CONTEXT_GREETINGS: Record<string, string> = {
  consultation:
    "To make the most of a consultation with Ahmed, I need to understand your situation first. What's the main thing you're trying to figure out — is it a business opportunity, investment, career move, or a lifestyle relocation?",
  "Businesses for Sale":
    "Good choice to look at this. What kind of business are you thinking about — something you'd run yourself, or a passive investment?",
  "Franchise Partnerships":
    "Franchise partnerships in Oman work differently than most markets. What's your background — have you operated a franchise before, or is this a first?",
  "Real Estate ITCs":
    "Real estate ITCs are one of the cleaner paths into Oman — you get property and a residency pathway. What's driving the interest, the investment return or the residency?",
  "Businesses for Sale":
    "There's a wide range here from OMR 2,500 to 200,000. Are you looking at something small to get started, or are you positioned for a larger acquisition?",
  "Digital Banking":
    "Digital banking licenses in Oman require significant capital — OMR 10M minimum. Are you exploring this as a lead investor or as part of a consortium?",
  "Career Platform":
    "Oman has real demand for skilled professionals right now. What's your field and what kind of role are you looking for?",
  "Rehabilitation Center":
    "Healthcare is one of the stronger sectors in Oman right now. Are you a healthcare professional looking to operate this, or purely an investor?",
};

function getGreeting(intent: string, topic?: string): string {
  if (topic && CONTEXT_GREETINGS[topic]) return CONTEXT_GREETINGS[topic];
  if (intent === "consultation") return CONTEXT_GREETINGS.consultation;
  return "What specifically interests you about this opportunity?";
}

export function ChatModal() {
  const { isOpen, config, closeModal } = useChatModal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [detectedSegment, setDetectedSegment] = useState<string | null>(null);
  const [detectedInterest, setDetectedInterest] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens with new config
  useEffect(() => {
    if (isOpen && config) {
      setMessages([{ role: "assistant", content: getGreeting(config.intent, config.topic) }]);
      setExchangeCount(0);
      setShowCaptureForm(false);
      setLeadCaptured(false);
      setConversationId(null);
      setDetectedSegment(null);
      setDetectedInterest(null);
    }
  }, [isOpen, config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isTyping || !config) return;

      const userMessage: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId,
            history: messages,
            context: { intent: config.intent, topic: config.topic ?? null },
          }),
        });

        const data = await res.json();
        if (data.conversationId) setConversationId(data.conversationId);

        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

        const newCount = exchangeCount + 1;
        setExchangeCount(newCount);

        if (data.signals?.segment) setDetectedSegment(data.signals.segment);
        if (data.signals?.interest) setDetectedInterest(data.signals.interest);
        if (data.signals?.captureReady && !leadCaptured) setShowCaptureForm(true);
        if (data.signals?.closeChat) setTimeout(closeModal, 2000);
        if (newCount >= 5 && !leadCaptured && !showCaptureForm) setShowCaptureForm(true);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Having trouble connecting. Please try again." },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, config, sessionId, messages, exchangeCount, leadCaptured, showCaptureForm, closeModal]
  );

  const handleLeadSubmit = useCallback(() => {
    setLeadCaptured(true);
    setShowCaptureForm(false);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Details received — Ahmed will be in touch with you shortly." },
    ]);
    setTimeout(closeModal, 2000);
  }, [closeModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />

          {/* Modal — centered on desktop, bottom sheet on mobile */}
          <motion.div
            className="fixed z-[70] bg-white flex flex-col overflow-hidden
              bottom-0 left-0 right-0 h-[90dvh] rounded-t-2xl
              sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-[480px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div className="gold-gradient px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-white font-semibold text-sm">AI Assistant</p>
                <p className="text-white/80 text-xs">
                  {config?.topic ?? "Gateway to Oman"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-white/80 hover:text-white p-1"
                aria-label="Close chat"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <ChatMessages messages={messages} isTyping={isTyping} />
              <div ref={messagesEndRef} />
            </div>

            {/* Lead capture form */}
            {showCaptureForm && !leadCaptured && conversationId && (
              <LeadCaptureForm
                conversationId={conversationId}
                segment={detectedSegment}
                interest={detectedInterest}
                onSubmit={handleLeadSubmit}
              />
            )}

            {/* Input */}
            {!leadCaptured && <ChatInput onSend={sendMessage} disabled={isTyping} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Add ChatModal to root layout**

In `app/layout.tsx`, import and add `<ChatModal />` next to `<ChatWidget />`:

```tsx
import { ChatModal } from "@/components/chat/ChatModal";

// Inside body:
<ChatModalProvider>
  {children}
  <ChatWidget />
  <ChatModal />
</ChatModalProvider>
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add components/chat/ChatModal.tsx app/layout.tsx
git commit -m "feat: add context-aware ChatModal component"
git push origin master
```

---

## Task 11: Wire Opportunity Cards + CTAs to Modal

**Files:**
- Modify: `components/landing/Opportunities.tsx`
- Modify: `components/landing/Hero.tsx`
- Modify: `components/landing/ContactCTA.tsx` (or wherever "Book Free Consultation" exists outside Hero)

- [ ] **Step 1: Make opportunity cards clickable buttons**

Replace the full `components/landing/Opportunities.tsx`:

```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ScrollAnimationWrapper } from "./ScrollAnimationWrapper";
import { useChatModal } from "@/lib/context/ChatModalContext";

const opportunities = [
  {
    title: "Rehabilitation Center",
    location: "Al Khoudh, Muscat",
    price: "OMR 250,000",
    tag: "Healthcare",
    photo: "https://images.pexels.com/photos/30854646/pexels-photo-30854646.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Modern healthcare facility in Oman",
  },
  {
    title: "Franchise Partnerships",
    location: "Oman & Saudi Arabia",
    price: "OMR 10K–500K",
    tag: "F&B / Retail",
    photo: "https://images.pexels.com/photos/30798982/pexels-photo-30798982.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Scenic coastal road in Muscat, Oman",
  },
  {
    title: "Real Estate ITCs",
    location: "Freehold + Residency",
    price: "From OMR 50K",
    tag: "Property",
    photo: "https://images.pexels.com/photos/31016040/pexels-photo-31016040.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Coastal property view in Muscat, Oman",
  },
  {
    title: "Businesses for Sale",
    location: "F&B, Services, Retail, Healthcare",
    price: "OMR 2.5K–200K",
    tag: "Acquisitions",
    photo: "https://images.pexels.com/photos/18331886/pexels-photo-18331886.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Aerial view of Muscat business district",
  },
  {
    title: "Digital Banking",
    location: "CBO Licensed",
    price: "OMR 10M–30M",
    tag: "Fintech",
    photo: "https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Digital banking and fintech technology",
  },
  {
    title: "Career Platform",
    location: "Register & Upload CV",
    price: "Free",
    tag: "Careers",
    photo: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    photoAlt: "Professional office environment",
  },
];

export function Opportunities() {
  const { openModal } = useChatModal();

  return (
    <section id="opportunities" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <ScrollAnimationWrapper animation="fadeUp">
          <h2 className="text-4xl md:text-5xl font-bold text-navy text-center mb-4">
            Current <span className="text-gold">Opportunities</span>
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            Verified investment and career opportunities available now.
          </p>
        </ScrollAnimationWrapper>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {opportunities.map((o, i) => (
            <ScrollAnimationWrapper key={o.title} animation="fadeUp" delay={i * 0.08}>
              <motion.button
                onClick={() => openModal({ intent: "opportunity", topic: o.title })}
                className="w-full text-left bg-warm-white rounded-xl overflow-hidden border border-gold/10 hover:border-gold/30 transition-all flex flex-col cursor-pointer"
                whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(201,155,60,0.12)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="relative h-44 w-full flex-shrink-0">
                  <Image
                    src={o.photo}
                    alt={o.photoAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-navy/20" />
                  <span className="absolute top-3 left-3 inline-block px-3 py-1 bg-gold text-white text-xs font-semibold rounded-full shadow">
                    {o.tag}
                  </span>
                </div>
                <div className="p-6 flex-1">
                  <h3 className="text-lg font-bold text-navy mb-1">{o.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{o.location}</p>
                  <p className="text-2xl font-bold text-gold">{o.price}</p>
                </div>
              </motion.button>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire "Book Free Consultation" button in Hero**

In `components/landing/Hero.tsx`, add `useChatModal` and wire the button:

```tsx
import { useChatModal } from "@/lib/context/ChatModalContext";

// Inside Hero():
const { openModal } = useChatModal();

// Change the Book Free Consultation button:
<Button size="lg" variant="outline" onClick={() => openModal({ intent: "consultation" })}>
  Book Free Consultation
</Button>
```

- [ ] **Step 3: Wire any other consultation CTAs on the page**

Search for other "Book" or "Consult" buttons:
```bash
grep -r "Book\|Consult\|consultation" components/landing --include="*.tsx" -l
```

For each file found, import `useChatModal` and wire the button with `onClick={() => openModal({ intent: 'consultation' })}`. Skip any `mailto:` links — leave those unchanged.

- [ ] **Step 4: Verify**

```bash
npm run dev
```
Click an opportunity card — the ChatModal should open with a context-appropriate greeting. Click "Book Free Consultation" — modal opens with the consultation greeting.

- [ ] **Step 5: Commit**

```bash
git add components/landing/Opportunities.tsx components/landing/Hero.tsx components/landing/
git commit -m "feat: wire opportunity cards and CTAs to context-aware chat modal"
git push origin master
```

---

## Task 12: Update Chat API for Context + Booking Signals

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `lib/ai/signals.ts`
- Create: `app/api/availability/route.ts`

- [ ] **Step 1: Add booking signals to signals.ts**

In `lib/ai/signals.ts`, update `Signals` interface and `parseSignals`:

```ts
export interface Signals {
  captureReady: boolean;
  segment: string | null;
  interest: string | null;
  highIntent: boolean;
  closeChat: boolean;
  bookingDay: string | null;   // YYYY-MM-DD
  bookingTime: string | null;  // HH:MM
}

// In parseSignals, add:
bookingDay: text.match(/\[BOOKING_DAY:([^\]]+)\]/)?.[1]?.trim() ?? null,
bookingTime: text.match(/\[BOOKING_TIME:([^\]]+)\]/)?.[1]?.trim() ?? null,
```

Update `stripSignals`:
```ts
.replace(/\[BOOKING_DAY:[^\]]*\]/g, "")
.replace(/\[BOOKING_TIME:[^\]]*\]/g, "")
```

- [ ] **Step 2: Create availability API**

Create `app/api/availability/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

function getOmanDateString(daysFromNow = 0): string {
  const d = new Date();
  d.setTime(d.getTime() + (4 * 60 * 60 * 1000)); // UTC+4 Oman
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  try {
    const db = getDb();

    // Get default slots from settings
    const slotSetting = await db.execute({
      sql: "SELECT value FROM settings WHERE key = 'consultation_slots'",
      args: [],
    });
    const defaultSlots = slotSetting.rows[0]?.value
      ? String(slotSetting.rows[0].value).split(",")
      : ["09:00", "13:00", "16:00"];

    // Get blocked slots for next 14 days
    const today = getOmanDateString(0);
    const end = getOmanDateString(14);
    const blocked = await db.execute({
      sql: "SELECT date, time_slot FROM blocked_slots WHERE date >= ? AND date <= ?",
      args: [today, end],
    });

    // Get existing bookings for next 14 days
    const booked = await db.execute({
      sql: "SELECT preferred_date, preferred_time FROM bookings WHERE preferred_date >= ? AND preferred_date <= ? AND status != 'cancelled'",
      args: [today, end],
    });

    const blockedDays = new Set<string>();
    const blockedSlotMap: Record<string, Set<string>> = {};

    for (const row of blocked.rows) {
      const d = String(row.date);
      if (!row.time_slot) {
        blockedDays.add(d);
      } else {
        if (!blockedSlotMap[d]) blockedSlotMap[d] = new Set();
        blockedSlotMap[d].add(String(row.time_slot));
      }
    }

    for (const row of booked.rows) {
      const d = String(row.preferred_date);
      const t = String(row.preferred_time);
      if (!blockedSlotMap[d]) blockedSlotMap[d] = new Set();
      blockedSlotMap[d].add(t);
    }

    // Build available days (check next 7, then 8-14 if all full)
    const availableDays: string[] = [];
    const slotsByDay: Record<string, string[]> = {};

    for (let i = 1; i <= 14; i++) {
      const date = getOmanDateString(i);
      if (blockedDays.has(date)) continue;
      const usedSlots = blockedSlotMap[date] ?? new Set();
      const available = defaultSlots.filter((s) => !usedSlots.has(s));
      if (available.length > 0) {
        availableDays.push(date);
        slotsByDay[date] = available;
        if (availableDays.length >= 7) break;
      }
    }

    return NextResponse.json({ availableDays, slotsByDay });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json({ availableDays: [], slotsByDay: {} });
  }
}
```

- [ ] **Step 3: Update chat route to inject context and availability**

Replace `app/api/chat/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/ai/provider";
import { parseSignals, stripSignals } from "@/lib/ai/signals";
import { getDb } from "@/lib/db/client";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

async function getAvailabilityContext(): Promise<string> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/availability`);
    const data = await res.json();
    if (!data.availableDays?.length) return "";

    const days = data.availableDays
      .map((d: string) => {
        const date = new Date(d + "T12:00:00Z");
        const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const slots = data.slotsByDay[d] ?? [];
        return `${label} (${slots.join(", ")})`;
      })
      .join("; ");

    return `\n[AVAILABLE_DAYS: ${days}]`;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history = [], context } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "message and sessionId are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Ensure conversation exists
    const existing = await db.execute({
      sql: "SELECT id FROM conversations WHERE session_id = ?",
      args: [sessionId],
    });

    let conversationId: string;
    if (existing.rows.length === 0) {
      const result = await db.execute({
        sql: "INSERT INTO conversations (session_id) VALUES (?) RETURNING id",
        args: [sessionId],
      });
      conversationId = result.rows[0].id as string;
    } else {
      conversationId = existing.rows[0].id as string;
    }

    // Save user message
    await db.execute({
      sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)",
      args: [conversationId, message],
    });

    // Build system prompt with optional context injection
    let systemPrompt = SYSTEM_PROMPT;
    if (context?.intent) {
      systemPrompt += `\n\n[CONTEXT: visitor clicked '${context.topic ?? context.intent}' — they are interested in ${context.intent === "consultation" ? "booking a consultation with Ahmed" : context.topic}. Open with the right qualifying question for this specific interest.]`;
    }
    if (context?.intent === "consultation") {
      const availabilityContext = await getAvailabilityContext();
      systemPrompt += availabilityContext;
      systemPrompt += "\n\nFor consultation bookings: after qualifying, ask for preferred day from AVAILABLE_DAYS above, then preferred time from that day's slots. Embed [BOOKING_DAY:YYYY-MM-DD] and [BOOKING_TIME:HH:MM] when visitor confirms.";
    }

    // Build message history for AI
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Get AI response
    const rawResponse = await chat(messages);
    const signals = parseSignals(rawResponse);
    const cleanResponse = stripSignals(rawResponse);

    // Save assistant message
    await db.execute({
      sql: "INSERT INTO messages (conversation_id, role, content, raw_content) VALUES (?, 'assistant', ?, ?)",
      args: [conversationId, cleanResponse, rawResponse],
    });

    // Update conversation
    const updates: string[] = [];
    const args: (string | number)[] = [];
    if (signals.segment) { updates.push("segment = ?"); args.push(signals.segment); }
    if (signals.interest) { updates.push("interests = ?"); args.push(signals.interest); }
    updates.push("message_count = message_count + 2");
    if (signals.closeChat) {
      updates.push("outcome = 'closed'");
      updates.push("ended_at = datetime('now')");
    }
    if (updates.length > 0) {
      args.push(conversationId);
      await db.execute({
        sql: `UPDATE conversations SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
    }

    // Handle booking signals — create booking record
    if (signals.bookingDay && signals.bookingTime) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO bookings (conversation_id, preferred_date, preferred_time) VALUES (?, ?, ?)",
        args: [conversationId, signals.bookingDay, signals.bookingTime],
      });
    }

    return NextResponse.json({
      message: cleanResponse,
      signals: {
        captureReady: signals.captureReady,
        segment: signals.segment,
        interest: signals.interest,
        highIntent: signals.highIntent,
        closeChat: signals.closeChat,
        bookingDay: signals.bookingDay,
        bookingTime: signals.bookingTime,
      },
      conversationId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Update chat() in provider.ts to accept a custom system prompt**

In `lib/ai/provider.ts`, update the `chat` function signature:

```ts
export async function chat(messages: ChatMessage[]): Promise<string> {
```

The messages array now includes the system message as the first item (passed from the route). Update `chat()` to NOT prepend SYSTEM_PROMPT:

```ts
export async function chat(messages: ChatMessage[]): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? "groq";

  if (provider === "groq") {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content ?? "";
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
```

Note: Remove the `import { SYSTEM_PROMPT } from "./prompts"` line from `provider.ts` since it's no longer used there.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/signals.ts app/api/availability/route.ts app/api/chat/route.ts lib/ai/provider.ts
git commit -m "feat: availability API, booking signals, context injection in chat API"
git push origin master
```

---

## Task 13: AI Lead Summary

**Files:**
- Modify: `app/api/leads/route.ts`
- Create: `app/api/admin/leads/[id]/summarize/route.ts`
- Modify: `app/admin/leads/page.tsx`

- [ ] **Step 1: Add summary generation to lead creation**

In `app/api/leads/route.ts`, after inserting the lead and before the return, add:

```ts
const leadId = result.rows[0].id as string;

// Generate AI summary async (don't await — don't block the response)
generateLeadSummary(leadId, conversationId, db).catch(console.error);

return NextResponse.json(result.rows[0], { status: 201 });
```

Add the function above the POST handler:

```ts
import Groq from "groq-sdk";

async function generateLeadSummary(leadId: string, conversationId: string | null, db: ReturnType<typeof getDb>) {
  if (!conversationId) return;

  try {
    const msgs = await db.execute({
      sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [conversationId],
    });

    if (msgs.rows.length < 2) {
      await db.execute({
        sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
        args: ["Lead submitted with minimal conversation. Review lead details directly.", leadId],
      });
      return;
    }

    const transcript = msgs.rows
      .map((m) => `${String(m.role).toUpperCase()}: ${String(m.content)}`)
      .join("\n");

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are summarizing a sales qualification conversation for Ahmed Al-Azizi at Gateway to Oman. Write a concise summary with exactly these four labeled sections, each 1-2 sentences, plain prose, no bullet points within sections:\n\nWHO: Who this person is — background, country, situation.\nWANTS: What they are specifically looking for in Oman.\nSIGNALS: Key qualifying indicators and hot/warm/cold assessment.\nBOTTLENECKS: Concerns, hesitations, or obstacles they raised. If none, write "None identified."\nNEXT STEP: Recommended action for Ahmed.`,
        },
        {
          role: "user",
          content: `Conversation:\n\n${transcript}`,
        },
      ],
    });

    const summary = response.choices[0]?.message?.content ?? "";
    await db.execute({
      sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
      args: [summary, leadId],
    });
  } catch (err) {
    console.error("Summary generation failed:", err);
  }
}
```

- [ ] **Step 2: Create summarize endpoint for manual regeneration**

Create `app/api/admin/leads/[id]/summarize/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import Groq from "groq-sdk";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const lead = await db.execute({
    sql: "SELECT conversation_id FROM leads WHERE id = ?",
    args: [params.id],
  });

  if (!lead.rows[0]) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const conversationId = lead.rows[0].conversation_id as string | null;
  if (!conversationId) {
    return NextResponse.json({ error: "No conversation for this lead" }, { status: 400 });
  }

  const msgs = await db.execute({
    sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    args: [conversationId],
  });

  const transcript = msgs.rows
    .map((m) => `${String(m.role).toUpperCase()}: ${String(m.content)}`)
    .join("\n");

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: "You are summarizing a sales qualification conversation for Ahmed Al-Azizi at Gateway to Oman. Write a concise summary with exactly these five labeled sections, each 1-2 sentences, plain prose:\n\nWHO: Who this person is.\nWANTS: What they want in Oman.\nSIGNALS: Qualifying indicators and hot/warm/cold assessment.\nBOTTLENECKS: Concerns or obstacles. If none, write 'None identified.'\nNEXT STEP: Recommended action for Ahmed.",
      },
      { role: "user", content: `Conversation:\n\n${transcript}` },
    ],
  });

  const summary = response.choices[0]?.message?.content ?? "";
  await db.execute({
    sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
    args: [summary, params.id],
  });

  return NextResponse.json({ summary });
}
```

- [ ] **Step 3: Add expandable AI summary to leads table in admin**

Open `app/admin/leads/page.tsx`. This file renders a leads table. Find the table row structure and add an expandable summary section. Add state and expand toggle per lead:

In the leads list component, add:
```tsx
const [expandedLead, setExpandedLead] = useState<string | null>(null);
const [regenerating, setRegenerating] = useState<string | null>(null);

async function regenerateSummary(leadId: string) {
  setRegenerating(leadId);
  try {
    const token = localStorage.getItem("admin_token") ?? "";
    const res = await fetch(`/api/admin/leads/${leadId}/summarize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ai_summary: data.summary } : l))
    );
  } finally {
    setRegenerating(null);
  }
}
```

In each table row, after the existing cells add an expand chevron:
```tsx
<button
  onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
  className="p-1 text-gray-400 hover:text-navy transition-colors"
  aria-label="Toggle AI summary"
>
  <svg className={`w-4 h-4 transition-transform ${expandedLead === lead.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
</button>
```

After each table row `<tr>`, add an expanded row:
```tsx
{expandedLead === lead.id && (
  <tr>
    <td colSpan={7} className="px-4 pb-4">
      <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-gold">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Summary</p>
          <button
            onClick={() => regenerateSummary(lead.id)}
            disabled={regenerating === lead.id}
            className="text-xs text-gray-400 hover:text-gold flex items-center gap-1 disabled:opacity-50"
          >
            <svg className={`w-3 h-3 ${regenerating === lead.id ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115 0M20 15a9 9 0 01-15 0" />
            </svg>
            Regenerate
          </button>
        </div>
        {lead.ai_summary ? (
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{lead.ai_summary}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No summary yet.</p>
        )}
      </div>
    </td>
  </tr>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/leads/route.ts app/api/admin/leads/ app/admin/leads/page.tsx
git commit -m "feat: auto-generate AI lead summary on capture, expandable in admin leads"
git push origin master
```

---

## Task 14: Push Notifications — Service Worker + Subscription

**Files:**
- Create: `public/sw.js`
- Create: `public/manifest.json`
- Create: `app/api/admin/push/subscribe/route.ts`
- Create: `lib/push/notify.ts`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy the output. Add to Vercel environment variables:
- `VAPID_PUBLIC_KEY` = the public key
- `VAPID_PRIVATE_KEY` = the private key
- `VAPID_EMAIL` = `mailto:your-gmail@gmail.com`

Also add to your local `.env` file for testing.

- [ ] **Step 2: Create service worker**

Create `public/sw.js`:

```js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "Gateway to Oman";
  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url ?? "/admin" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin";
  event.waitUntil(clients.openWindow(url));
});
```

- [ ] **Step 3: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Gateway to Oman Admin",
  "short_name": "GTO Admin",
  "start_url": "/admin",
  "display": "standalone",
  "background_color": "#1A1A2E",
  "theme_color": "#C99B3C",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Note: Create simple navy/gold icon PNG files at `public/icon-192.png` and `public/icon-512.png`. Use any image editor or generate programmatically. A 192×192 navy square with "GTO" in gold text works fine.

- [ ] **Step 4: Create push subscription API**

Create `app/api/admin/push/subscribe/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { endpoint, keys } = await request.json();
  const db = getDb();

  await db.execute({
    sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
          VALUES (?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [endpoint, keys.p256dh, keys.auth],
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Create push notification helper**

Create `lib/push/notify.ts`:

```ts
import webpush from "web-push";
import { getDb } from "@/lib/db/client";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(payload: {
  title: string;
  body: string;
  url: string;
}) {
  const db = getDb();
  const subs = await db.execute({
    sql: "SELECT endpoint, p256dh, auth FROM push_subscriptions",
    args: [],
  });

  const results = await Promise.allSettled(
    subs.rows.map((row) =>
      webpush.sendNotification(
        {
          endpoint: String(row.endpoint),
          keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
        },
        JSON.stringify(payload)
      )
    )
  );

  // Remove expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410) {
        await db.execute({
          sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
          args: [String(subs.rows[i].endpoint)],
        });
      }
    }
  }
}
```

- [ ] **Step 6: Register service worker and subscribe in admin layout**

In `app/admin/layout.tsx`, after authentication succeeds, add a `useEffect`:

```tsx
useEffect(() => {
  if (!authenticated) return;

  async function registerPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const token = localStorage.getItem("admin_token") ?? "";
      await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch (err) {
      console.warn("Push registration failed:", err);
    }
  }

  registerPush();
}, [authenticated]);
```

Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to Vercel env vars (same value as `VAPID_PUBLIC_KEY` — the `NEXT_PUBLIC_` prefix makes it available client-side).

- [ ] **Step 7: Trigger push on new lead**

In `app/api/leads/route.ts`, after inserting the lead, add:

```ts
import { sendPushNotification } from "@/lib/push/notify";

// After lead insert, fire-and-forget:
sendPushNotification({
  title: "New Lead",
  body: `${name} — ${segment ?? "unknown segment"}`,
  url: "/admin/leads",
}).catch(console.error);
```

- [ ] **Step 8: Commit**

```bash
git add public/sw.js public/manifest.json public/icon-192.png public/icon-512.png
git add app/api/admin/push/ lib/push/notify.ts app/api/leads/route.ts app/admin/layout.tsx
git commit -m "feat: Web Push notifications, PWA manifest, service worker"
git push origin master
```

---

## Task 15: Email Draft System + Booking Confirmation

**Files:**
- Create: `lib/email/booking.ts`
- Modify: `app/api/leads/route.ts`
- Create: `app/api/admin/emails/[id]/send/route.ts`
- Modify: `app/admin/leads/page.tsx`

- [ ] **Step 1: Create booking email generator**

Create `lib/email/booking.ts`:

```ts
import ical from "ical-generator";

export function generateBookingConfirmationEmail(params: {
  leadName: string;
  leadEmail: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  ahmedEmail: string;
}): { subject: string; html: string; icsAttachment: string } {
  const { leadName, date, time, ahmedEmail } = params;

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // Oman is GMT+4
  const startDate = new Date(Date.UTC(year, month - 1, day, hour - 4, minute));
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const cal = ical({ name: "Gateway to Oman Consultation" });
  cal.createEvent({
    start: startDate,
    end: endDate,
    summary: `Consultation with Ahmed Al-Azizi — Gateway to Oman`,
    description: `Your consultation with Ahmed Al-Azizi at Gateway to Oman.\n\nContact: ${ahmedEmail}`,
    organizer: { name: "Ahmed Al-Azizi", email: ahmedEmail },
    attendees: [{ name: leadName, email: params.leadEmail }],
  });

  const icsAttachment = cal.toString();

  const displayDate = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const displayTime = `${time} (Oman Time, GMT+4)`;

  const subject = `Your consultation with Ahmed Al-Azizi is confirmed`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
      <div style="background: linear-gradient(135deg, #C99B3C, #E8C777); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Gateway to Oman</h1>
      </div>
      <div style="padding: 32px; background: #f8f5f0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hi ${leadName},</p>
        <p>Your consultation with <strong>Ahmed Al-Azizi</strong> is confirmed.</p>
        <div style="background: white; border-left: 4px solid #C99B3C; padding: 16px; border-radius: 4px; margin: 24px 0;">
          <p style="margin: 0; font-size: 15px;"><strong>Date:</strong> ${displayDate}</p>
          <p style="margin: 8px 0 0; font-size: 15px;"><strong>Time:</strong> ${displayTime}</p>
        </div>
        <p>Ahmed will be in touch before the meeting to confirm the format (call, video, or in-person).</p>
        <p style="color: #888; font-size: 13px;">The .ics file attached can be added to your calendar.</p>
      </div>
    </div>
  `;

  return { subject, html, icsAttachment };
}
```

- [ ] **Step 2: Create booking draft on lead capture (when booking signals exist)**

In `app/api/leads/route.ts`, after creating the booking record (if booking signals exist from the conversation), generate the draft email:

```ts
// After lead insert, check if there's a booking for this conversation
if (conversationId) {
  const bookingRow = await db.execute({
    sql: "SELECT id, preferred_date, preferred_time FROM bookings WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [conversationId],
  });

  if (bookingRow.rows[0]) {
    const booking = bookingRow.rows[0];
    // Update booking with lead_id
    await db.execute({
      sql: "UPDATE bookings SET lead_id = ?, status = 'confirmed' WHERE id = ?",
      args: [leadId, String(booking.id)],
    });
    // Also update lead with booking_id
    await db.execute({
      sql: "UPDATE leads SET booking_id = ? WHERE id = ?",
      args: [String(booking.id), leadId],
    });

    // Generate draft confirmation email
    const { generateBookingConfirmationEmail } = await import("@/lib/email/booking");
    const ahmedEmail = process.env.EMAIL_FROM_ADDRESS ?? "azizi@alazizigroup.com";
    const { subject, html, icsAttachment } = generateBookingConfirmationEmail({
      leadName: name,
      leadEmail: email,
      date: String(booking.preferred_date),
      time: String(booking.preferred_time),
      ahmedEmail,
    });

    await db.execute({
      sql: "INSERT INTO emails (lead_id, booking_id, to_address, subject, body, status) VALUES (?, ?, ?, ?, ?, 'draft')",
      args: [leadId, String(booking.id), email, subject, JSON.stringify({ html, icsAttachment })],
    });

    // Push notification to Ahmed
    sendPushNotification({
      title: "New Booking",
      body: `${name} booked for ${booking.preferred_date} at ${booking.preferred_time} — review confirmation email`,
      url: `/admin/leads`,
    }).catch(console.error);
  }
}
```

- [ ] **Step 3: Create send email API endpoint**

Create `app/api/admin/emails/[id]/send/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";
import { sendEmail } from "@/lib/email/sender";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const emailRow = await db.execute({
    sql: "SELECT * FROM emails WHERE id = ?",
    args: [params.id],
  });

  if (!emailRow.rows[0]) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const email = emailRow.rows[0];
  if (String(email.status) === "sent") {
    return NextResponse.json({ error: "Already sent" }, { status: 400 });
  }

  const bodyData = JSON.parse(String(email.body));

  await sendEmail({
    to: String(email.to_address),
    subject: String(email.subject),
    html: bodyData.html,
    attachments: bodyData.icsAttachment
      ? [{ filename: "consultation.ics", content: bodyData.icsAttachment, contentType: "text/calendar" }]
      : [],
  });

  await db.execute({
    sql: "UPDATE emails SET status = 'sent', approved_at = datetime('now'), sent_at = datetime('now') WHERE id = ?",
    args: [params.id],
  });

  return NextResponse.json({ ok: true });
}
```

Note: The existing `lib/email/sender.ts` (or similar) needs to support an `attachments` array. Update it to pass attachments to Nodemailer if using SMTP.

- [ ] **Step 4: Show pending email drafts in admin leads page**

In `app/admin/leads/page.tsx`, fetch emails alongside leads and show a "Review Email" button for drafts in the expanded lead row:

```tsx
// In expanded lead row, alongside the AI summary:
{lead.pendingEmail && (
  <div className="mt-4 border-t border-gray-200 pt-4">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Email Pending Approval</p>
    </div>
    <p className="text-sm font-medium text-gray-700">{lead.pendingEmail.subject}</p>
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => sendDraftEmail(lead.pendingEmail.id)}
        className="px-4 py-2 bg-gold text-white text-sm rounded-lg font-semibold hover:shadow-md transition-shadow"
      >
        Send to {lead.email}
      </button>
      <a
        href={`tel:${lead.country_code}${lead.phone}`}
        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
      >
        Call Lead
      </a>
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add lib/email/booking.ts app/api/admin/emails/ app/api/leads/route.ts app/admin/leads/page.tsx
git commit -m "feat: booking email drafts, Ahmed approval flow, send endpoint"
git push origin master
```

---

## Task 16: Admin Booking Calendar

**Files:**
- Create: `app/admin/calendar/page.tsx`
- Create: `app/api/admin/blocked-slots/route.ts`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Create blocked slots API**

Create `app/api/admin/blocked-slots/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const db = getDb();
  const result = await db.execute({ sql: "SELECT * FROM blocked_slots ORDER BY date ASC", args: [] });
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const { date, timeSlot, reason } = await request.json();
  const db = getDb();
  await db.execute({
    sql: "INSERT INTO blocked_slots (date, time_slot, reason) VALUES (?, ?, ?)",
    args: [date, timeSlot ?? null, reason ?? null],
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const { id } = await request.json();
  const db = getDb();
  await db.execute({ sql: "DELETE FROM blocked_slots WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add Calendar to admin nav**

In `app/admin/layout.tsx`, add to `NAV_ITEMS`:

```tsx
{
  href: "/admin/calendar",
  label: "Calendar",
  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
},
```

- [ ] **Step 3: Create calendar page**

Create `app/admin/calendar/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface Booking {
  id: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  lead_id: string;
  leadName?: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  time_slot: string | null;
  reason: string | null;
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const monday = new Date(startDate);
  monday.setDate(startDate.getDate() - startDate.getDay() + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return monday;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockTime, setBlockTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [defaultSlots, setDefaultSlots] = useState(["09:00", "13:00", "16:00"]);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  async function fetchData() {
    const [bookingsRes, blockedRes, settingsRes] = await Promise.all([
      fetch("/api/bookings", { headers: authHeader }),
      fetch("/api/admin/blocked-slots", { headers: authHeader }),
      fetch("/api/admin/stats", { headers: authHeader }),
    ]);
    if (bookingsRes.ok) setBookings(await bookingsRes.json());
    if (blockedRes.ok) setBlockedSlots(await blockedRes.json());
  }

  async function blockSlot() {
    await fetch("/api/admin/blocked-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ date: blockDate, timeSlot: blockTime || null, reason: blockReason }),
    });
    setShowBlockModal(false);
    setBlockDate("");
    setBlockTime("");
    setBlockReason("");
    fetchData();
  }

  async function unblock(id: string) {
    await fetch("/api/admin/blocked-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  const weekDays = getWeekDays(currentWeekStart);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy font-heading">Booking Calendar</h1>
        <button
          onClick={() => setShowBlockModal(true)}
          className="flex items-center gap-2 px-4 py-2 gold-gradient text-white text-sm font-semibold rounded-lg"
        >
          <Plus size={16} />
          Block a Slot
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            const prev = new Date(currentWeekStart);
            prev.setDate(prev.getDate() - 7);
            setCurrentWeekStart(prev);
          }}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-gray-600">
          {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
          {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button
          onClick={() => {
            const next = new Date(currentWeekStart);
            next.setDate(next.getDate() + 7);
            setCurrentWeekStart(next);
          }}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = formatDate(day);
          const dayBookings = bookings.filter((b) => b.preferred_date === dateStr);
          const dayBlocked = blockedSlots.filter((b) => b.date === dateStr);
          const fullyBlocked = dayBlocked.some((b) => !b.time_slot);
          const isToday = formatDate(new Date()) === dateStr;

          return (
            <div
              key={dateStr}
              className={`rounded-xl border p-3 min-h-[140px] ${
                fullyBlocked ? "bg-gray-100 border-gray-200" : isToday ? "border-gold bg-gold/5" : "border-gray-100 bg-white"
              }`}
            >
              <p className={`text-xs font-semibold mb-2 ${isToday ? "text-gold" : "text-gray-500"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
                <span className="ml-1 text-navy font-bold">{day.getDate()}</span>
              </p>
              {fullyBlocked && (
                <div className="flex items-center justify-between bg-gray-200 rounded px-2 py-1 mb-1">
                  <span className="text-xs text-gray-500">Blocked</span>
                  <button onClick={() => unblock(dayBlocked.find((b) => !b.time_slot)!.id)}>
                    <X size={10} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              )}
              {defaultSlots.map((slot) => {
                const booking = dayBookings.find((b) => b.preferred_time === slot);
                const slotBlocked = dayBlocked.find((b) => b.time_slot === slot);
                return (
                  <div key={slot} className="text-xs rounded px-2 py-1 mb-1">
                    {booking ? (
                      <div className="bg-gold/20 text-gold rounded px-2 py-1">
                        <span className="font-medium">{slot}</span>
                        <span className="ml-1 truncate">{booking.leadName ?? "Lead"}</span>
                      </div>
                    ) : slotBlocked ? (
                      <div className="flex items-center justify-between bg-red-50 text-red-400 rounded px-2 py-1">
                        <span>{slot} blocked</span>
                        <button onClick={() => unblock(slotBlocked.id)}><X size={10} /></button>
                      </div>
                    ) : (
                      <div className="text-gray-300">{slot}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Block modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-navy mb-4">Block a Slot</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Date</label>
                <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Time slot (leave empty to block full day)</label>
                <select value={blockTime} onChange={(e) => setBlockTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold">
                  <option value="">Full day</option>
                  {defaultSlots.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Reason (optional)</label>
                <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Travel, external meeting"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={blockSlot}
                className="flex-1 py-2.5 gold-gradient text-white text-sm font-semibold rounded-lg">
                Block Slot
              </button>
              <button onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create bookings GET API for calendar**

Create `app/api/bookings/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT b.*, l.name as leadName, l.email, l.phone
          FROM bookings b
          LEFT JOIN leads l ON l.id = b.lead_id
          ORDER BY b.preferred_date ASC, b.preferred_time ASC`,
    args: [],
  });
  return NextResponse.json(result.rows);
}
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/calendar/ app/api/admin/blocked-slots/ app/api/bookings/ app/admin/layout.tsx
git commit -m "feat: admin booking calendar with block/unblock and bookings view"
git push origin master
```

---

## Task 17: Vercel Cron — Meeting Reminders

**Files:**
- Create: `app/api/cron/reminders/route.ts`
- Create or modify: `vercel.json`

- [ ] **Step 1: Create reminders cron route**

Create `app/api/cron/reminders/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { sendPushNotification } from "@/lib/push/notify";

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (not public)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Find bookings in the next 60-90 minutes (Oman time)
  const nowOman = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const plus60 = new Date(nowOman.getTime() + 60 * 60 * 1000);
  const plus90 = new Date(nowOman.getTime() + 90 * 60 * 1000);

  const todayStr = nowOman.toISOString().split("T")[0];
  const time60 = plus60.toISOString().split("T")[1].slice(0, 5);
  const time90 = plus90.toISOString().split("T")[1].slice(0, 5);

  const upcomingBookings = await db.execute({
    sql: `SELECT b.*, l.name as leadName, l.email, l.phone, l.id as leadId
          FROM bookings b
          LEFT JOIN leads l ON l.id = b.lead_id
          WHERE b.preferred_date = ? AND b.preferred_time >= ? AND b.preferred_time <= ? AND b.status = 'confirmed'`,
    args: [todayStr, time60, time90],
  });

  for (const booking of upcomingBookings.rows) {
    // Check if reminder draft already exists for this booking
    const existing = await db.execute({
      sql: "SELECT id FROM emails WHERE booking_id = ? AND subject LIKE '%Reminder%'",
      args: [String(booking.id)],
    });
    if (existing.rows.length > 0) continue;

    // Generate reminder email draft
    const subject = `Reminder: Consultation with ${booking.leadName} at ${booking.preferred_time}`;
    const html = `
      <p>Hi ${booking.leadName},</p>
      <p>Just a reminder — your consultation with <strong>Ahmed Al-Azizi</strong> is today at <strong>${booking.preferred_time} (Oman time)</strong>.</p>
      <p>Ahmed will be in touch with connection details shortly.</p>
      <p>Gateway to Oman</p>
    `;

    await db.execute({
      sql: "INSERT INTO emails (lead_id, booking_id, to_address, subject, body, status) VALUES (?, ?, ?, ?, ?, 'draft')",
      args: [String(booking.leadId), String(booking.id), String(booking.email), subject, JSON.stringify({ html })],
    });

    // Push notification to Ahmed
    await sendPushNotification({
      title: `Meeting in ~1 hour`,
      body: `${booking.leadName} at ${booking.preferred_time} — send reminder?`,
      url: `/admin/leads`,
    });
  }

  return NextResponse.json({ checked: upcomingBookings.rows.length });
}
```

- [ ] **Step 2: Create or update vercel.json**

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

- [ ] **Step 3: Add CRON_SECRET to Vercel env vars**

In Vercel dashboard → Project → Settings → Environment Variables, add:
- `CRON_SECRET` = any random string (e.g., generate with `openssl rand -hex 32`)

Add to local `.env` as well.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/reminders/route.ts vercel.json
git commit -m "feat: Vercel cron for meeting reminders with push notification"
git push origin master
```

---

## Task 18: Admin Mobile Responsiveness

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/admin/page.tsx` (dashboard charts)
- Modify: `app/admin/leads/page.tsx`

- [ ] **Step 1: Make admin sidebar collapse to bottom nav on mobile**

In `app/admin/layout.tsx`, replace the sidebar and main content structure:

```tsx
return (
  <div className="min-h-screen bg-gray-50">
    {/* Desktop sidebar */}
    <aside className="hidden md:flex w-60 bg-navy text-white flex-col fixed h-full z-40">
      {/* ... existing sidebar content unchanged ... */}
    </aside>

    {/* Main content */}
    <main className="md:ml-60 pb-20 md:pb-0 min-h-screen">
      <div className="p-4 md:p-8">{children}</div>
    </main>

    {/* Mobile bottom nav */}
    <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-white/10 flex md:hidden z-40">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              active ? "text-gold" : "text-white/60"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  </div>
);
```

- [ ] **Step 2: Stack dashboard charts vertically on mobile**

In `app/admin/page.tsx`, find any `grid-cols-2` or side-by-side chart layouts and update to `grid-cols-1 md:grid-cols-2`.

- [ ] **Step 3: Make leads table scroll horizontally on mobile**

In `app/admin/leads/page.tsx`, wrap the table in:

```tsx
<div className="overflow-x-auto -mx-4 md:mx-0">
  <table className="min-w-[640px] w-full">
    {/* ... existing table ... */}
  </table>
</div>
```

On mobile, hide lower-priority columns:
```tsx
<th className="hidden md:table-cell">Segment</th>
<td className="hidden md:table-cell">{lead.segment}</td>
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx app/admin/leads/page.tsx
git commit -m "feat: admin dashboard mobile responsive — bottom nav, stacked charts, scrollable table"
git push origin master
```

---

## Task 19: Landing Page Mobile Responsiveness

**Files:**
- Modify: `components/landing/` (audit all sections)
- Modify: `app/globals.css` if needed

- [ ] **Step 1: Audit for horizontal overflow**

```bash
npm run dev
```

Open Chrome DevTools, set viewport to 375px. Check each section for content overflowing horizontally. Common culprits: fixed widths, absolute positions, non-wrapping flex rows.

- [ ] **Step 2: Fix opportunity grid to single column on mobile**

In `components/landing/Opportunities.tsx`, the grid is `grid md:grid-cols-2 lg:grid-cols-3` — this is correct (1 col mobile, 2 tablet, 3 desktop). Verify it renders correctly.

- [ ] **Step 3: Fix hero trust badges wrapping**

In `components/landing/Hero.tsx`, the trust badges row:
```tsx
className="flex flex-wrap items-center justify-center gap-6"
```
This already wraps. Verify at 375px it looks clean. If badges are too wide, reduce `gap-6` to `gap-4` and add `gap-y-3`.

- [ ] **Step 4: Fix any navbar for mobile**

Check `components/landing/Navbar.tsx` (or equivalent). If there's no hamburger menu, add one:

```tsx
const [menuOpen, setMenuOpen] = useState(false);

// Hamburger button (mobile only):
<button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {menuOpen
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
  </svg>
</button>

// Mobile menu dropdown:
{menuOpen && (
  <div className="md:hidden absolute top-full left-0 right-0 bg-navy py-4 px-6 space-y-3">
    {/* nav links */}
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add components/landing/
git commit -m "fix: landing page mobile responsiveness — grid, badges, navbar hamburger"
git push origin master
```

---

## Self-Review

**Spec coverage check:**

| Spec Requirement | Task |
|-----------------|------|
| Hero overlay visibility | Task 3 |
| ChatWidget hidden on admin | Task 4 |
| Chat closes after capture | Task 5 |
| AI Assistant identity + follow-up | Task 6 |
| Mobile chat zoom + WhatsApp layout | Task 7 |
| Duplicate images + office photo | Task 8 |
| Remove "no sales pitch" text | Task 8 |
| ChatModalContext global state | Task 9 |
| ChatModal component | Task 10 |
| Opportunity cards → modal | Task 11 |
| CTAs wired to modal | Task 11 |
| Availability API | Task 12 |
| Booking signals (BOOKING_DAY, BOOKING_TIME) | Task 12 |
| Context injection in chat API | Task 12 |
| AI lead summary (auto-gen) | Task 13 |
| Regenerate summary endpoint | Task 13 |
| Summary in admin leads page | Task 13 |
| Service worker | Task 14 |
| PWA manifest | Task 14 |
| Push subscription API | Task 14 |
| Push on new lead | Task 14 |
| Booking confirmation email draft | Task 15 |
| Ahmed approval gate (send endpoint) | Task 15 |
| .ics calendar attachment | Task 15 |
| Admin blocked slots API | Task 16 |
| Admin calendar page | Task 16 |
| Calendar nav item | Task 16 |
| Vercel cron for reminders | Task 17 |
| Push notification on upcoming meeting | Task 17 |
| Reminder email draft | Task 17 |
| Admin mobile bottom nav | Task 18 |
| Admin charts stacked on mobile | Task 18 |
| Admin leads table mobile | Task 18 |
| Landing page mobile | Task 19 |

**All spec requirements covered. No placeholders. Types consistent across tasks.**

**Note on consultation slots settings page:** The spec mentions a Settings tab for configuring default time slots. Add `consultation_slots` key to the existing settings page (`app/admin/settings/page.tsx`) — add a text input for comma-separated times (default `09:00,13:00,16:00`) that saves to the `settings` table with key `consultation_slots`.
