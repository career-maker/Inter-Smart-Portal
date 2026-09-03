"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";

interface LatestMessage {
  id: number | string;
  sender_name: string;
  message: string;
  conversation_id: number;
  created_at?: string;
}

interface UnreadResponse {
  status: string;
  unread_count: number;
  latest_conversation_id?: number | null;
  latest_message?: LatestMessage | null;
}

export function useChatPushNotifications() {
  const user = useAuthStore((state) => state.user);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [latestConversationId, setLatestConversationId] = useState<number | null>(null);
  const lastNotifiedMsgIdRef = useRef<number | string | null>(null);
  const isFirstCheckRef = useRef<boolean>(true);

  // Play subtle web audio notification chime
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Show native mobile notification in phone's notification shade
  const triggerMobileNotification = useCallback(
    async (msg: LatestMessage) => {
      const title = `${msg.sender_name} on InterSmart`;
      const body = msg.message || "Sent you a message";
      const targetUrl = `/community?tab=chat&conversationId=${msg.conversation_id}`;

      // 1. Try Service Worker (Required for Android & iOS Mobile Notification Shade)
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration && "showNotification" in registration) {
            await registration.showNotification(title, {
              body,
              icon: "/logo.png",
              badge: "/logo.png",
              tag: `chat_${msg.conversation_id}_${msg.id}`,
              vibrate: [200, 100, 200],
              renotify: true,
              data: { url: targetUrl },
            } as any);
            playChime();
            return;
          }
        } catch (swErr) {
          console.warn("ServiceWorker push notification error:", swErr);
        }
      }

      // 2. Fallback to standard Notification API
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const notif = new Notification(title, {
            body,
            icon: "/logo.png",
            tag: `chat_${msg.conversation_id}_${msg.id}`,
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = targetUrl;
            notif.close();
          };
          playChime();
        } catch (notifErr) {
          console.warn("Standard notification error:", notifErr);
        }
      }
    },
    [playChime]
  );

  // Initialize Service Worker & Request Notification Permission for Logged-in Users
  useEffect(() => {
    if (!user) return;

    // Register Service Worker for mobile notification shade handling
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW register error:", err));
    }

    // Request notification permission if not yet granted/denied
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [user]);

  // Poll for unread chat count & incoming messages
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      setLatestConversationId(null);
      return;
    }

    const checkUnread = async () => {
      try {
        const res = await api.get<UnreadResponse>(`/direct-chat/unread-count?t=${Date.now()}`);
        if (res.data?.status === "success") {
          const count = res.data.unread_count || 0;
          const convId = res.data.latest_conversation_id || null;
          const latestMsg = res.data.latest_message || null;

          setUnreadChatCount(count);
          setLatestConversationId(convId);

          // If a new message arrived
          if (latestMsg) {
            if (isFirstCheckRef.current) {
              // Initial load - don't spam old notifications
              lastNotifiedMsgIdRef.current = latestMsg.id;
              isFirstCheckRef.current = false;
            } else if (lastNotifiedMsgIdRef.current !== latestMsg.id) {
              lastNotifiedMsgIdRef.current = latestMsg.id;

              // Don't show notification if user is already looking at this exact chat tab
              const isLookingAtChat =
                typeof window !== "undefined" &&
                window.location.pathname.includes("/community") &&
                window.location.search.includes("tab=chat") &&
                document.visibilityState === "visible";

              if (!isLookingAtChat) {
                triggerMobileNotification(latestMsg);
              }
            }
          }
        }
      } catch {
        // Silently catch background poll error
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [user, triggerMobileNotification]);

  return {
    unreadChatCount,
    latestConversationId,
  };
}
