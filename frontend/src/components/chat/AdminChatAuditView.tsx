"use client";

import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import {
  ShieldAlert,
  Search,
  Users,
  Eye,
  FileText,
  Download,
  Calendar,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Maximize2,
  X
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface AuditUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  designation?: string;
  department?: string;
  employee_code?: string;
  profile_photo_path?: string | null;
  role?: string;
}

interface AuditAttachment {
  id: number;
  file_path: string;
  file_url: string;
  original_name: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
}

interface AuditMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: AuditUser;
  message?: string | null;
  message_type: string;
  attachments: AuditAttachment[];
  created_at: string;
}

interface AuditConversation {
  id: number;
  type: string;
  participants: AuditUser[];
  total_messages: number;
  latest_message?: AuditMessage | null;
  last_message_at?: string;
  created_at?: string;
}

export function AdminChatAuditView() {
  const [conversations, setConversations] = useState<AuditConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AuditMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditConversations();
  }, [searchQuery]);

  useEffect(() => {
    if (activeConversationId) {
      fetchConversationHistory(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const fetchAuditConversations = async () => {
    try {
      setLoadingList(true);
      const res = await api.get(`/direct-chat/admin/conversations?q=${encodeURIComponent(searchQuery)}&t=${Date.now()}`);
      if (res.data?.status === "success") {
        const list: AuditConversation[] = res.data.data || [];
        setConversations(list);
        if (!activeConversationId && list.length > 0) {
          setActiveConversationId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load audit conversations", err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchConversationHistory = async (convId: number) => {
    try {
      setLoadingHistory(true);
      const res = await api.get(`/direct-chat/admin/conversations/${convId}/messages?t=${Date.now()}`);
      if (res.data?.status === "success") {
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load audit history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-4"
    >
      {/* Super Admin Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3.5">
        <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <h3 className="font-bold text-amber-900 dark:text-amber-200">
            Super Admin Chat & History Oversight
          </h3>
          <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
            This module provides administrative audit access to view and monitor all employee direct message conversations across the portal.
          </p>
        </div>
      </div>

      {/* Main Audit Split View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px] max-h-[85vh]">
        {/* Left List of all conversations */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                All Employee Conversations
              </h2>
              <p className="text-[11px] text-slate-500">{conversations.length} active threads</p>
            </div>
          </div>

          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name or code..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No conversations found.</div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const p1 = conv.participants[0];
                const p2 = conv.participants[1];

                let timeStr = "";
                if (conv.last_message_at) {
                  try {
                    timeStr = format(parseISO(conv.last_message_at), "MMM d, h:mm a");
                  } catch (e) {
                    timeStr = "";
                  }
                }

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                      isActive
                        ? "bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-slate-100"
                        : "hover:bg-white dark:hover:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center -space-x-2">
                        <RoyalAvatar
                          src={p1?.profile_photo_path}
                          name={p1?.name || "User 1"}
                          userId={p1?.id}
                          className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 text-[10px]"
                        />
                        <RoyalAvatar
                          src={p2?.profile_photo_path}
                          name={p2?.name || "User 2"}
                          userId={p2?.id}
                          className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 text-[10px]"
                        />
                      </div>
                      <div className="text-xs font-bold truncate flex-1">
                        <span>{p1?.first_name || "User 1"}</span>
                        <span className="text-slate-400 mx-1">↔</span>
                        <span>{p2?.first_name || "User 2"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        {conv.total_messages} messages
                      </span>
                      <span>{timeStr}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Audit Message Transcript */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{activeConversation.participants[0]?.name || "Employee 1"}</span>
                      <span className="text-slate-400">↔</span>
                      <span>{activeConversation.participants[1]?.name || "Employee 2"}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Audit transcript ({messages.length} messages) • Read-only view
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-3">
                {loadingHistory ? (
                  <div className="p-12 text-center text-xs text-slate-400">Loading message log...</div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400">No messages in this conversation.</div>
                ) : (
                  messages.map((msg) => {
                    let timeStr = "";
                    try {
                      timeStr = format(parseISO(msg.created_at), "MMM d, yyyy h:mm a");
                    } catch (e) {
                      timeStr = "";
                    }

                    return (
                      <div
                        key={msg.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <RoyalAvatar
                              src={msg.sender?.profile_photo_path}
                              name={msg.sender?.name || "User"}
                              userId={msg.sender?.id}
                              className="w-6 h-6 rounded-full text-[10px]"
                            />
                            <RoyalName
                              name={msg.sender?.name || "Unknown"}
                              userId={msg.sender?.id}
                              className="text-xs font-bold text-slate-800 dark:text-slate-200"
                            />
                            <span className="text-[10px] text-slate-400">({msg.sender?.role || "Employee"})</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{timeStr}</span>
                        </div>

                        {msg.message && (
                          <div className="text-xs text-slate-800 dark:text-slate-100 pl-8 leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </div>
                        )}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="pl-8 pt-1 space-y-2">
                            {msg.attachments.map((att) => {
                              const isImg = att.file_type?.startsWith("image/");
                              if (isImg) {
                                return (
                                  <div key={att.id} className="relative inline-block group">
                                    <img
                                      src={att.file_url}
                                      alt={att.original_name}
                                      onClick={() => setPreviewImage(att.file_url)}
                                      className="max-h-48 rounded-xl object-contain bg-black/10 cursor-pointer border border-slate-200 dark:border-slate-700"
                                    />
                                  </div>
                                );
                              }

                              return (
                                <a
                                  key={att.id}
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.original_name}
                                  className="inline-flex items-center gap-2 p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                >
                                  <FileText className="w-4 h-4 text-purple-600" />
                                  <span className="font-semibold">{att.original_name}</span>
                                  <span className="text-[10px] opacity-75">({formatFileSize(att.file_size)})</span>
                                  <Download className="w-3.5 h-3.5 ml-1 opacity-80" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-slate-400">
              Select a conversation to review audit history.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white bg-black/50 hover:bg-black rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Expanded preview" className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
