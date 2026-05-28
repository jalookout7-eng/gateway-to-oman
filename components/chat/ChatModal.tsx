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
    "To make the most of a consultation with our team, I need to understand your situation first. What's the main thing you're trying to figure out — is it a business opportunity, investment, career move, or a lifestyle relocation?",
  "Businesses for Sale":
    "There's a wide range here from OMR 2,500 to 200,000. Are you looking at something small to get started, or are you positioned for a larger acquisition?",
  "Franchise Partnerships":
    "Franchise partnerships in Oman work differently than most markets. What's your background — have you operated a franchise before, or is this a first?",
  "Real Estate ITCs":
    "Real estate ITCs are one of the cleaner paths into Oman — you get property and a residency pathway. What's driving the interest, the investment return or the residency?",
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
      { role: "assistant", content: "Details received — our team will be in touch with you shortly." },
    ]);
    setTimeout(closeModal, 2000);
  }, [closeModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />

          <motion.div
            // Height fix (Notes 3 item 5): cap desktop height at the viewport
            // (minus a 2rem gutter) instead of a flat 600px. The previous
            // h-[600px] could extend past the bottom of a short viewport,
            // hiding the input form below the fold. min-h-0 isn't needed on
            // the wrapper itself; it's applied to the messages-scroll child
            // below so its flex-1 plays nicely with overflow-y-auto.
            className="fixed z-[70] bg-white flex flex-col overflow-hidden
              bottom-0 left-0 right-0 h-[90dvh] rounded-t-2xl
              sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-[480px] sm:h-[600px] sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:shadow-2xl"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
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

            {/* min-h-0 lets this flex child actually shrink so overflow-y-auto
                kicks in instead of pushing the input form out of the modal
                (Notes 3 item 5 — root cause of the missing-input bug on
                shorter viewports). */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ChatMessages messages={messages} isTyping={isTyping} />
              <div ref={messagesEndRef} />
            </div>

            {showCaptureForm && !leadCaptured && conversationId && (
              <LeadCaptureForm
                conversationId={conversationId}
                segment={detectedSegment}
                interest={detectedInterest}
                onSubmit={handleLeadSubmit}
              />
            )}

            {!leadCaptured && <ChatInput onSend={sendMessage} disabled={isTyping} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
