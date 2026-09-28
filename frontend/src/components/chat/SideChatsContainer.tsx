"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMinimizedChatsStore } from "@/store/minimizedChatsStore";
import { X, Minus, Send, Maximize2 } from "lucide-react";
import api from "@/services/api";
import { RoyalAvatar } from "@/components/ui/RoyalAvatar";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { format, parseISO } from "date-fns";

export function SideChatsContainer() {
  const { chats, openSideChat, closeSideChat, removeMinimizedChat } = useMinimizedChatsStore();
  const currentUser = useAuthStore((state) => state.user);

  if (chats.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-24 z-[9999] flex items-end gap-3 pointer-events-none">
      {chats.map((chat) => (
        <div key={chat.conversationId} className="pointer-events-auto">
          {chat.isOpen ? (
            <SideChatWindow
              chat={chat}
              onMinimize={() => closeSideChat(chat.conversationId)}
              onClose={() => removeMinimizedChat(chat.conversationId)}
              currentUser={currentUser}
            />
          ) : (
            <button
              onClick={() => openSideChat(chat.conversationId)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-t-xl px-4 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors w-48 shrink-0 cursor-pointer"
            >
              <RoyalAvatar src={chat.avatar} name={chat.name} userId={chat.userId} className="w-6 h-6 rounded-full" />
              <span className="text-sm font-semibold truncate flex-1 text-slate-800 dark:text-slate-200 text-left">{chat.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMinimizedChat(chat.conversationId);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function SideChatWindow({ chat, onMinimize, onClose, currentUser }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const chatStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    api.get(`/direct-chat/conversations/${chat.conversationId}/messages`).then(res => {
      setMessages(res.data?.data || []);
      setTimeout(() => {
        chatStreamRef.current?.scrollTo({ top: chatStreamRef.current.scrollHeight });
      }, 50);
    }).catch(err => console.error("Failed to fetch initial side chat msg", err));

    const interval = setInterval(() => {
      api.get(`/direct-chat/conversations/${chat.conversationId}/messages`).then(res => {
        setMessages(prev => {
          const newMsgs = res.data?.data || [];
          if (newMsgs.length > prev.length) {
            setTimeout(() => {
              chatStreamRef.current?.scrollTo({ top: chatStreamRef.current.scrollHeight });
            }, 50);
          }
          return newMsgs;
        });
      }).catch(err => console.error("Failed to poll side chat msg", err));
    }, 5000);

    return () => clearInterval(interval);
  }, [chat.conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const tempMsg = {
      id: "temp-" + Date.now(),
      sender_id: currentUser?.id,
      message: input.trim(),
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setInput("");
    setTimeout(() => {
      chatStreamRef.current?.scrollTo({ top: chatStreamRef.current.scrollHeight });
    }, 50);

    try {
      await api.post(`/direct-chat/conversations/${chat.conversationId}/messages`, {
        message: tempMsg.message,
      });
    } catch (err) {
      console.error("Failed to send side chat msg", err);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111b21] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-t-xl w-72 flex flex-col overflow-hidden" style={{ height: "400px" }}>
      {/* Header */}
      <div className="bg-[#202c33] px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <RoyalAvatar src={chat.avatar} name={chat.name} userId={chat.userId} className="w-7 h-7 rounded-full" />
          <span className="text-white font-semibold text-sm truncate">{chat.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/chat`} onClick={onClose} className="p-1 text-slate-300 hover:text-white" title="Open in full chat">
             <Maximize2 className="w-3.5 h-3.5" />
          </Link>
          <button onClick={onMinimize} className="p-1 text-slate-300 hover:text-white cursor-pointer"><Minus className="w-4 h-4" /></button>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#f0f2f5] dark:bg-[#0b141a]" ref={chatStreamRef}>
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`px-3 py-1.5 rounded-lg max-w-[85%] text-sm shadow-sm ${isMe ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100" : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100"}`}>
                <p className="m-0 break-words">{msg.message}</p>
                {msg.file_path && (
                   <span className="text-xs opacity-70 mt-1 italic">[Attachment]</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          className="flex-1 bg-white dark:bg-slate-800 border-none rounded-full px-3 py-1.5 text-sm outline-none text-slate-900 dark:text-slate-100"
        />
        <button type="submit" disabled={!input.trim()} className="bg-[#56348f] text-white p-2 rounded-full cursor-pointer disabled:opacity-50">
          <Send className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
