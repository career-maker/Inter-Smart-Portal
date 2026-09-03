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
  RotateCw,
  ArrowLeft,
  Bell,
  Smile,
  Volume2
} from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useChatPushNotifications } from "@/hooks/useChatPushNotifications";

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
  is_online?: boolean;
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
  is_read?: boolean;
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
  is_optimistic?: boolean;
}

export function DirectChatModule() {
  const currentUser = useAuthStore((state) => state.user);
  const { permissionStatus, requestNotificationPermission, sendTestNotification } = useChatPushNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // In-memory instant cache for zero-delay conversation switching
  const messagesCacheRef = useRef<Record<number, ChatMessage[]>>({});
  const knownMessageIdsRef = useRef<Set<string | number>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Search & New Chat with Instant Client Pre-caching
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [allColleagues, setAllColleagues] = useState<ChatUser[]>([]);
  const [loadingColleagues, setLoadingColleagues] = useState(false);

  // Message Input & Staged Attachments
  const [inputMessage, setInputMessage] = useState("");
  const [stagedFiles, setStagedFiles] = useState<{ file: File; previewUrl: string; isImage: boolean }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFetchingMessagesRef = useRef(false);

  const scrollToBottom = useCallback((smooth = false) => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

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

  // Web Audio API notification chime (Crisp dual-tone bell chime)
  const playMessageSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Tone 1 (587 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Tone 2 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0.22, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.38);
    } catch (e) {
      console.warn("Audio notification not supported or user has not interacted yet.", e);
    }
  }, []);

  // Browser Push Notification
  const showBrowserNotification = useCallback((senderName: string, text: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(`${senderName} on InterSmart Chat`, {
          body: text || "Sent an attachment",
          icon: "/icon.png",
          tag: `chat_msg_${Date.now()}`,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn("Browser notification trigger failed", e);
      }
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations(true);
    fetchAllColleagues();

    // Read conversationId from URL if navigated from header or notification
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const convParam = params.get("conversationId");
      if (convParam) {
        const id = parseInt(convParam, 10);
        if (!isNaN(id)) {
          setActiveConversationId(id);
        }
      }
    }
  }, []);

  // Fast background polling & Window Focus Listener for instant sync
  useEffect(() => {
    let tick = 0;
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      tick++;

      // Poll messages every 2.5s
      if (activeConversationId) {
        fetchMessages(activeConversationId, false);
      }

      // Poll conversation list every ~7.5s (every 3 ticks)
      if (tick % 3 === 0) {
        fetchConversations(false);
      }

      // Ping presence heartbeat every ~30s (every 12 ticks) and on first tick
      if (tick === 1 || tick % 12 === 0) {
        api.post<{ online_user_ids: number[] }>("/direct-chat/heartbeat")
          .then((res) => {
            const onlineIds = res.data?.online_user_ids || [];
            setConversations((prev) =>
              prev.map((c) => {
                if (!c.other_user) return c;
                return {
                  ...c,
                  other_user: {
                    ...c.other_user,
                    is_online: onlineIds.includes(c.other_user.id),
                  },
                };
              })
            );
          })
          .catch(() => {});
      }
    }, 2500);

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
      setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
        scrollToBottom(false);
      }, 50);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, scrollToBottom]);

  // Auto-scroll to bottom on messages change without scrolling outer window
  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Dismiss error notification after 5s
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch all colleagues for instantaneous 0ms new chat search
  const fetchAllColleagues = async () => {
    try {
      setLoadingColleagues(true);
      const res = await api.get(`/direct-chat/users/search?q=&t=${Date.now()}`);
      if (res.data?.status === "success") {
        setAllColleagues(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load colleagues", err);
    } finally {
      setLoadingColleagues(false);
    }
  };

  // Instant 0ms synchronous filtering of colleagues for New Chat modal
  const filteredColleagues = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return allColleagues;

    return allColleagues.filter((usr) => {
      const combined = `${usr.name || ""} ${usr.first_name || ""} ${usr.last_name || ""} ${usr.email || ""} ${usr.employee_code || ""} ${usr.designation || ""} ${usr.department || ""}`.toLowerCase();
      return combined.includes(q);
    });
  }, [allColleagues, userSearchQuery]);

  // Fetch conversations
  const fetchConversations = async (showLoader = false) => {
    try {
      if (showLoader) setLoadingConversations(true);
      const res = await api.get(`/direct-chat/conversations?t=${Date.now()}`);
      if (res.data?.status === "success") {
        const list: Conversation[] = res.data.data || [];
        setConversations((prev) => {
          // Preserve any optimistic conversation that hasn't synced
          const optimisticList = prev.filter((p) => p.is_optimistic && !list.some((l) => l.id === p.id));
          return [...optimisticList, ...list];
        });

        // Only auto-select first conversation on Desktop screens (>= 768px). On Mobile, show the WhatsApp conversation list!
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          if (!activeConversationId && list.length > 0 && !initialLoadDoneRef.current) {
            setActiveConversationId(list[0].id);
          }
        }
        initialLoadDoneRef.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    } finally {
      if (showLoader) setLoadingConversations(false);
    }
  };

  // Fetch messages with optimistic merge, audio chime & browser push
  const fetchMessages = async (convId: number, showLoader = false) => {
    if (isFetchingMessagesRef.current) return;
    try {
      isFetchingMessagesRef.current = true;
      if (showLoader) setLoadingMessages(true);
      const res = await api.get(`/direct-chat/conversations/${convId}/messages?t=${Date.now()}`);
      if (res.data?.status === "success") {
        const serverMessages: ChatMessage[] = res.data.data || [];

        // Check for new incoming messages from other people to trigger chime & push notification
        let hasNewIncoming = false;
        let latestIncomingSender = "";
        let latestIncomingText = "";

        serverMessages.forEach((msg) => {
          if (!knownMessageIdsRef.current.has(msg.id)) {
            knownMessageIdsRef.current.add(msg.id);
            if (msg.sender_id !== currentUser?.id) {
              hasNewIncoming = true;
              latestIncomingSender = msg.sender?.name || "Colleague";
              latestIncomingText = msg.message || "Sent an attachment";
            }
          }
        });

        if (hasNewIncoming && initialLoadDoneRef.current) {
          playMessageSound();
          showBrowserNotification(latestIncomingSender, latestIncomingText);
        }

        setMessages((current) => {
          const pendingOptimistic = current.filter((m) => m.is_optimistic && m.status === "sending");
          if (pendingOptimistic.length === 0) {
            messagesCacheRef.current[convId] = serverMessages;
            return serverMessages;
          }

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

  // Start chat with user (Instant 0ms UI switch)
  const handleStartChatWithUser = async (targetUser: ChatUser) => {
    setShowNewChatModal(false);
    setUserSearchQuery("");

    const existing = conversations.find(
      (c) => c.other_user?.id === targetUser.id || c.participants.some((p) => p.id === targetUser.id)
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
        scrollToBottom(false);
      }, 50);
      return;
    }

    const tempConvId = -(targetUser.id);
    const optimisticConv: Conversation = {
      id: tempConvId,
      type: "direct",
      title: targetUser.name,
      other_user: targetUser,
      participants: [formattedCurrentUser, targetUser],
      latest_message: null,
      unread_count: 0,
      last_message_at: new Date().toISOString(),
      is_optimistic: true,
    };

    setConversations((prev) => [optimisticConv, ...prev]);
    setActiveConversationId(tempConvId);
    messagesCacheRef.current[tempConvId] = [];
    setMessages([]);
    setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
      scrollToBottom(false);
    }, 50);

    try {
      const res = await api.post("/direct-chat/conversations/direct", {
        target_user_id: targetUser.id,
      });

      if (res.data?.status === "success") {
        const realConv: Conversation = res.data.data;
        
        setConversations((prev) =>
          prev.map((c) => (c.id === tempConvId ? { ...realConv, other_user: targetUser } : c))
        );

        if (messagesCacheRef.current[tempConvId]) {
          messagesCacheRef.current[realConv.id] = messagesCacheRef.current[tempConvId];
          delete messagesCacheRef.current[tempConvId];
        }

        setActiveConversationId(realConv.id);
        fetchMessages(realConv.id, false);
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

  // Instant / Optimistic Send Message
  const handleSendMessage = async (retryMessage?: ChatMessage) => {
    if (!activeConversationId) return;

    let text = "";
    let currentFiles: { file: File; previewUrl: string; isImage: boolean }[] = [];
    let tempId = "";
    const targetConvId = activeConversationId;

    if (retryMessage) {
      text = retryMessage.message || "";
      tempId = String(retryMessage.id);
      currentFiles = (retryMessage.rawFiles || []).map((f) => ({
        file: f,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
        isImage: f.type.startsWith("image/"),
      }));
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sending" as const } : m))
      );
    } else {
      text = inputMessage.trim();
      if (!text && stagedFiles.length === 0) return;

      currentFiles = [...stagedFiles];
      tempId = `optimistic_${Date.now()}`;

      setInputMessage("");
      setStagedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversation_id: targetConvId,
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

      setMessages((prev) => {
        const next = [...prev, optimisticMessage];
        messagesCacheRef.current[targetConvId] = next;
        return next;
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                latest_message: optimisticMessage,
                last_message_at: new Date().toISOString(),
              }
            : c
        )
      );
    }

    try {
      let res;
      if (currentFiles.length > 0) {
        const formData = new FormData();
        if (text) formData.append("message", text);
        currentFiles.forEach((sf) => {
          formData.append("attachments[]", sf.file);
        });
        res = await api.post(`/direct-chat/conversations/${targetConvId}/messages`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post(`/direct-chat/conversations/${targetConvId}/messages`, {
          message: text,
        });
      }

      if (res.data?.status === "success") {
        const serverMsg = res.data.data;
        knownMessageIdsRef.current.add(serverMsg.id);

        currentFiles.forEach((sf) => {
          if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
        });

        setMessages((prev) => {
          const next = prev.map((m) => (m.id === tempId ? { ...serverMsg, status: "sent" as const } : m));
          messagesCacheRef.current[targetConvId] = next;
          return next;
        });

        fetchConversations(false);
      }
    } catch (err: any) {
      console.error("Failed to send message", err);
      const errTxt = err.response?.data?.message || "Failed to send message. Click to retry.";
      setErrorMessage(errTxt);
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? { ...m, status: "error" as const } : m));
        messagesCacheRef.current[targetConvId] = next;
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.other_user?.name || c.title || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      style={{
        fontFamily: '"Google Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[calc(100dvh-175px)] w-full max-w-full select-text"
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
          ERROR TOAST BANNER
      ───────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 hover:bg-rose-700 rounded-full p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          WHATSAPP-STYLE CHATS LIST (Left on desktop, Full screen on mobile)
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`w-full md:w-80 lg:w-92 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-slate-900 overflow-x-hidden ${
          activeConversationId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* WhatsApp Mobile/Desktop Top Header */}
        <div className="p-3.5 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-[#f0f2f5] dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#56348f]/15 text-[#56348f] dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Chats
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#56348f] hover:bg-[#452875] text-white rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Mobile Push Notification Alert Status & Instant Test Button */}
        <div className="px-3.5 py-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-slate-800 dark:to-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🔔</span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-purple-950 dark:text-purple-200 leading-tight truncate">
                Mobile Push Alerts
              </p>
              <p className="text-[10px] text-purple-700 dark:text-purple-400 font-medium truncate">
                {permissionStatus === "granted"
                  ? "Active • Ready on your phone"
                  : permissionStatus === "denied"
                  ? "Blocked in browser settings"
                  : permissionStatus === "unsupported"
                  ? "iPhone: Add to Home Screen"
                  : "Tap to enable on phone"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={permissionStatus === "granted" ? sendTestNotification : requestNotificationPermission}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all shadow-xs cursor-pointer active:scale-95 ${
              permissionStatus === "granted"
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-amber-400 hover:bg-amber-300 text-slate-950"
            }`}
          >
            {permissionStatus === "granted" ? "Send Test Alert" : "Turn On"}
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 px-3 border-b border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f0f2f5] dark:bg-slate-800 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* WhatsApp Style Conversation Rows */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60 overflow-x-hidden">
          {loadingConversations ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <User className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No chats found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Start messaging any colleague in your team.</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 px-4 py-2 bg-[#56348f] hover:bg-[#452875] text-white rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
                    timeStr = format(date, "d/M/yy");
                  }
                } catch (e) {
                  timeStr = "";
                }
              }

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer border-l-4 ${
                    isActive
                      ? "bg-[#f0f2f5] dark:bg-slate-800/80 border-[#56348f]"
                      : "hover:bg-[#f5f6f6] dark:hover:bg-slate-800/40 border-transparent"
                  }`}
                >
                    <div className="relative shrink-0">
                      <RoyalAvatar
                        src={other?.profile_photo_path}
                        name={other?.name || "User"}
                        userId={other?.id}
                        className="w-12 h-12 rounded-full text-xs shadow-2xs"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          other?.is_online ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        title={other?.is_online ? "Online" : "Offline"}
                      />
                    </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <RoyalName
                        name={other?.name || conv.title}
                        userId={other?.id}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                      />
                      {timeStr && (
                        <span
                          className={`text-[11px] shrink-0 font-normal ${
                            hasUnread ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400"
                          }`}
                        >
                          {timeStr}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate [overflow-wrap:anywhere] ${hasUnread ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                        {latest?.message ? (
                          latest.message
                        ) : latest?.attachments?.length ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">📎 Photo / Attachment</span>
                        ) : (
                          <span className="italic text-slate-400">Tap to start chatting</span>
                        )}
                      </p>

                      {hasUnread && (
                        <span className="shrink-0 bg-emerald-500 text-white text-[10.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[19px] text-center shadow-xs">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          GOOGLE CHAT STYLE ACTIVE CHAT SCREEN (FIXED HEADER & COMPOSER, SCROLLABLE STREAM)
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0b141a] min-w-0 h-full overflow-hidden ${
          !activeConversationId ? "hidden md:flex" : "flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Pinned Top Header Bar */}
            <div className="p-3 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 shrink-0 z-10 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer shrink-0 transition-colors"
                  title="Back to all chats"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <RoyalAvatar
                    src={activeConversation.other_user?.profile_photo_path}
                    name={activeConversation.other_user?.name || "User"}
                    userId={activeConversation.other_user?.id}
                    className="w-10 h-10 rounded-full shadow-2xs"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      activeConversation.other_user?.is_online ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    title={activeConversation.other_user?.is_online ? "Online" : "Offline"}
                  />
                </div>

                <div className="min-w-0">
                  <RoyalName
                    name={activeConversation.other_user?.name || activeConversation.title}
                    userId={activeConversation.other_user?.id}
                    className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block leading-tight"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] truncate mt-0.5">
                    {activeConversation.other_user?.is_online ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Offline
                      </span>
                    )}
                    {activeConversation.other_user?.designation && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          {activeConversation.other_user.designation}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Chat Style Messages Stream (ONLY this section scrolls) */}
            <div ref={chatStreamRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 custom-scrollbar space-y-3 overflow-x-hidden">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 text-[#56348f] dark:text-purple-300 flex items-center justify-center mb-2.5 shadow-sm">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Chat with {activeConversation.other_user?.first_name || "colleague"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                    Messages and attachments are private between you two.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;

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
                      className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative rounded-2xl p-2.5 px-3.5 shadow-xs max-w-[85%] sm:max-w-[72%] min-w-[80px] break-words [overflow-wrap:anywhere] ${
                          isMe
                            ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] rounded-tr-xs"
                            : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] rounded-tl-xs"
                        }`}
                      >
                        {/* Message Text */}
                        {msg.message && (
                          <p className="text-xs sm:text-[13.5px] leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        )}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`space-y-1.5 ${msg.message ? "mt-2" : ""}`}>
                            {msg.attachments.map((att, attIdx) => {
                              const isImg = att.file_type?.startsWith("image/") || att.original_name.match(/\.(png|jpe?g|gif|webp|svg)$/i);

                              if (isImg) {
                                return (
                                  <div key={att.id || attIdx} className="relative overflow-hidden rounded-xl max-w-sm border border-black/10 dark:border-white/10">
                                    <img
                                      src={att.file_url}
                                      alt={att.original_name}
                                      onClick={() => setPreviewImage(att.file_url)}
                                      className="max-h-60 w-auto rounded-xl object-cover bg-black/5 cursor-pointer hover:opacity-95"
                                    />
                                    {isSending && (
                                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
                                        <Clock className="w-4 h-4 animate-spin" />
                                        <span>Sending...</span>
                                      </div>
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
                                  className="flex items-center gap-2.5 p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-xl text-xs transition-colors"
                                >
                                  <FileText className="w-4 h-4 text-[#56348f] shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-xs">{att.original_name}</p>
                                    <p className="text-[10px] opacity-70">{formatFileSize(att.file_size)}</p>
                                  </div>
                                  <Download className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {/* Timestamp & Status ticks at bottom right */}
                        <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 text-[10px] opacity-60 select-none">
                          <span>{msgTime}</span>
                          {isMe && (
                            <span>
                              {isSending ? (
                                <Clock className="w-3 h-3 animate-spin inline text-slate-400" />
                              ) : isError ? (
                                <button
                                  onClick={() => handleSendMessage(msg)}
                                  className="text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                >
                                  Retry <RotateCw className="w-2.5 h-2.5" />
                                </button>
                              ) : msg.is_read ? (
                                <span title="Read" className="inline-flex items-center">
                                  <CheckCheck className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8] inline stroke-[2.5]" />
                                </span>
                              ) : (
                                <span title="Delivered" className="inline-flex items-center">
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 inline stroke-[2]" />
                                </span>
                              )}
                            </span>
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
              <div className="px-3.5 py-2 bg-[#f0f2f5] dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2.5 overflow-x-auto custom-scrollbar shrink-0">
                {stagedFiles.map((sf, idx) => (
                  <div
                    key={idx}
                    className="relative group shrink-0 w-14 h-14 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white flex items-center justify-center shadow-xs"
                  >
                    {sf.isImage ? (
                      <img src={sf.previewUrl} alt="Staged screenshot" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-400" />
                    )}
                    <button
                      onClick={() => handleRemoveStagedFile(idx)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 text-white rounded-full hover:bg-black transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <span className="text-xs text-slate-500 font-medium truncate">
                  {stagedFiles.length} file(s) attached (Max 5 MB)
                </span>
              </div>
            )}

            {/* Fixed Bottom Input Composer (Google Chat Style - Pinned at bottom) */}
            <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0 z-10">
              <div className="flex items-end gap-2 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl p-2 px-3 border border-slate-200 dark:border-slate-700 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-purple-300 dark:focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                {/* Attachment Picker */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-slate-500 hover:text-[#56348f] dark:hover:text-purple-400 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700 transition cursor-pointer mb-0.5 shrink-0"
                  title="Attach photo or document (< 5 MB)"
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

                {/* Message Input Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  placeholder="Type a message... (Ctrl+V for screenshot, Enter to send)"
                  className="w-full bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 py-1.5 max-h-32 custom-scrollbar leading-relaxed"
                />

                {/* Send Button */}
                <button
                  type="button"
                  disabled={!inputMessage.trim() && stagedFiles.length === 0}
                  onClick={() => handleSendMessage()}
                  className="w-9 h-9 bg-[#56348f] hover:bg-[#432770] disabled:opacity-30 disabled:hover:bg-[#56348f] text-white rounded-full flex items-center justify-center shadow-xs transition-all shrink-0 cursor-pointer active:scale-95 mb-0.5"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-gradient-to-tr from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900">
            {/* Background Ambient Soft Circles matching design */}
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-200/30 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-100/30 dark:bg-indigo-950/10 rounded-full blur-2xl pointer-events-none" />

            {/* Overlapping Chat Bubbles Illustration (Matching Screenshot 5) */}
            <div className="relative w-24 h-20 mb-5 flex items-center justify-center select-none z-10">
              {/* Back Chat Bubble */}
              <div className="absolute top-1 right-2 w-14 h-12 bg-purple-300/40 dark:bg-purple-700/30 rounded-2xl rounded-br-sm shadow-xs" />
              
              {/* Floating little sparkles */}
              <div className="absolute -top-1 left-2 w-2 h-2 rounded-full bg-purple-400/60 animate-pulse" />
              <div className="absolute bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
              <div className="absolute -top-2 right-0 text-purple-400 text-xs">✦</div>

              {/* Front Main Chat Bubble */}
              <div className="relative z-10 w-16 h-13 bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100 dark:from-purple-900/60 dark:to-slate-800 rounded-2xl rounded-bl-sm shadow-md border border-purple-200/60 dark:border-purple-700/40 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#56348f] dark:text-purple-300" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 relative z-10">
              InterSmart Direct Chat
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed relative z-10">
              Select a conversation to start chatting, or click New Chat to message a colleague.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-5 px-6 py-2.5 bg-[#56348f] hover:bg-[#452875] text-white rounded-full text-xs font-bold shadow-md shadow-[#56348f]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2 relative z-10"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Start New Chat</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: NEW CHAT / INSTANT SEARCH COLLEAGUE
      ───────────────────────────────────────────────────────────── */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
            <div className="p-4 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#56348f]/10 text-[#56348f] dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    New Chat
                  </h3>
                  <p className="text-[11px] text-slate-400">Select an employee to message</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 px-5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  autoFocus
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search name, email, or department..."
                  className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-100"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery("")}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1">
              {loadingColleagues && allColleagues.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading directory...</div>
              ) : filteredColleagues.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {userSearchQuery ? `No employees found matching "${userSearchQuery}".` : "No colleagues found."}
                </div>
              ) : (
                filteredColleagues.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => handleStartChatWithUser(usr)}
                    className="w-full text-left p-2.5 rounded-2xl flex items-center justify-between hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
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
                          className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block group-hover:text-[#56348f] transition-colors"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {usr.designation || "Employee"} • {usr.department || usr.email}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] transition-colors" />
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
