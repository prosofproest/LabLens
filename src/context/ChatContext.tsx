"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { auth } from "@/lib/firebase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      setError(null);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      // Limit history to last 5 messages plus new user message (total 6)
      const currentHistory = messages.slice(-5);
      const updatedMessages = [...currentHistory, userMessage];

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // If user is authenticated, attach verified Firebase token
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const currentUser = auth.currentUser;
        if (currentUser) {
          const idToken = await currentUser.getIdToken();
          headers.Authorization = `Bearer ${idToken}`;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to receive response from AI assistant.");
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "The LabLens AI assistant is temporarily unavailable. Please try again later.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const value = useMemo(
    () => ({
      messages,
      isOpen,
      isLoading,
      error,
      setIsOpen,
      toggleOpen,
      sendMessage,
      clearChat,
    }),
    [messages, isOpen, isLoading, error, toggleOpen, sendMessage, clearChat]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
