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
  const [permissionStatus, setPermissionStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  
  const lastNotifiedMsgIdRef = useRef<number | string | null>(null);
  const isFirstCheckRef = useRef<boolean>(true);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Check current notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
    } else if (typeof window !== "undefined") {
      setPermissionStatus("unsupported");
    }
  }, []);

  // Register Service Worker reliably
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          swRegRef.current = reg;
        })
        .catch((err) => {
          console.warn("ServiceWorker registration error:", err);
        });
    }
  }, []);

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

  // Trigger native mobile notification in phone's notification shade
  const triggerMobileNotification = useCallback(
    async (title: string, body: string, targetUrl: string, tagId?: string) => {
      const tag = tagId || `msg_${Date.now()}`;

      // 1. Try Service Worker (Mandatory for Android & iOS Mobile Notification Area)
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          let reg = swRegRef.current;
          if (!reg) {
            reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
            swRegRef.current = reg;
          }

          if (reg && "showNotification" in reg) {
            await reg.showNotification(title, {
              body,
              icon: "/logo.png",
              badge: "/logo.png",
              tag,
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
            tag,
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = targetUrl;
            notif.close();
          };
          playChime();
        } catch (notifErr) {
          console.warn("Standard notification fallback error:", notifErr);
        }
      }
    },
    [playChime]
  );

  // Explicit user-gesture permission requester with immediate test notification
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are not supported by this mobile browser.");
      return "unsupported";
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);

      if (result === "granted") {
        // Send immediate test notification to confirm it shows in phone's notification area!
        triggerMobileNotification(
          "Inter Smart Portal",
          "🎉 Notifications enabled! You will now receive alerts for new chats on your phone.",
          "/community?tab=chat"
        );
      }
      return result;
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return "denied";
    }
  }, [triggerMobileNotification]);

  // Explicit test notification trigger
  const sendTestNotification = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are not supported in this browser. On iPhone, add to Home Screen first.");
      return;
    }

    if (Notification.permission !== "granted") {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      if (result !== "granted") {
        alert("Notifications permission was denied. Please allow notifications in site settings.");
        return;
      }
    }

    await triggerMobileNotification(
      "Inter Smart Portal",
      "🔔 Test notification! Chat alerts will appear right here in your phone notification shade.",
      "/community?tab=chat"
    );
  }, [triggerMobileNotification]);

  // Poll for unread chat count & incoming messages
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      setLatestConversationId(null);
      return;
    }

    const checkUnread = async () => {
      try {
        // 1. Try high-speed unread-count endpoint
        try {
          const res = await api.get<UnreadResponse>(`/direct-chat/unread-count?t=${Date.now()}`);
          if (res.data?.status === "success") {
            const count = res.data.unread_count || 0;
            const convId = res.data.latest_conversation_id || null;
            const latestMsg = res.data.latest_message || null;

            setUnreadChatCount(count);
            setLatestConversationId(convId);

            if (latestMsg) {
              if (isFirstCheckRef.current) {
                lastNotifiedMsgIdRef.current = latestMsg.id;
                isFirstCheckRef.current = false;
              } else if (lastNotifiedMsgIdRef.current !== latestMsg.id) {
                lastNotifiedMsgIdRef.current = latestMsg.id;

                const isLookingAtChat =
                  typeof window !== "undefined" &&
                  window.location.pathname.includes("/community") &&
                  window.location.search.includes("tab=chat") &&
                  document.visibilityState === "visible";

                if (!isLookingAtChat) {
                  triggerMobileNotification(
                    `${latestMsg.sender_name} on InterSmart`,
                    latestMsg.message || "Sent you a message",
                    `/community?tab=chat&conversationId=${latestMsg.conversation_id}`,
                    `chat_${latestMsg.conversation_id}_${latestMsg.id}`
                  );
                }
              }
            }
            return;
          }
        } catch {
          // If unread-count is not yet deployed on server, fall back to /direct-chat/conversations
        }

        // 2. Reliable fallback using standard conversations list
        const convsRes = await api.get(`/direct-chat/conversations?t=${Date.now()}`);
        if (convsRes.data?.status === "success") {
          const convList = convsRes.data.data || [];
          let total = 0;
          let firstUnreadConvId: number | null = null;
          let newestMsg: any = null;

          for (const c of convList) {
            if (c.unread_count > 0) {
              total += c.unread_count;
              if (!firstUnreadConvId) firstUnreadConvId = c.id;
              if (c.latest_message && (!newestMsg || c.latest_message.id > newestMsg.id)) {
                newestMsg = c.latest_message;
              }
            }
          }

          setUnreadChatCount(total);
          setLatestConversationId(firstUnreadConvId);

          if (newestMsg) {
            if (isFirstCheckRef.current) {
              lastNotifiedMsgIdRef.current = newestMsg.id;
              isFirstCheckRef.current = false;
            } else if (lastNotifiedMsgIdRef.current !== newestMsg.id) {
              lastNotifiedMsgIdRef.current = newestMsg.id;

              const isLookingAtChat =
                typeof window !== "undefined" &&
                window.location.pathname.includes("/community") &&
                window.location.search.includes("tab=chat") &&
                document.visibilityState === "visible";

              if (!isLookingAtChat) {
                const sender = newestMsg.sender?.name || "Colleague";
                triggerMobileNotification(
                  `${sender} on InterSmart`,
                  newestMsg.message || "Sent you a message",
                  `/community?tab=chat&conversationId=${newestMsg.conversation_id}`,
                  `chat_${newestMsg.conversation_id}_${newestMsg.id}`
                );
              }
            }
          }
        }
      } catch {
        // Silently catch background poll error
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 6000); // Check every 6 seconds

    return () => clearInterval(interval);
  }, [user, triggerMobileNotification]);

  return {
    unreadChatCount,
    latestConversationId,
    permissionStatus,
    requestNotificationPermission,
    sendTestNotification,
  };
}
