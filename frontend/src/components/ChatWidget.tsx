"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, AlertCircle } from "lucide-react";
import api from "@/services/api";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

const PRE_QUESTIONS = [
  { text: "Who is on leave today?", icon: "🌴" },
  { text: "How do I apply for leave?", icon: "📝" },
  { text: "Who is my department lead?", icon: "💼" },
  { text: "What are my leave balances?", icon: "📊" },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am your AI Portal Assistant. Ask me anything about leaves, team leads, holidays, or system navigation!",
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
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await api.post("/chat", { message: text.trim() });
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: res.data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(
        e.response?.data?.message ||
          "Could not connect to the AI assistant. Please verify Ollama is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 active:scale-95 ${
          isOpen
            ? "bg-rose-600 hover:bg-rose-500 text-white rotate-90"
            : "bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 hover:shadow-amber-400/20 hover:shadow-xl animate-bounce"
        }`}
        title="AI Assistant Chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Chat Popover Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col w-[360px] sm:w-[400px] h-[500px] border border-white/10 bg-slate-950/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400">
                <Bot className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Portal AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </h3>
                <p className="text-2xs text-slate-400 font-medium">Local Ollama Llama 3.2</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages & Suggestions scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-amber-400 shrink-0 select-none">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-amber-400 text-slate-950 font-medium rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-slate-100 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Suggestions segment (only show when last message is from bot and not loading) */}
            {!isLoading && messages[messages.length - 1]?.sender === "bot" && (
              <div className="pt-2 pl-11 space-y-2">
                <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Questions</p>
                <div className="flex flex-wrap gap-2">
                  {PRE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q.text)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all active:scale-95 text-left"
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
              <div className="flex gap-3 max-w-[85%]">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 text-amber-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
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
          <div className="p-4 border-t border-white/10 bg-white/5">
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
                placeholder="Ask about leaves, leads, or navigation..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex items-center justify-center w-10 py-2.5 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:hover:bg-amber-400 select-none active:scale-95 shrink-0"
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
