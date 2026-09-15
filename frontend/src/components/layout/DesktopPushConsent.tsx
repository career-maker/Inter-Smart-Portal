"use client";

import React, { useEffect, useState } from "react";
import { Bell, X, CheckCircle2 } from "lucide-react";
import { useChatPushNotifications } from "@/hooks/useChatPushNotifications";

export function DesktopPushConsent() {
  const { permissionStatus, requestNotificationPermission } = useChatPushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Only show on Desktop (screen width >= 1024px and not mobile touch user agent)
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const isDesktop = window.innerWidth >= 1024 && !isMobileUA && !isIPad;

    if (!isDesktop) {
      return;
    }

    // 2. Check if browser supports notifications
    if (!("Notification" in window)) {
      return;
    }

    // 3. If notifications are already granted or previously configured on this browser, NEVER show
    if (Notification.permission === "granted") {
      localStorage.setItem("desktop_push_configured", "true");
      return;
    }

    const isAlreadyConfigured = localStorage.getItem("desktop_push_configured") === "true";
    if (isAlreadyConfigured) {
      return;
    }

    // 4. If user dismissed on this browser, don't show
    const isDismissed = localStorage.getItem("desktop_push_dismissed") === "true";
    if (isDismissed) {
      return;
    }

    // 5. If explicitly denied at browser level, don't nag
    if (Notification.permission === "denied") {
      return;
    }

    // Delay slightly after load so it appears like a subtle cookie consent popup
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [permissionStatus]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("desktop_push_dismissed", "true");
    }
  };

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const result = await requestNotificationPermission();
      if (result === "granted") {
        // Once push notification is setup on browser, never show again on this browser
        if (typeof window !== "undefined") {
          localStorage.setItem("desktop_push_configured", "true");
        }
        setIsVisible(false);
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem("desktop_push_dismissed", "true");
        }
        setIsVisible(false);
      }
    } catch (err) {
      console.warn("Desktop notification permission error:", err);
      setIsVisible(false);
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Push Notification Consent"
      className="fixed bottom-5 right-5 z-50 w-[390px] max-w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-2xl p-4 sm:p-5 animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              Enable Push Notifications
            </h4>
            <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold mt-0.5">
              Instant Portal Updates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Dismiss notification alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
        Stay updated with real-time chat messages, attendance punch alerts, and leave approvals directly on your desktop.
      </p>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Later
        </button>
        <button
          type="button"
          onClick={handleEnable}
          disabled={isEnabling}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#56348f] hover:bg-purple-800 active:bg-purple-900 text-white shadow-md shadow-purple-900/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isEnabling ? "Enabling..." : "Enable Notifications"}
        </button>
      </div>
    </div>
  );
}
