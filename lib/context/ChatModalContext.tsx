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
