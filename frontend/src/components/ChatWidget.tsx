"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle, RotateCcw } from "lucide-react";
import api from "@/services/api";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

const PRE_QUESTIONS = [
  { text: "Who is on leave today?", icon: "🌴" },
  { text: "What is my leave status & balance?", icon: "📊" },
  { text: "Who are the team leads?", icon: "💼" },
  { text: "When is our next company holiday?", icon: "🎉" },
  { text: "What projects am I working on?", icon: "📁" },
];

/**
 * Lightweight inline markdown parser for bot messages.
 * Formats [links](/path), **bold**, `code`, and bullet lists into interactive UI elements.
 */
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  const parseInline = (lineText: string) => {
    // Matches [Label](url), **bold**, `code`
    const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = lineText.split(tokenRegex);

    return parts.map((part, idx) => {
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          const [, label, url] = match;
          return (
            <Link
              key={idx}
              href={url}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors mx-0.5"
            >
              {label}
            </Link>
          );
        }
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 text-amber-300 text-xs font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || /^\d+\.\s/.test(trimmed);

        if (isBullet) {
          const cleaned = trimmed.replace(/^([-•]|\d+\.)\s*/, "");
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="text-amber-400 font-bold select-none">•</span>
              <span className="flex-1">{parseInline(cleaned)}</span>
            </div>
          );
        }

        return <p key={lineIdx}>{parseInline(line)}</p>;
      })}
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am your AI Portal Assistant. Ask me anything about leaves, project teams, department leads, holidays, or portal navigation!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isLoading]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Hello! I am your AI Portal Assistant. Ask me anything about leaves, project teams, department leads, holidays, or portal navigation!",
        timestamp: new Date(),
      },
    ]);
    setErrorMsg("");
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    // Extract recent history (exclude welcome greeting, last 8 messages)
    const historyPayload = messages
      .filter((msg) => msg.id !== "welcome")
      .slice(-8)
      .map((msg) => ({
        sender: msg.sender,
        text: msg.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await api.post("/chat", {
        message: text.trim(),
        history: historyPayload,
      });

      const replyText = res.data?.reply || "I didn't receive a response. Please try again.";
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      console.error("Chat error:", e?.response?.data ?? e?.message ?? e);
      const backendMsg = e.response?.data?.message || e.response?.data?.error;
      const httpStatus = e.response?.status;
      setErrorMsg(
        backendMsg
          ? `Error (${httpStatus}): ${backendMsg}`
          : "Could not connect to the AI assistant. Please try again in a moment."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Portal AI Assistant"
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer ${
          isOpen
            ? "bg-rose-600 hover:bg-rose-500 text-white rotate-90"
            : "bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 shadow-amber-500/25 hover:shadow-amber-400/40 hover:shadow-xl"
        }`}
        title="Portal AI Assistant"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Chat Popover Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col w-[calc(100vw-32px)] sm:w-[420px] h-[530px] max-h-[calc(100vh-120px)] border border-white/10 bg-slate-950/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-400 border border-amber-400/20">
                <Bot className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Portal Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Powered by Gemini AI • Live Data</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Clear conversation"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages & Suggestions scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-400/10 text-amber-400 shrink-0 select-none mt-0.5 border border-amber-400/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-medium rounded-tr-none shadow-md"
                      : "bg-white/5 border border-white/10 text-slate-100 rounded-tl-none"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <FormattedMessage text={msg.text} />
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Suggestions segment (shown only after bot replies and not loading) */}
            {!isLoading && messages[messages.length - 1]?.sender === "bot" && (
              <div className="pt-2 pl-9 space-y-2">
                <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q.text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all active:scale-95 text-left cursor-pointer"
                    >
                      <span>{q.icon}</span>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-400/10 text-amber-400 shrink-0 border border-amber-400/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"></span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs items-start">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Bottom input area */}
          <div className="p-3.5 border-t border-white/10 bg-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputValue);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about leaves, projects, leads..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:hover:bg-amber-400 select-none active:scale-95 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
