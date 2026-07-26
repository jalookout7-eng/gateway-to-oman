"use client";

import { motion } from "framer-motion";
import { forwardRef } from "react";
import { parseInline } from "@/lib/chat/markdown";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Renders parsed markdown nodes as React elements. Never dangerouslySetInnerHTML:
 * the parser returns typed data, this just maps it to elements, and anything the
 * parser didn't recognise already arrived here as a plain "text" node.
 */
function renderMarkdown(content: string) {
  return parseInline(content).map((node, i) => {
    switch (node.type) {
      case "bold":
        return <strong key={i}>{node.value}</strong>;
      case "italic":
        return <em key={i}>{node.value}</em>;
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {node.value}
          </a>
        );
      case "break":
        return <br key={i} />;
      case "text":
      default:
        return <span key={i}>{node.value}</span>;
    }
  });
}

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
}

/**
 * Scrollable message list. Exposes a ref via forwardRef that points at a
 * sentinel `<div>` AT THE BOTTOM of the internal scroll container — the
 * parent (ChatWidget) calls `ref.current.scrollIntoView()` on this sentinel
 * to lock the view to the latest message after every exchange. Previously
 * the sentinel was rendered as a sibling OUTSIDE the scroll container, so
 * scrollIntoView() never actually scrolled the message list (Notes 4 chat
 * scroll bug — root cause).
 */
export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  function ChatMessages({ messages, isTyping }, endRef) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gold text-white rounded-br-sm"
                  : "bg-warm-cream text-gray-800 rounded-bl-sm"
              }`}
            >
              {renderMarkdown(msg.content)}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-warm-cream rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-gold/60"
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Scroll sentinel — parent uses this to keep the latest message in
            view across every exchange and when an inline form appears. */}
        <div ref={endRef} aria-hidden="true" />
      </div>
    );
  },
);
