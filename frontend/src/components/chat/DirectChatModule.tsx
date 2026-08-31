"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import {
  Search,
  Plus,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  X,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  User,
  ChevronRight,
  Smile,
  ShieldAlert,
  Eye,
  Maximize2
} from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";

interface ChatUser {
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

interface ChatAttachment {
  id: number;
  file_path: string;
  file_url: string;
  original_name: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
}

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: ChatUser;
  message?: string | null;
  message_type: string;
  is_edited: boolean;
  is_deleted: boolean;
  attachments: ChatAttachment[];
  created_at: string;
}

interface Conversation {
  id: number;
  type: string;
  title: string;
  other_user?: ChatUser | null;
  participants: ChatUser[];
  latest_message?: ChatMessage | null;
  unread_count: number;
  last_message_at?: string;
  is_pinned?: boolean;
  is_muted?: boolean;
}

export function DirectChatModule() {
  const currentUser = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Search & New Chat
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Message Input & Staged Attachments
  const [inputMessage, setInputMessage] = useState("");
  const [stagedFiles, setStagedFiles] = useState<{ file: File; previewUrl: string; isImage: boolean }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Initial load
  useEffect(() => {
    fetchConversations(true);
  }, []);

  // Polling for conversation list and active messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(false);
      if (activeConversationId) {
        fetchMessages(activeConversationId, false);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [activeConversationId]);

  // When active conversation changes, load messages immediately
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId, true);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch conversations
  const fetchConversations = async (showLoader = false) => {
    try {
      if (showLoader) setLoadingConversations(true);
      const res = await api.get(`/direct-chat/conversations?t=${Date.now()}`);
      if (res.data?.status === "success") {
        const list: Conversation[] = res.data.data || [];
        setConversations(list);
        
        // If no active conversation selected, select the first one if available
        if (!activeConversationId && list.length > 0) {
          setActiveConversationId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    } finally {
      if (showLoader) setLoadingConversations(false);
    }
  };

  // Fetch messages
  const fetchMessages = async (convId: number, showLoader = false) => {
    try {
      if (showLoader) setLoadingMessages(true);
      const res = await api.get(`/direct-chat/conversations/${convId}/messages?t=${Date.now()}`);
      if (res.data?.status === "success") {
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      if (showLoader) setLoadingMessages(false);
    }
  };

  // Search users for starting new chat
  useEffect(() => {
    if (!showNewChatModal) return;
    const delayDebounce = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const res = await api.get(`/direct-chat/users/search?q=${encodeURIComponent(userSearchQuery)}&t=${Date.now()}`);
        if (res.data?.status === "success") {
          setSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to search users", err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [userSearchQuery, showNewChatModal]);

  // Start chat with user
  const handleStartChatWithUser = async (targetUser: ChatUser) => {
    try {
      setSending(true);
      const res = await api.post("/direct-chat/conversations/direct", {
        target_user_id: targetUser.id,
      });

      if (res.data?.status === "success") {
        const conv = res.data.data;
        setShowNewChatModal(false);
        setUserSearchQuery("");
        await fetchConversations();
        setActiveConversationId(conv.id);
      }
    } catch (err) {
      console.error("Failed to start conversation", err);
    } finally {
      setSending(false);
    }
  };

  // Handle Clipboard Paste (Screenshot support!)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const previewUrl = URL.createObjectURL(blob);
          const customFile = new File([blob], `screenshot_${format(new Date(), "yyyyMMdd_HHmmss")}.png`, {
            type: blob.type,
          });

          setStagedFiles((prev) => [...prev, { file: customFile, previewUrl, isImage: true }]);
        }
      }
    }
  };

  // Handle File Input Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newStaged: { file: File; previewUrl: string; isImage: boolean }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : "";
      newStaged.push({ file, previewUrl, isImage });
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove staged attachment
  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => {
      const copy = [...prev];
      if (copy[index]?.previewUrl) {
        URL.revokeObjectURL(copy[index].previewUrl);
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!activeConversationId) return;
    const text = inputMessage.trim();
    if (!text && stagedFiles.length === 0) return;

    try {
      setSending(true);
      const formData = new FormData();
      if (text) {
        formData.append("message", text);
      }

      stagedFiles.forEach((sf) => {
        formData.append("attachments[]", sf.file);
      });

      // Clear input and staged files immediately for snappy feel
      setInputMessage("");
      stagedFiles.forEach((sf) => {
        if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
      });
      setStagedFiles([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const res = await api.post(`/direct-chat/conversations/${activeConversationId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "success") {
        const newMsg = res.data.data;
        setMessages((prev) => [...prev, newMsg]);
        fetchConversations(false);
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  // Handle enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-grow textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.other_user?.name || c.title || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[750px] max-h-[85vh]"
    >
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: CONVERSATION LIST & SEARCH (GOOGLE CHAT STYLE)
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
        {/* Header & New Chat button */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Direct Chat
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Google Chat style messages</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation Cards List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loadingConversations ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <User className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No conversations yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Click "New Chat" to message any colleague.</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start a conversation</span>
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = conv.other_user;
              const isActive = conv.id === activeConversationId;
              const hasUnread = conv.unread_count > 0;
              const latest = conv.latest_message;

              let timeStr = "";
              if (conv.last_message_at) {
                try {
                  const date = parseISO(conv.last_message_at);
                  if (isToday(date)) {
                    timeStr = format(date, "h:mm a");
                  } else if (isYesterday(date)) {
                    timeStr = "Yesterday";
                  } else {
                    timeStr = format(date, "MMM d");
                  }
                } catch (e) {
                  timeStr = "";
                }
              }

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                    isActive
                      ? "bg-purple-50 dark:bg-purple-900/25 border border-purple-200 dark:border-purple-800/60 shadow-xs"
                      : "hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <RoyalAvatar
                      src={other?.profile_photo_path}
                      name={other?.name || "User"}
                      userId={other?.id}
                      className="w-10 h-10 rounded-full text-xs"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <RoyalName
                        name={other?.name || conv.title}
                        userId={other?.id}
                        className={`text-xs font-bold truncate ${
                          isActive ? "text-purple-900 dark:text-purple-200" : "text-slate-800 dark:text-slate-100"
                        }`}
                      />
                      {timeStr && <span className="text-[10px] text-slate-400 shrink-0">{timeStr}</span>}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {latest?.message ? (
                        latest.message
                      ) : latest?.attachments?.length ? (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">📎 Attachment</span>
                      ) : (
                        <span className="italic text-slate-400">No messages yet</span>
                      )}
                    </p>
                  </div>

                  {hasUnread && (
                    <span className="shrink-0 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: ACTIVE CHAT STREAM & INPUT AREA
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
        {activeConversation ? (
          <>
            {/* Top Chat Header */}
            <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <RoyalAvatar
                    src={activeConversation.other_user?.profile_photo_path}
                    name={activeConversation.other_user?.name || "User"}
                    userId={activeConversation.other_user?.id}
                    className="w-10 h-10 rounded-full"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                </div>

                <div className="min-w-0">
                  <RoyalName
                    name={activeConversation.other_user?.name || activeConversation.title}
                    userId={activeConversation.other_user?.id}
                    className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block"
                  />
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    <span>{activeConversation.other_user?.designation || "Employee"}</span>
                    {activeConversation.other_user?.department && (
                      <>
                        <span>•</span>
                        <span>{activeConversation.other_user?.department}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-3">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Direct conversation with {activeConversation.other_user?.first_name || "colleague"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                    Send messages, attach files, or paste screenshots directly into the box below.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const prevMsg = messages[index - 1];
                  const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                  // Parse message time
                  let msgTime = "";
                  try {
                    msgTime = format(parseISO(msg.created_at), "h:mm a");
                  } catch (e) {
                    msgTime = "";
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 shrink-0 mb-1">
                          {showAvatar ? (
                            <RoyalAvatar
                              src={msg.sender?.profile_photo_path}
                              name={msg.sender?.name || "User"}
                              userId={msg.sender?.id}
                              className="w-7 h-7 rounded-full text-[10px]"
                            />
                          ) : (
                            <div className="w-7" />
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs ${
                          isMe
                            ? "bg-purple-600 text-white rounded-br-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60"
                        }`}
                      >
                        {/* Text Message */}
                        {msg.message && (
                          <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.message}
                          </div>
                        )}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`space-y-2 ${msg.message ? "mt-2 pt-2 border-t border-white/20" : ""}`}>
                            {msg.attachments.map((att) => {
                              const isImg = att.file_type?.startsWith("image/");

                              if (isImg) {
                                return (
                                  <div key={att.id} className="relative group overflow-hidden rounded-xl">
                                    <img
                                      src={att.file_url}
                                      alt={att.original_name}
                                      onClick={() => setPreviewImage(att.file_url)}
                                      className="max-h-60 rounded-xl object-contain bg-black/10 cursor-pointer hover:opacity-95 transition-opacity"
                                    />
                                    <button
                                      onClick={() => setPreviewImage(att.file_url)}
                                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Expand"
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
                                  className={`flex items-center gap-2.5 p-2 rounded-xl text-xs transition-colors ${
                                    isMe
                                      ? "bg-white/15 hover:bg-white/25 text-white"
                                      : "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                                  }`}
                                >
                                  <FileText className="w-5 h-5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{att.original_name}</p>
                                    <p className="text-[10px] opacity-75">{formatFileSize(att.file_size)}</p>
                                  </div>
                                  <Download className="w-4 h-4 shrink-0 opacity-80" />
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {/* Timestamp & Read Status */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isMe ? "text-purple-200" : "text-slate-400"
                          }`}
                        >
                          <span>{msgTime}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-purple-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Staged Attachments / Screenshots Preview Bar */}
            {stagedFiles.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 overflow-x-auto custom-scrollbar shrink-0">
                {stagedFiles.map((sf, idx) => (
                  <div
                    key={idx}
                    className="relative group shrink-0 w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
                  >
                    {sf.isImage ? (
                      <img src={sf.previewUrl} alt="Staged screenshot" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-400" />
                    )}
                    <button
                      onClick={() => handleRemoveStagedFile(idx)}
                      className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <span className="text-xs text-slate-500 font-medium">
                  {stagedFiles.length} file(s) attached
                </span>
              </div>
            )}

            {/* Input Box Area (Google Chat Style with Paste & Attach) */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-end gap-2 bg-slate-100/90 dark:bg-slate-800 rounded-2xl p-2 px-3 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500 transition-all">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-slate-500 hover:text-purple-600 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                  title="Attach Files or Images"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                />

                {/* Auto-growing Textarea with Screenshot Paste Listener */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  placeholder={`Message ${activeConversation.other_user?.first_name || "colleague"}... (Paste screenshot with Ctrl+V)`}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 placeholder-slate-400 py-1.5 max-h-32 custom-scrollbar font-normal"
                />

                {/* Send Button */}
                <button
                  type="button"
                  disabled={sending || (!inputMessage.trim() && stagedFiles.length === 0)}
                  onClick={handleSendMessage}
                  className="p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  title="Send (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
                <span>Press <b>Enter</b> to send, <b>Shift + Enter</b> for new line</span>
                <span>💡 You can paste screenshots directly (Ctrl + V)</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Welcome to Direct Chat
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Select a conversation from the left or click "New Chat" to connect with your colleagues.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Chat</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: NEW CHAT / SEARCH COLLEAGUE
      ───────────────────────────────────────────────────────────── */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Start a New Chat
                  </h3>
                  <p className="text-[11px] text-slate-400">Search and message any employee</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="p-3 px-5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Type name, email, or department..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1">
              {searchingUsers ? (
                <div className="p-8 text-center text-xs text-slate-400">Searching colleagues...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {userSearchQuery ? "No employees found." : "Search to find colleagues."}
                </div>
              ) : (
                searchResults.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => handleStartChatWithUser(usr)}
                    className="w-full text-left p-2.5 rounded-xl flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RoyalAvatar
                        src={usr.profile_photo_path}
                        name={usr.name}
                        userId={usr.id}
                        className="w-9 h-9 rounded-full text-xs"
                      />
                      <div className="min-w-0">
                        <RoyalName
                          name={usr.name}
                          userId={usr.id}
                          className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {usr.designation} • {usr.department || usr.email}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LIGHTBOX: IMAGE PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
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
