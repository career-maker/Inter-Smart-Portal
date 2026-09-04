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
 * Styled in Inter Smart Light Theme matching the Birthday Wish Drawer.
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
              className="text-[#56348f] font-semibold underline underline-offset-2 hover:text-[#432670] transition-colors mx-0.5"
            >
              {label}
            </Link>
          );
        }
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="bg-purple-50 text-[#56348f] border border-purple-100 px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx} className="text-slate-800">{part}</span>;
    });
  };

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed);

        if (isBullet) {
          const cleaned = trimmed.replace(/^([-•*]|\d+\.)\s*/, "");
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="text-[#56348f] font-bold select-none text-base leading-tight">•</span>
              <div className="flex-1 font-normal text-slate-800">{parseInline(cleaned)}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="font-normal m-0 text-slate-800">
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
      text: "Hello! I am your AI Portal Assistant. Ask me anything about leaves, project teams, department leads, holidays, attendance, or tasks!",
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

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Hello! I am your AI Portal Assistant. Ask me anything about leaves, project teams, department leads, holidays, attendance, or tasks!",
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
      {/* Floating Action Launcher Button (Pure transparent PNG icon without dark container) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Portal AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-transparent border-0 p-0 hover:scale-110 active:scale-95 transition-all cursor-pointer select-none"
        title="Portal AI Assistant"
      >
        <div className="relative flex items-center justify-center w-full h-full">
          <img
            src="/chatbot.png"
            alt="AI Assistant"
            className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          />
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
        </div>
      </button>

      {/* Side Popup Drawer (Matching Birthday Wish Drawer styling & light theme) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] max-w-full bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 z-50 animate-in slide-in-from-right duration-300">
            {/* Header with Royal Purple gradient accent */}
            <div className="relative px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-purple-50/80 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                  <img
                    src="/chatbot.png"
                    alt="AI Bot"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5 m-0 leading-tight">
                    Portal Assistant
                    <Sparkles className="w-4 h-4 text-[#56348f] animate-pulse" />
                  </h3>
                  <p className="text-xs text-slate-500 font-normal m-0">
                    Powered by Gemini AI • Live Data
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetChat}
                  title="Clear conversation"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages & Suggestions scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/60">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[92%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  {msg.sender === "bot" && (
                    <div className="flex items-center justify-center w-7 h-7 shrink-0 select-none self-start mt-1">
                      <img
                        src="/chatbot.png"
                        alt="Bot"
                        className="w-full h-full object-contain drop-shadow-xs"
                      />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#56348f] text-white rounded-tr-none shadow-sm font-normal"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-none shadow-xs font-normal"
                    }`}
                  >
                    {msg.sender === "bot" ? (
                      <FormattedMessage text={msg.text} />
                    ) : (
                      <p className="m-0 text-white font-normal">
                        {msg.text}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Suggestions segment */}
              {!isLoading && messages[messages.length - 1]?.sender === "bot" && (
                <div className="pt-2 pl-9 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                    Quick Questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRE_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(q.text)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-purple-50 text-slate-700 hover:text-[#56348f] border border-slate-200 hover:border-[#56348f]/40 rounded-full transition-all shadow-xs active:scale-95 cursor-pointer text-left"
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
                      className="w-full h-full object-contain animate-bounce drop-shadow-xs"
                    />
                  </div>
                  <div className="bg-white border border-slate-200/90 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#56348f] animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#56348f] animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#56348f] animate-bounce"></span>
                    <span className="text-xs ml-1.5 font-medium text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="flex gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom input area */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200">
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
                  placeholder="Ask about leaves, projects, leads, attendance..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#56348f] focus:ring-1 focus:ring-[#56348f] transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#56348f] hover:bg-[#432670] text-white transition-all disabled:opacity-40 disabled:hover:bg-[#56348f] select-none active:scale-95 shrink-0 cursor-pointer shadow-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
