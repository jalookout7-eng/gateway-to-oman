"use client";

import { motion } from "framer-motion";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
}

export function ChatMessages({ messages, isTyping }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
            {msg.content}
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
    </div>
  );
}
