"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Maximize2,
  AlertCircle,
  UploadCloud,
  RotateCw
} from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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
  id?: number;
  file_path?: string;
  file_url: string;
  original_name: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
}

interface ChatMessage {
  id: number | string;
  conversation_id: number;
  sender_id: number;
  sender?: ChatUser;
  message?: string | null;
  message_type: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  attachments: ChatAttachment[];
  created_at: string;
  is_optimistic?: boolean;
  status?: "sending" | "sent" | "error";
  rawFiles?: File[];
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

  // In-memory instant cache for zero-delay conversation switching
  const messagesCacheRef = useRef<Record<number, ChatMessage[]>>({});

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFetchingMessagesRef = useRef(false);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Formatted Current User for Optimistic Messages
  const formattedCurrentUser: ChatUser = useMemo(() => ({
    id: currentUser?.id || 0,
    name: `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() || "You",
    first_name: currentUser?.first_name || "You",
    last_name: currentUser?.last_name || "",
    email: currentUser?.email || "",
    designation: currentUser?.designation || "Employee",
    profile_photo_path: currentUser?.profile_photo_path || null,
  }), [currentUser]);

  // Initial load
  useEffect(() => {
    fetchConversations(true);
  }, []);

  // Fast background polling (every 1.5s) & Window Focus Listener for instant sync
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchConversations(false);
      if (activeConversationId) {
        fetchMessages(activeConversationId, false);
      }
    }, 1500);

    const handleWindowFocus = () => {
      fetchConversations(false);
      if (activeConversationId) {
        fetchMessages(activeConversationId, false);
      }
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [activeConversationId]);

  // Instant conversation switching using fast in-memory cache
  useEffect(() => {
    if (activeConversationId) {
      if (messagesCacheRef.current[activeConversationId]) {
        // Instant display from cache (0ms delay!)
        setMessages(messagesCacheRef.current[activeConversationId]);
        fetchMessages(activeConversationId, false);
      } else {
        setMessages([]);
        fetchMessages(activeConversationId, true);
      }
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Dismiss error notification after 5s
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch conversations
  const fetchConversations = async (showLoader = false) => {
    try {
      if (showLoader) setLoadingConversations(true);
      const res = await api.get(`/direct-chat/conversations?t=${Date.now()}`);
      if (res.data?.status === "success") {
        const list: Conversation[] = res.data.data || [];
        setConversations(list);
        
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

  // Fetch messages with optimistic merge & memory cache
  const fetchMessages = async (convId: number, showLoader = false) => {
    if (isFetchingMessagesRef.current) return;
    try {
      isFetchingMessagesRef.current = true;
      if (showLoader) setLoadingMessages(true);
      const res = await api.get(`/direct-chat/conversations/${convId}/messages?t=${Date.now()}`);
      if (res.data?.status === "success") {
        const serverMessages: ChatMessage[] = res.data.data || [];

        setMessages((current) => {
          // Preserve any in-flight optimistic messages
          const pendingOptimistic = current.filter((m) => m.is_optimistic && m.status === "sending");
          if (pendingOptimistic.length === 0) {
            messagesCacheRef.current[convId] = serverMessages;
            return serverMessages;
          }

          // Merge server messages with pending optimistic messages that haven't landed yet
          const serverIds = new Set(serverMessages.map((m) => m.id));
          const uniquePending = pendingOptimistic.filter((m) => !serverIds.has(m.id));
          const merged = [...serverMessages, ...uniquePending];
          messagesCacheRef.current[convId] = merged;
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      isFetchingMessagesRef.current = false;
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
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [userSearchQuery, showNewChatModal]);

  // Start chat with user
  const handleStartChatWithUser = async (targetUser: ChatUser) => {
    try {
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
    }
  };

  // Process & validate incoming files (5MB restriction)
  const processAndStageFiles = (files: FileList | File[]) => {
    const validStaged: { file: File; previewUrl: string; isImage: boolean }[] = [];
    const rejectedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedFiles.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : "";
      validStaged.push({ file, previewUrl, isImage });
    }

    if (rejectedFiles.length > 0) {
      setErrorMessage(`Upload failed: ${rejectedFiles.join(", ")} exceeds the 5 MB limit.`);
    }

    if (validStaged.length > 0) {
      setStagedFiles((prev) => [...prev, ...validStaged]);
    }
  };

  // Handle Clipboard Paste (Screenshot support)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToStage: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const customFile = new File([blob], `screenshot_${format(new Date(), "yyyyMMdd_HHmmss")}.png`, {
            type: blob.type,
          });
          filesToStage.push(customFile);
        }
      }
    }

    if (filesToStage.length > 0) {
      processAndStageFiles(filesToStage);
    }
  };

  // Handle File Input Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processAndStageFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Drag & Drop Events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAndStageFiles(e.dataTransfer.files);
    }
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

  // Instant / Optimistic Send Message (0ms lag with visible sending indicators)
  const handleSendMessage = async (retryMessage?: ChatMessage) => {
    if (!activeConversationId) return;

    let text = "";
    let currentFiles: { file: File; previewUrl: string; isImage: boolean }[] = [];
    let tempId = "";

    if (retryMessage) {
      text = retryMessage.message || "";
      tempId = String(retryMessage.id);
      currentFiles = (retryMessage.rawFiles || []).map((f) => ({
        file: f,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
        isImage: f.type.startsWith("image/"),
      }));
      // Reset status to sending
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sending" } : m))
      );
    } else {
      text = inputMessage.trim();
      if (!text && stagedFiles.length === 0) return;

      currentFiles = [...stagedFiles];
      tempId = `optimistic_${Date.now()}`;

      // 1. Instantly clear input & staged files for snappy 0ms feel
      setInputMessage("");
      setStagedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // 2. Generate immediate optimistic message with visible sending status
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversation_id: activeConversationId,
        sender_id: currentUser?.id || 0,
        sender: formattedCurrentUser,
        message: text || null,
        message_type: currentFiles.length > 0 && !text ? (currentFiles[0].isImage ? "image" : "file") : "text",
        is_edited: false,
        is_deleted: false,
        attachments: currentFiles.map((sf) => ({
          file_url: sf.previewUrl,
          original_name: sf.file.name,
          file_type: sf.file.type,
          file_size: sf.file.size,
        })),
        created_at: new Date().toISOString(),
        is_optimistic: true,
        status: "sending",
        rawFiles: currentFiles.map((sf) => sf.file),
      };

      // 3. Immediately append to state in 0ms
      setMessages((prev) => [...prev, optimisticMessage]);

      // Update snippet in conversation list immediately
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                latest_message: optimisticMessage,
                last_message_at: new Date().toISOString(),
              }
            : c
        )
      );
    }

    // 4. Send network request in background
    try {
      const formData = new FormData();
      if (text) {
        formData.append("message", text);
      }
      currentFiles.forEach((sf) => {
        formData.append("attachments[]", sf.file);
      });

      const res = await api.post(`/direct-chat/conversations/${activeConversationId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "success") {
        const serverMsg = res.data.data;
        // Clean up object URLs
        currentFiles.forEach((sf) => {
          if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
        });

        // Swap optimistic message with confirmed server message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...serverMsg, status: "sent" } : m))
        );

        fetchConversations(false);
      }
    } catch (err: any) {
      console.error("Failed to send message", err);
      const errTxt = err.response?.data?.message || "Failed to send message. Click to retry.";
      setErrorMessage(errTxt);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m))
      );
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
        fontFamily: '"Google Sans", "Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[740px] max-h-[85vh]"
    >
      {/* ─────────────────────────────────────────────────────────────
          DRAG & DROP OVERLAY DROPZONE
      ───────────────────────────────────────────────────────────── */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#0b57d0]/10 dark:bg-purple-900/30 backdrop-blur-xs border-3 border-dashed border-[#0b57d0] dark:border-purple-400 rounded-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-100 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-[#0b57d0] text-white flex items-center justify-center mb-3 shadow-lg animate-bounce">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#0b57d0] dark:text-purple-300">
            Drop files or screenshots here
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Files will be attached to your message (Max 5 MB per file)
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ERROR TOAST BANNER (e.g. 5MB limit exceeded)
      ───────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 hover:bg-rose-700 rounded-full p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: GOOGLE CHAT CONVERSATION LIST
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-80 lg:w-88 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shrink-0 bg-[#f8fafd] dark:bg-slate-900/80">
        {/* Header & New Chat Button */}
        <div className="p-3.5 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#c2e7ff] text-[#001d35] dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Direct Chat
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">1-on-1 conversations</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c2e7ff] hover:bg-[#b3e0ff] text-[#001d35] dark:bg-purple-600 dark:hover:bg-purple-700 dark:text-white rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar (Pill Shape matching Google Chat) */}
        <div className="p-3 px-4 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people or chats..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-[#c2e7ff] dark:focus:ring-purple-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
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

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
          {loadingConversations ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <User className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No conversations yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "New Chat" to message any colleague.</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 px-3.5 py-1.5 bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3e0ff] dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
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
                  className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#d3e3fd]/60 dark:bg-purple-950/40 text-slate-900 dark:text-white font-medium"
                      : "hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
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
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-slate-900 dark:text-white font-bold" : "text-slate-800 dark:text-slate-200"
                        }`}
                      />
                      {timeStr && <span className="text-[10px] text-slate-400 shrink-0 font-normal">{timeStr}</span>}
                    </div>

                    <p className={`text-[11px] truncate mt-0.5 ${hasUnread ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                      {latest?.message ? (
                        latest.message
                      ) : latest?.attachments?.length ? (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">📎 Attachment</span>
                      ) : (
                        <span className="italic text-slate-400">No messages</span>
                      )}
                    </p>
                  </div>

                  {hasUnread && (
                    <span className="shrink-0 bg-[#0b57d0] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
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
          RIGHT PANEL: GOOGLE CHAT MESSAGE STREAM & INPUT COMPOSER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
        {activeConversation ? (
          <>
            {/* Top Chat Header (Google Chat Style) */}
            <div className="p-3 px-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
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
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Chat Style Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4 bg-white dark:bg-slate-900">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-[#c2e7ff] dark:bg-purple-900/30 text-[#001d35] dark:text-purple-300 flex items-center justify-center mb-3">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Direct conversation with {activeConversation.other_user?.first_name || "colleague"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                    Send messages, drag & drop files, or paste screenshots directly into the box below.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const prevMsg = messages[index - 1];
                  const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                  // Parse message time
                  let msgTime = "";
                  try {
                    msgTime = format(parseISO(msg.created_at), "h:mm a");
                  } catch (e) {
                    msgTime = format(new Date(), "h:mm a");
                  }

                  const isSending = msg.status === "sending";
                  const isError = msg.status === "error";

                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex items-start gap-3 rounded-2xl p-2 -mx-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        showHeader ? "mt-3" : "mt-0.5"
                      }`}
                    >
                      {/* Left: Avatar (only shown on the first message of a sender group) */}
                      <div className="w-9 shrink-0 flex items-start justify-center">
                        {showHeader ? (
                          <RoyalAvatar
                            src={isMe ? formattedCurrentUser.profile_photo_path : msg.sender?.profile_photo_path}
                            name={isMe ? formattedCurrentUser.name : (msg.sender?.name || "User")}
                            userId={isMe ? formattedCurrentUser.id : msg.sender?.id}
                            className="w-9 h-9 rounded-full text-xs"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msgTime}
                          </span>
                        )}
                      </div>

                      {/* Right: Message Content */}
                      <div className="flex-1 min-w-0">
                        {showHeader && (
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {isMe ? "You" : (msg.sender?.name || activeConversation.other_user?.name || "User")}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {msgTime}
                            </span>
                            {isSending && (
                              <span className="text-[10.5px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 animate-spin" /> Sending...
                              </span>
                            )}
                            {isError && (
                              <button
                                onClick={() => handleSendMessage(msg)}
                                className="text-[10.5px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full cursor-pointer hover:underline"
                              >
                                <AlertCircle className="w-3 h-3" /> Failed to send. Click to retry <RotateCw className="w-2.5 h-2.5 ml-0.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Message Bubble Body */}
                        <div className="inline-block max-w-[95%]">
                          {msg.message && (
                            <div
                              className={`p-2.5 px-4 rounded-2xl text-xs sm:text-[13.5px] leading-relaxed whitespace-pre-wrap break-words inline-block relative ${
                                isMe
                                  ? "bg-[#e8def8] text-[#1d192b] dark:bg-purple-950/60 dark:text-purple-100 rounded-tl-sm font-medium"
                                  : "bg-[#f0f4f9] text-[#1f1f1f] dark:bg-slate-800 dark:text-slate-100 rounded-tl-sm"
                              }`}
                            >
                              {msg.message}
                              {isSending && !showHeader && (
                                <span className="ml-2 text-[10px] opacity-75 font-normal italic inline-flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 animate-spin" /> Sending...
                                </span>
                              )}
                            </div>
                          )}

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className={`space-y-2 ${msg.message ? "mt-2" : ""}`}>
                              {msg.attachments.map((att, attIdx) => {
                                const isImg = att.file_type?.startsWith("image/") || att.original_name.match(/\.(png|jpe?g|gif|webp|svg)$/i);

                                if (isImg) {
                                  return (
                                    <div key={att.id || attIdx} className="relative group/img overflow-hidden rounded-2xl max-w-sm border border-slate-200/80 dark:border-slate-700">
                                      <img
                                        src={att.file_url}
                                        alt={att.original_name}
                                        onClick={() => setPreviewImage(att.file_url)}
                                        className="max-h-64 w-auto rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 cursor-pointer hover:opacity-95 transition-opacity"
                                      />
                                      {/* Sending overlay for images */}
                                      {isSending && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex flex-col items-center justify-center text-white text-xs font-semibold gap-1.5">
                                          <Clock className="w-5 h-5 animate-spin" />
                                          <span>Sending photo...</span>
                                        </div>
                                      )}
                                      {!isSending && (
                                        <button
                                          onClick={() => setPreviewImage(att.file_url)}
                                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                          title="Expand"
                                        >
                                          <Maximize2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <a
                                    key={att.id || attIdx}
                                    href={isSending ? "#" : att.file_url}
                                    target={isSending ? "_self" : "_blank"}
                                    rel="noopener noreferrer"
                                    download={att.original_name}
                                    className={`flex items-center gap-3 p-2.5 px-3.5 bg-[#f0f4f9] hover:bg-[#e1eaf5] dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-xs transition-colors border border-slate-200/80 dark:border-slate-700 max-w-sm text-slate-800 dark:text-slate-100 ${
                                      isSending ? "opacity-75 cursor-default" : ""
                                    }`}
                                  >
                                    <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-semibold text-xs">{att.original_name}</p>
                                      <p className="text-[10px] text-slate-500">{formatFileSize(att.file_size)}</p>
                                    </div>
                                    {isSending ? (
                                      <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3 animate-spin" /> Sending...
                                      </span>
                                    ) : (
                                      <Download className="w-4 h-4 shrink-0 text-slate-500" />
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Staged Attachments / Screenshot Previews Bar */}
            {stagedFiles.length > 0 && (
              <div className="px-5 py-2.5 bg-[#f8fafd] dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3 overflow-x-auto custom-scrollbar shrink-0">
                {stagedFiles.map((sf, idx) => (
                  <div
                    key={idx}
                    className="relative group shrink-0 w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-700 flex items-center justify-center shadow-xs"
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
                  {stagedFiles.length} file(s) ready to send (Max 5 MB)
                </span>
              </div>
            )}

            {/* Google Chat Floating Composer Input */}
            <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-end gap-2 bg-[#f0f4f9] dark:bg-slate-800 rounded-3xl p-2 px-3.5 border border-slate-200/80 dark:border-slate-700 focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500 transition-all">
                {/* File Upload / Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-slate-500 hover:text-purple-600 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                  title="Attach files or photos (< 5 MB)"
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

                {/* Textarea with Instant Screenshot Paste (Ctrl + V) */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  placeholder={`Message ${activeConversation.other_user?.first_name || "colleague"}... (Paste screenshot with Ctrl+V or Drag & Drop)`}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-[13.5px] text-slate-800 dark:text-slate-100 placeholder-slate-400 py-1.5 max-h-32 custom-scrollbar font-normal"
                />

                {/* Send Button */}
                <button
                  type="button"
                  disabled={!inputMessage.trim() && stagedFiles.length === 0}
                  onClick={() => handleSendMessage()}
                  className="p-2 bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-30 disabled:hover:bg-[#0b57d0] text-white rounded-full shadow-xs transition-colors shrink-0 cursor-pointer"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1 px-3 text-[10.5px] text-slate-400">
                <span>Press <b>Enter</b> to send, <b>Shift + Enter</b> for new line</span>
                <span>💡 Paste with <b>Ctrl + V</b> or Drag & Drop (Max 5 MB)</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#c2e7ff] text-[#001d35] flex items-center justify-center mb-3 shadow-xs">
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
              className="mt-4 px-4 py-2 bg-[#c2e7ff] hover:bg-[#b3e0ff] text-[#001d35] rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#c2e7ff] text-[#001d35] dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-bold">
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100"
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
                    className="w-full text-left p-2.5 rounded-2xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
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
            <img src={previewImage} alt="Expanded preview" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
