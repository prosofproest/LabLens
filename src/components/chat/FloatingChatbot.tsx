"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useChat } from "@/context/ChatContext";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  AlertCircle,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const SUGGESTED_QUESTIONS = [
  "How do I report an overheating workstation?",
  "What should I do if a network switch drops link?",
  "What are standard lab electrical safety rules?",
  "How do technician dispatches work?",
];

export function FloatingChatbot() {
  const { messages, isOpen, isLoading, error, toggleOpen, setIsOpen, sendMessage, clearChat } =
    useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={toggleOpen}
          aria-label={isOpen ? "Close LabLens AI Assistant" : "Open LabLens AI Assistant"}
          aria-expanded={isOpen}
          className="w-14 h-14 rounded-full bg-[#0071E3] text-white shadow-xl hover:bg-[#0077ED] transition-all duration-200 flex items-center justify-center min-h-[44px] min-w-[44px] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/25 cursor-pointer active:scale-95"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <MessageSquare className="w-6 h-6 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="LabLens AI Assistant"
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] max-h-[80vh] rounded-3xl border border-[#E5E5EA] bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-[#FAFAFC] px-5 py-3.5 border-b border-[#E5E5EA] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-[#1D1D1F]">LabLens Assistant</h3>
                  <Badge variant="info" size="sm" className="text-[10px] py-0 px-1.5">
                    Groq AI
                  </Badge>
                </div>
                <p className="text-[11px] text-[#86868B]">Equipment Safety & Procedures</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation history"
                  className="min-h-[44px] min-w-[44px] p-2 text-[#86868B] hover:text-[#DC2626] rounded-xl hover:bg-white transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant panel"
                className="min-h-[44px] min-w-[44px] p-2 text-[#86868B] hover:text-[#1D1D1F] rounded-xl hover:bg-white transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-sm font-medium text-[#1D1D1F]">
                    Laboratory Equipment Help
                  </h4>
                  <p className="text-xs text-[#656565] leading-relaxed">
                    Ask questions about equipment malfunction symptoms, lab safety protocols, or reporting workflows.
                  </p>
                </div>

                {/* Suggested prompt chips */}
                <div className="w-full space-y-2 pt-2">
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
                    Suggested Questions
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="w-full text-left p-2.5 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] hover:bg-[#EBF5FF] hover:border-[#B9E1FF] text-[11px] text-[#1D1D1F] transition-colors min-h-[44px] flex items-center cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[#0071E3] text-white"
                        : "bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA]"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl px-4 py-3 flex items-center gap-2 text-[#86868B]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0071E3]" />
                  <span className="text-xs">Consulting Groq AI...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-[#FAFAFC] border-t border-[#E5E5EA] shrink-0">
            <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about lab faults or procedures..."
                disabled={isLoading}
                maxLength={1000}
                className="w-full min-h-[44px] max-h-24 pr-12 pl-3.5 py-2.5 text-xs text-[#1D1D1F] bg-white border border-[#E5E5EA] rounded-xl focus:border-[#0071E3] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/15 resize-none placeholder:text-[#86868B] disabled:bg-[#F5F5F7]"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label="Send message to assistant"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#0071E3] text-white flex items-center justify-center hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-[#86868B] text-center pt-1.5">
              Advisory AI guidance • Never attempt dangerous hardware repairs
            </p>
          </div>
        </div>
      )}
    </>
  );
}
