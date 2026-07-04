"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { getContextualGreeting, pickTeaserVariant } from "@/lib/ai/prompts";
import { resolveSurface } from "@/lib/ai/surface";
import { useChatModal, type ChatModalConfig } from "@/lib/context/ChatModalContext";
import { WhatsAppHandoffButton } from "./WhatsAppHandoffButton";
import { trackEvent } from "@/lib/analytics/track";
import { MessageCircle, CalendarDays, MessageSquare } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/alazizi/30min";
const KEEP_CHAT_MAX_EXCHANGES = 7;

/**
 * Topic-aware greetings used when the visitor opens the chat by clicking
 * a card on the landing page (Notes 4). Previously these lived on the
 * retired ChatModal component; they're now hoisted here so the single
 * unified ChatWidget surface can deliver the same tailored opening line
 * AND continue with persistent state (lead capture, keep-chat, HOT-lead
 * CTAs). Anything not in this map falls back to the surface-default
 * greeting from `getContextualGreeting()`.
 */
const TOPIC_GREETINGS: Record<string, string> = {
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

function greetingFor(config: ChatModalConfig | null, fallback: string): string {
  if (!config) return fallback;
  if (config.topic && TOPIC_GREETINGS[config.topic]) return TOPIC_GREETINGS[config.topic];
  if (config.intent === "consultation") return TOPIC_GREETINGS.consultation;
  return fallback;
}

/**
 * ChatWidget — the floating Omar chat surface.
 *
 * State machine (post-redesign, notes 5+6+14):
 *
 *   1. Visitor chats normally (exchanges 1-5).
 *   2. When Omar emits [CAPTURE_READY] (or exchange 5 ceiling is hit), we
 *      DO NOT auto-pop the lead form anymore. Instead we render an in-chat
 *      "Share your details?" prompt with [Yes, share] / [Not yet] buttons.
 *      This addresses note #14: no surprise modal.
 *   3. [Yes, share] → renders LeadCaptureForm.
 *      [Not yet] → conversation continues; prompt won't re-show this session
 *      until the next [CAPTURE_READY] (so Omar doesn't badger).
 *   4. After form submit, we render a "Continue chatting?" prompt
 *      ([Keep chatting] / [Close]). Addresses notes #5+6.
 *   5. [Keep chatting] → enables keep-chat mode (capped at
 *      KEEP_CHAT_MAX_EXCHANGES additional exchanges). Logs to lead_notes
 *      via /api/chat/event.
 *   6. During keep-chat, if Omar emits [HIGH_INTENT] (HOT lead), we render
 *      inline [Book consultation] + [WhatsApp Ahmed] CTAs. Button clicks
 *      log to lead_notes via /api/chat/event.
 *   7. Keep-chat ends naturally at the exchange cap or [CLOSE_CHAT]; we log
 *      a closing note with the exchange count.
 */
export function ChatWidget() {
  const pathname = usePathname();
  // Subscribe to the global ChatModalContext so opportunity-card clicks (and
  // any other openModal({intent, topic}) caller) route into THIS widget
  // rather than the retired ChatModal component. Notes 4: visitors should
  // see the new persistent Omar surface, not the older "AI Assistant"
  // pop-up — and the topic they clicked should flow through to Omar's
  // system prompt as [CONTEXT: ...] so he opens with the right question.
  const { isOpen: modalIsOpen, config: modalConfig, closeModal } = useChatModal();

  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [detectedSegment, setDetectedSegment] = useState<string | null>(null);
  const [detectedInterest, setDetectedInterest] = useState<string | null>(null);
  // Topic/intent context the visitor brought in via openModal(). Persisted
  // across messages so every /api/chat call keeps the [CONTEXT: ...]
  // injection in Omar's system prompt.
  const [chatContext, setChatContext] = useState<ChatModalConfig | null>(null);

  // New state machine pieces — see header comment.
  const [showCapturePrompt, setShowCapturePrompt] = useState(false);
  const [captureDeferred, setCaptureDeferred] = useState(false); // visitor said "Not yet"
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [showPostCaptureChoice, setShowPostCaptureChoice] = useState(false);
  const [keepChatActive, setKeepChatActive] = useState(false);
  const [keepChatExchanges, setKeepChatExchanges] = useState(0);
  const [showHotLeadCtas, setShowHotLeadCtas] = useState(false);

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

  useEffect(() => {
    if (isOpen) setShowTeaser(false);
  }, [isOpen]);

  // Keep the most recent message in view AFTER every exchange and whenever
  // an inline form panel appears below the messages (Notes 4 chat scroll
  // bug). The previous deps array missed the form-flag flips, so after Omar
  // replied the user had to manually scroll. Now: any change to messages,
  // typing state, OR an inline form re-runs scroll-to-bottom on the sentinel
  // INSIDE the message-list scroll container.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [
    messages,
    isTyping,
    showCapturePrompt,
    showCaptureForm,
    showPostCaptureChoice,
    showHotLeadCtas,
  ]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    trackEvent("chat_opened", {
      surface: resolveSurface(pathname ?? "/").page,
      hook_variant: teaserVariant.variantId,
    });
    if (messages.length === 0) {
      const greeting = getContextualGreeting(resolveSurface(pathname ?? "/").page);
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [messages.length, pathname, teaserVariant.variantId]);

  // Bridge from the ChatModalContext: when an opportunity card (or any other
  // caller) fires openModal({intent, topic}), open this floating widget with
  // a topic-aware greeting and remember the context so subsequent /api/chat
  // calls keep [CONTEXT: ...] in the system prompt. Notes 4 — retires the
  // old centered "AI Assistant" modal in favour of the persistent Omar
  // surface. Re-opening with a different topic refreshes the context but
  // preserves the conversation history.
  useEffect(() => {
    if (!modalIsOpen || !modalConfig) return;
    setChatContext(modalConfig);
    setIsOpen(true);
    setIsClosed(false);
    trackEvent("chat_opened", {
      surface: resolveSurface(pathname ?? "/").page,
      source: "opportunity_card",
      topic: modalConfig.topic,
    });
    if (messages.length === 0) {
      const fallback = getContextualGreeting(resolveSurface(pathname ?? "/").page);
      setMessages([{ role: "assistant", content: greetingFor(modalConfig, fallback) }]);
    }
    // Single-shot consumption: clear the context-side state so closing the
    // widget doesn't immediately re-open it on the next render pass.
    closeModal();
  }, [modalIsOpen, modalConfig, messages.length, pathname, closeModal]);

  // Fire-and-forget event logger to the lead_notes timeline. Failures are
  // silenced — the visitor doesn't need to know if the bookkeeping write
  // didn't land, and there's no UI action to retry.
  const logEvent = useCallback(
    (event: string, metadata?: Record<string, unknown>) => {
      fetch("/api/chat/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, event, metadata: metadata ?? {} }),
      }).catch(() => {});
    },
    [sessionId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (isClosed || isTyping) return;

      const userMessage: Message = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      trackEvent("chat_message_sent", {
        surface: resolveSurface(pathname ?? "/").page,
        exchange: exchangeCount + 1,
      });

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
            // Notes 4: opportunity-card context flows through so Omar sees
            // [CONTEXT: visitor clicked '<topic>' ...] in his system prompt.
            // Null when the visitor opened Omar via the floating button.
            context: chatContext ?? undefined,
            // Notes 5: tells the server-side prompt assembler the visitor
            // has already given us the form. Omar then sees [LEAD CAPTURED]
            // and will not re-ask for name/email/phone. The server also
            // cross-checks the DB so a stale flag (e.g. page refresh) is
            // restored automatically.
            leadCaptured,
          }),
        });

        const data = await res.json().catch(() => null);

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

        if (data.signals?.segment) setDetectedSegment(data.signals.segment);
        if (data.signals?.interest) setDetectedInterest(data.signals.interest);

        // Capture-ready handling. Pre-redesign this auto-opened the form.
        // Now: surface the opt-in prompt. Once the visitor has chosen
        // "Not yet" we don't badger them again on this signal — they'll
        // eventually hit the exchange-5 hard ceiling.
        if (
          data.signals?.captureReady &&
          !leadCaptured &&
          !showCapturePrompt &&
          !showCaptureForm &&
          !captureDeferred
        ) {
          setShowCapturePrompt(true);
        }

        // HOT-lead inline CTAs — only meaningful AFTER capture (visitor's
        // already shared contact details). Before capture, [HIGH_INTENT]
        // is still recorded server-side but we don't show buttons.
        if (data.signals?.highIntent && leadCaptured && keepChatActive) {
          setShowHotLeadCtas(true);
        }

        if (data.signals?.closeChat) {
          if (keepChatActive) {
            logEvent("keep_chat_ended", {
              exchanges: keepChatExchanges,
              reason: "closed_by_omar",
            });
          }
          setIsClosed(true);
          setTimeout(() => setIsOpen(false), 3000);
        }

        // Keep-chat exchange-counter + cap enforcement.
        if (keepChatActive) {
          const nextKeepChatExchanges = keepChatExchanges + 1;
          setKeepChatExchanges(nextKeepChatExchanges);
          if (nextKeepChatExchanges >= KEEP_CHAT_MAX_EXCHANGES) {
            logEvent("keep_chat_ended", {
              exchanges: nextKeepChatExchanges,
              reason: "ended",
            });
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  "I'll stop here so the team gets your details fresh. They'll be in touch shortly — and you can WhatsApp Ahmed any time via the green button.",
              },
            ]);
            setIsClosed(true);
          }
        }

        // Hard ceiling: surface the opt-in prompt at exchange 7 (was 5).
        // Gives Omar room to deliver a graceful conclusion before the prompt
        // appears — see the [CAPTURE_READY] wrap-up directive in BASE_PROMPT.
        if (
          newExchangeCount >= 7 &&
          !leadCaptured &&
          !showCapturePrompt &&
          !showCaptureForm &&
          !captureDeferred
        ) {
          setShowCapturePrompt(true);
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
      showCapturePrompt,
      showCaptureForm,
      captureDeferred,
      keepChatActive,
      keepChatExchanges,
      pathname,
      teaserVariant.variantId,
      chatContext,
      leadCaptured,
      logEvent,
    ],
  );

  const handleCaptureDecision = useCallback(
    (accepted: boolean) => {
      setShowCapturePrompt(false);
      if (accepted) {
        setShowCaptureForm(true);
      } else {
        setCaptureDeferred(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "No problem — keep going. Let me know whenever you're ready to share your details and I'll loop the team in.",
          },
        ]);
      }
    },
    [],
  );

  const handleLeadSubmit = useCallback(() => {
    setLeadCaptured(true);
    setShowCaptureForm(false);
    trackEvent("lead_submit", {
      surface: resolveSurface(pathname ?? "/").page,
      hook_variant: teaserVariant.variantId,
    });
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Got it — the team will follow up with you shortly. Want to keep chatting in the meantime?",
      },
    ]);
    setShowPostCaptureChoice(true);
  }, [pathname, teaserVariant.variantId]);

  const handlePostCaptureDecision = useCallback(
    (keepChatting: boolean) => {
      setShowPostCaptureChoice(false);
      if (keepChatting) {
        setKeepChatActive(true);
        logEvent("keep_chat_started");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Great — I'm here. Anything else you want to dig into about Oman or this opportunity?",
          },
        ]);
      } else {
        setIsClosed(true);
        setTimeout(() => setIsOpen(false), 1500);
      }
    },
    [logEvent],
  );

  const handleWhatsAppClick = useCallback(() => {
    logEvent("whatsapp_click");
    trackEvent("whatsapp_click", { surface: "omar_chat", source: "hot_lead_cta" });
    window.open("https://wa.me/96895108257", "_blank", "noopener,noreferrer");
  }, [logEvent]);

  const handleCalendlyClick = useCallback(() => {
    logEvent("calendly_click");
    trackEvent("calendly_click", { surface: "omar_chat", source: "hot_lead_cta" });
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  }, [logEvent]);

  if (pathname?.startsWith("/admin")) return null;
  const AUTH_PATHS = ["/businesses/sign-in", "/businesses/access"];
  if (pathname && AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Floating Omar button — icon-only circle. Sits to the right of the
          WhatsApp button (which is mounted in app/layout.tsx). */}
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

      {/* Hook teaser bubble — anchored above the Omar button at 30% scroll. */}
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
                  <MessageCircle className="h-5 w-5 text-white" />
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

      {/* Chat window */}
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
                  <MessageCircle className="h-4 w-4 text-white" />
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

            {/* Messages — sentinel ref lives INSIDE this component's scroll
                container so scrollIntoView() actually scrolls the message
                list, not the page (Notes 4 chat scroll bug fix). */}
            <ChatMessages messages={messages} isTyping={isTyping} ref={messagesEndRef} />

            {/* Pre-capture opt-in prompt — replaces the surprise modal pattern. */}
            {showCapturePrompt && !leadCaptured && (
              <div className="mx-3 mb-2 rounded-lg border border-gold/30 bg-gold/5 p-3">
                <p className="text-sm text-navy">
                  Before we go further — can I share your details with the team so they can
                  follow up properly? It takes about 30 seconds.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleCaptureDecision(true)}
                    className="flex-1 gold-gradient text-white text-sm font-semibold py-2 rounded-lg hover:shadow-md transition-shadow"
                  >
                    Yes, share my details
                  </button>
                  <button
                    onClick={() => handleCaptureDecision(false)}
                    className="px-3 text-sm font-medium text-gray-600 hover:text-navy"
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}

            {/* Lead capture form — only when explicitly accepted. */}
            {showCaptureForm && !leadCaptured && conversationId && (
              <LeadCaptureForm
                conversationId={conversationId}
                segment={detectedSegment}
                interest={detectedInterest}
                onSubmit={handleLeadSubmit}
              />
            )}

            {/* Post-capture continue-or-close choice. */}
            {showPostCaptureChoice && (
              <div className="mx-3 mb-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePostCaptureDecision(true)}
                    className="flex-1 gold-gradient text-white text-sm font-semibold py-2 rounded-lg hover:shadow-md transition-shadow"
                  >
                    Keep chatting
                  </button>
                  <button
                    onClick={() => handlePostCaptureDecision(false)}
                    className="px-3 text-sm font-medium text-gray-600 hover:text-navy"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* HOT-lead inline CTAs — surfaced when Omar grades a keep-chat
                visitor as high-intent. Two clean buttons, each logs to
                lead_notes when clicked. */}
            {showHotLeadCtas && (
              <div className="mx-3 mb-2 rounded-lg border border-gold/40 bg-gradient-to-r from-gold/10 to-amber-50 p-3">
                <p className="text-sm text-navy font-medium">
                  Sounds like a strong fit. Want to take the next step?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCalendlyClick}
                    className="inline-flex items-center justify-center gap-1.5 gold-gradient text-white text-xs font-semibold py-2.5 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Book consultation
                  </button>
                  <button
                    onClick={handleWhatsAppClick}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp Ahmed
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp handoff from the chat reply itself (existing path). */}
            {whatsappUrl && <WhatsAppHandoffButton href={whatsappUrl} />}

            {/* Input — stays available except when chat is closed. */}
            {!isClosed && <ChatInput onSend={sendMessage} disabled={isTyping} />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
