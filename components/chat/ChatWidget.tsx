"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { BookingButton } from "./BookingButton";
import { getContextualGreeting, pickTeaserVariant } from "@/lib/ai/prompts";
import { resolveSurface } from "@/lib/ai/surface";
import { WhatsAppHandoffButton } from "./WhatsAppHandoffButton";
import { MessageCircle } from "lucide-react";

export function ChatWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [detectedSegment, setDetectedSegment] = useState<string | null>(null);
  const [detectedInterest, setDetectedInterest] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  // Pick a hook variant once per widget mount so the visitor sees a single
  // consistent teaser. Variant ID is sent with the first /api/chat call and
  // persisted to conversations.hook_variant_id for later A/B analysis.
  const [teaserVariant] = useState(() =>
    pickTeaserVariant(resolveSurface(pathname ?? "/").page),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredTeaser = useRef(false);

  // Scroll trigger — show the teaser bubble at 30% scroll depth
  useEffect(() => {
    function onScroll() {
      if (hasTriggeredTeaser.current) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = window.scrollY / scrollable;
      if (depth >= 0.3) {
        hasTriggeredTeaser.current = true;
        setShowTeaser(true);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide teaser when full chat opens
  useEffect(() => {
    if (isOpen) setShowTeaser(false);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (messages.length === 0) {
      const greeting = getContextualGreeting(resolveSurface(pathname ?? "/").page);
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [messages.length, pathname]);

  // pathname is captured in closure below via dependency
  const sendMessage = useCallback(
    async (text: string) => {
      if (isClosed || isTyping) return;

      const userMessage: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        const { surface } = resolveSurface(pathname ?? "/");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId,
            history: messages,
            source: surface,
            hookVariantId: teaserVariant.variantId,
          }),
        });

        const data = await res.json().catch(() => null);

        // Don't render an empty bubble on an API error / empty reply — fall back.
        if (!res.ok || !data?.message) {
          throw new Error("Empty or error response from chat API");
        }

        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (data.whatsappUrl) {
          setWhatsappUrl(data.whatsappUrl);
        }

        const newExchangeCount = exchangeCount + 1;
        setExchangeCount(newExchangeCount);

        // Handle signals
        if (data.signals?.segment) {
          setDetectedSegment(data.signals.segment);
        }
        if (data.signals?.interest) {
          setDetectedInterest(data.signals.interest);
        }

        if (data.signals?.captureReady && !leadCaptured) {
          setShowCaptureForm(true);
        }

        if (data.signals?.highIntent && leadCaptured) {
          setShowBooking(true);
        }

        if (data.signals?.closeChat) {
          setIsClosed(true);
          setTimeout(() => setIsOpen(false), 3000);
        }

        // Hard ceiling: force capture at exchange 5
        if (newExchangeCount >= 5 && !leadCaptured && !showCaptureForm) {
          setShowCaptureForm(true);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I apologize, I'm having trouble connecting. Please try again or reach out to us directly at azizi@alazizigroup.com.",
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [
      isClosed,
      isTyping,
      sessionId,
      messages,
      exchangeCount,
      leadCaptured,
      showCaptureForm,
      pathname,
      teaserVariant.variantId,
    ]
  );

  const handleLeadSubmit = useCallback(() => {
    setLeadCaptured(true);
    setShowCaptureForm(false);
    setIsClosed(true);
    setTimeout(() => setIsOpen(false), 2000);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Details received — our team will be in touch with you shortly.",
      },
    ]);
  }, []);

  const handleBookingClick = useCallback(() => {
    window.open("mailto:azizi@alazizigroup.com?subject=Priority%20Session%20Request", "_blank");
  }, []);

  if (pathname?.startsWith("/admin")) return null;
  // Stay quiet on auth-style pages — visitor is mid-flow, don't distract.
  const AUTH_PATHS = ["/businesses/sign-in", "/businesses/access"];
  if (pathname && AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Floating button — icon-only circle, sits to the right of the
          WhatsApp button (which is mounted in app/layout.tsx). The hook
          teaser bubble still anchors above this button as before. */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full gold-gradient shadow-lg shadow-gold/30 flex items-center justify-center text-white z-50 hover:shadow-xl transition-all"
            onClick={handleOpen}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            aria-label="Chat with Omar"
            title="Chat with Omar"
          >
            <MessageCircle className="h-6 w-6" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scroll-triggered teaser bubble — appears above the floating button at 30% scroll */}
      <AnimatePresence>
        {showTeaser && !teaserDismissed && !isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[320px] max-w-[calc(100vw-3rem)]
              rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <button
              onClick={() => setTeaserDismissed(true)}
              aria-label="Dismiss"
              className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="p-4 pr-9">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gold-gradient ring-2 ring-gold/20 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <p className="font-semibold text-navy text-sm">Omar</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Gateway to Oman
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                {teaserVariant.text}
              </p>

              <button
                onClick={handleOpen}
                className="mt-3 w-full gold-gradient text-white text-sm font-semibold py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                Chat with Omar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window — docked bottom-right on desktop, full bottom drawer on mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed z-50 bg-white flex flex-col overflow-hidden shadow-2xl
              inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl border-t border-gray-200
              sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto
              sm:w-[380px] sm:h-[600px] sm:max-h-[calc(100dvh-3rem)]
              sm:rounded-2xl sm:border sm:border-gray-200"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            {/* Header */}
            <div className="gold-gradient px-4 py-3.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-white font-semibold text-sm truncate">Omar</p>
                  <p className="text-white/85 text-xs flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Gateway to Oman
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="text-white/85 hover:text-white p-1.5 -m-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <ChatMessages messages={messages} isTyping={isTyping} />
            <div ref={messagesEndRef} />

            {/* Lead capture form */}
            {showCaptureForm && !leadCaptured && conversationId && (
              <LeadCaptureForm
                conversationId={conversationId}
                segment={detectedSegment}
                interest={detectedInterest}
                onSubmit={handleLeadSubmit}
              />
            )}

            {/* Booking button */}
            {showBooking && <BookingButton onClick={handleBookingClick} />}
            {whatsappUrl && <WhatsAppHandoffButton href={whatsappUrl} />}

            {/* Input */}
            {!isClosed && <ChatInput onSend={sendMessage} disabled={isTyping} />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
