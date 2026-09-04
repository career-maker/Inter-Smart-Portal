"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Send, Sparkles, AlertCircle, RotateCcw } from "lucide-react";
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
 * Formats [links](/path), **bold**, `code`, and bullet lists into high-contrast interactive UI elements.
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
              style={{ color: "#38bdf8" }}
              className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity mx-0.5"
            >
              {label}
            </Link>
          );
        }
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} style={{ color: "#ffffff" }} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#fde047" }}
            className="px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx} style={{ color: "#f1f5f9" }}>{part}</span>;
    });
  };

  return (
    <div style={{ color: "#f1f5f9" }} className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || /^\d+\.\s/.test(trimmed);

        if (isBullet) {
          const cleaned = trimmed.replace(/^([-•]|\d+\.)\s*/, "");
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span style={{ color: "#fbbf24" }} className="font-bold select-none text-base leading-tight">•</span>
              <div style={{ color: "#f1f5f9" }} className="flex-1 font-normal">{parseInline(cleaned)}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx} style={{ color: "#f1f5f9" }} className="font-normal m-0">
            {parseInline(line)}
          </p>
        );
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
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer ${
          isOpen
            ? "w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 rotate-90 shadow-xl shadow-rose-600/30"
            : "w-16 h-16 bg-transparent border-0 p-0 hover:scale-110"
        }`}
        title="Portal AI Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            <img
              src="/chatbot.png"
              alt="AI Assistant"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
            />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
          </div>
        )}
      </button>

      {/* Chat Popover Window */}
      {isOpen && (
        <div
          style={{ backgroundColor: "#0b1728", borderColor: "#1e3a5f" }}
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col w-[calc(100vw-32px)] sm:w-[420px] h-[540px] max-h-[calc(100vh-120px)] border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          {/* Header */}
          <div
            style={{ backgroundColor: "#0f223a", borderColor: "#1e3a5f" }}
            className="flex items-center justify-between px-5 py-3.5 border-b"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
                <img
                  src="/chatbot.png"
                  alt="AI Bot"
                  className="w-full h-full object-contain"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f223a]"></span>
              </div>
              <div>
                <h3 style={{ color: "#ffffff" }} className="text-sm font-bold flex items-center gap-1.5 m-0">
                  Portal Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </h3>
                <p style={{ color: "#94a3b8" }} className="text-[11px] font-medium m-0">
                  Powered by Gemini AI • Live Data
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Clear conversation"
                style={{ color: "#cbd5e1" }}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                style={{ color: "#cbd5e1" }}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages & Suggestions scrollable content */}
          <div
            style={{ backgroundColor: "#0b1728" }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[90%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="flex items-center justify-center w-7 h-7 shrink-0 select-none self-start mt-0.5">
                    <img
                      src="/chatbot.png"
                      alt="Bot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div
                  style={
                    msg.sender === "user"
                      ? { backgroundColor: "#f59e0b", color: "#0f172a" }
                      : { backgroundColor: "#132840", color: "#f1f5f9", borderColor: "#1e3a5f" }
                  }
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed border shadow-md ${
                    msg.sender === "user"
                      ? "border-amber-400/40 font-semibold rounded-tr-none"
                      : "rounded-tl-none font-normal"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <FormattedMessage text={msg.text} />
                  ) : (
                    <p style={{ color: "#0f172a" }} className="m-0 font-medium">
                      {msg.text}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Suggestions segment (shown only after bot replies and not loading) */}
            {!isLoading && messages[messages.length - 1]?.sender === "bot" && (
              <div className="pt-2 pl-10 space-y-2">
                <p
                  style={{ color: "#94a3b8" }}
                  className="text-[11px] font-bold uppercase tracking-wider m-0"
                >
                  Quick Questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q.text)}
                      style={{
                        backgroundColor: "#132840",
                        color: "#f1f5f9",
                        borderColor: "#1e3a5f",
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-full transition-all hover:border-amber-400/60 hover:bg-[#1a3556] active:scale-95 text-left cursor-pointer shadow-sm"
                    >
                      <span className="text-sm">{q.icon}</span>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%] items-center">
                <div className="flex items-center justify-center w-7 h-7 shrink-0">
                  <img
                    src="/chatbot.png"
                    alt="Bot"
                    className="w-full h-full object-contain animate-bounce"
                  />
                </div>
                <div
                  style={{ backgroundColor: "#132840", borderColor: "#1e3a5f" }}
                  className="border p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-md"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"></span>
                  <span style={{ color: "#94a3b8" }} className="text-xs ml-1.5 font-medium">Thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{ backgroundColor: "rgba(225, 29, 72, 0.15)", borderColor: "rgba(225, 29, 72, 0.3)", color: "#fca5a5" }}
                className="flex gap-2 p-3 rounded-2xl border text-xs items-start"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Bottom input area */}
          <div
            style={{ backgroundColor: "#0f223a", borderColor: "#1e3a5f" }}
            className="p-3 border-t"
          >
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
                style={{
                  backgroundColor: "#0b1728",
                  color: "#ffffff",
                  borderColor: "#1e3a5f",
                }}
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                style={{ backgroundColor: "#f59e0b", color: "#0f172a" }}
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:hover:bg-amber-500 select-none active:scale-95 shrink-0 cursor-pointer shadow-md font-bold"
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
