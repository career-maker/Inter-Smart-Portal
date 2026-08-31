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
  X,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  CheckCircle2
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

  // Deletion States
  const [showClearModal, setShowClearModal] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  // Delete all messages in the active conversation
  const handleClearConversationHistory = async () => {
    if (!activeConversationId) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/direct-chat/admin/conversations/${activeConversationId}/clear`);
      if (res.data?.status === "success") {
        setActionNotice("Conversation history cleared successfully.");
        setShowClearModal(false);
        setMessages([]);
        fetchAuditConversations();
      }
    } catch (err: any) {
      console.error("Failed to clear conversation history", err);
      setActionNotice(err.response?.data?.message || "Failed to clear history.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete an individual message
  const handleDeleteIndividualMessage = async (msgId: number) => {
    try {
      setDeletingMessageId(msgId);
      const res = await api.delete(`/direct-chat/admin/messages/${msgId}`);
      if (res.data?.status === "success") {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        setActionNotice("Message deleted successfully.");
        fetchAuditConversations();
      }
    } catch (err: any) {
      console.error("Failed to delete message", err);
      setActionNotice(err.response?.data?.message || "Failed to delete message.");
    } finally {
      setDeletingMessageId(null);
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
        fontFamily: '"Google Sans", "Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-4"
    >
      {/* Super Admin Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3.5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h3 className="font-bold text-amber-900 dark:text-amber-200">
              Super Admin Chat Management & Oversight
            </h3>
            <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              View, audit, or delete individual employee conversations and chat messages across the organization.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchAuditConversations()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3 px-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:bg-emerald-100 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Audit Split View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px] max-h-[85vh]">
        {/* Left List of all conversations (Responsive: hidden on mobile if chat is open) */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-[#f8fafd] dark:bg-slate-900/60 ${
            activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                All Employee Chats
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
                placeholder="Search employee name or code..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
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
                    className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border ${
                      isActive
                        ? "bg-[#d3e3fd]/60 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-slate-900 dark:text-slate-100"
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

        {/* Right Audit Transcript Panel */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 ${
            !activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Header with Back button on Mobile and Delete Action */}
              <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {activeConversation.participants.map((p) => p.name).join(" & ")}
                      </span>
                      <span className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                        Audit Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Total {messages.length} messages in history
                    </p>
                  </div>
                </div>

                {/* Individual Chat History Clear Button */}
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Permanently clear this conversation history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete History</span>
                </button>
              </div>

              {/* Message Transcript Stream with Per-Message Deletion */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4 bg-white dark:bg-slate-900">
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    Loading transcript...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                    <p>No messages recorded in this conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    let msgTime = "";
                    try {
                      msgTime = format(parseISO(msg.created_at), "MMM d, yyyy h:mm a");
                    } catch (e) {
                      msgTime = msg.created_at;
                    }

                    return (
                      <div
                        key={msg.id}
                        className="group relative flex items-start gap-3 rounded-2xl p-2.5 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <RoyalAvatar
                          src={msg.sender?.profile_photo_path}
                          name={msg.sender?.name || "User"}
                          userId={msg.sender?.id}
                          className="w-8 h-8 rounded-full text-xs shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {msg.sender?.name || "User"}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">{msgTime}</span>
                            </div>

                            {/* Delete Individual Message Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteIndividualMessage(msg.id)}
                              disabled={deletingMessageId === msg.id}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer"
                              title="Delete this message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {msg.message && (
                            <div className="bg-[#f0f4f9] dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-2.5 px-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words inline-block max-w-[95%]">
                              {msg.message}
                            </div>
                          )}

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className={`space-y-2 ${msg.message ? "mt-2" : ""}`}>
                              {msg.attachments.map((att) => {
                                const isImg = att.file_type?.startsWith("image/") || att.original_name.match(/\.(png|jpe?g|gif|webp|svg)$/i);

                                if (isImg) {
                                  return (
                                    <div key={att.id} className="relative group/img overflow-hidden rounded-2xl max-w-sm border border-slate-200 dark:border-slate-700">
                                      <img
                                        src={att.file_url}
                                        alt={att.original_name}
                                        onClick={() => setPreviewImage(att.file_url)}
                                        className="max-h-60 w-auto rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 cursor-pointer hover:opacity-95"
                                      />
                                      <button
                                        onClick={() => setPreviewImage(att.file_url)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                      </button>
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
                                    className="flex items-center gap-3 p-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-xs transition-colors border border-slate-200 dark:border-slate-700 max-w-sm"
                                  >
                                    <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-semibold">{att.original_name}</p>
                                      <p className="text-[10px] text-slate-500">{formatFileSize(att.file_size)}</p>
                                    </div>
                                    <Download className="w-4 h-4 text-slate-500 shrink-0" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Eye className="w-12 h-12 opacity-30 mb-2" />
              <p className="text-sm font-semibold">Select a conversation thread to view audit history</p>
            </div>
          )}
        </div>
      </div>

      {/* Clear Conversation Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Delete Conversation History?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Are you sure you want to permanently delete all messages and media attachments in this conversation between{" "}
                <b>{activeConversation?.participants.map((p) => p.name).join(" and ")}</b>?
              </p>
              <p className="text-[11px] text-rose-600 font-semibold mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearConversationHistory}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Confirm & Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white bg-black/50 hover:bg-black rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Expanded preview" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
