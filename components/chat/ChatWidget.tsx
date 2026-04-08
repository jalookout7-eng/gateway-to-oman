"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { BookingButton } from "./BookingButton";
import { getContextualGreeting } from "@/lib/ai/prompts";

export function ChatWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [detectedSegment, setDetectedSegment] = useState<string | null>(null);
  const [detectedInterest, setDetectedInterest] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoOpened = useRef(false);

  // Auto-open after 7 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasAutoOpened.current) {
        hasAutoOpened.current = true;
        setIsOpen(true);
        // Add initial greeting
        const greeting = getContextualGreeting();
        setMessages([{ role: "assistant", content: greeting }]);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (messages.length === 0) {
      const greeting = getContextualGreeting();
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [messages.length]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isClosed || isTyping) return;

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
          }),
        });

        const data = await res.json();

        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);

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
        content: "Details received — Ahmed will be in touch with you shortly.",
      },
    ]);
  }, []);

  const handleBookingClick = useCallback(() => {
    window.open("mailto:azizi@alazizigroup.com?subject=Priority%20Session%20Request", "_blank");
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed bottom-6 right-6 h-14 px-5 rounded-full gold-gradient shadow-lg shadow-gold/30 flex items-center gap-2.5 text-white z-50 hover:shadow-xl transition-all"
            onClick={handleOpen}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="flex-shrink-0"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-semibold tracking-wide whitespace-nowrap">
              AI Assistant
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (desktop only) */}
            <motion.div
              className="hidden sm:block fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
          <motion.div
            className="fixed z-50 bg-white flex flex-col overflow-hidden shadow-2xl
              bottom-0 left-0 right-0 h-[90dvh] rounded-t-2xl
              sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-[400px] sm:h-[560px] sm:rounded-2xl sm:border sm:border-gray-100"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="gold-gradient px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">
                  AI Assistant
                </p>
                <p className="text-white/80 text-xs">
                  Gateway to Oman
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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

            {/* Input */}
            {!isClosed && <ChatInput onSend={sendMessage} disabled={isTyping} />}
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
