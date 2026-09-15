"use client";

import React, { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

export function AddToHomeScreenModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      return;
    }

    // 2. Check if mobile or tablet device
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const isSmallScreen = window.innerWidth < 1024;
    const isMobileOrTablet = isMobileUA || isIPad || (isSmallScreen && navigator.maxTouchPoints > 0);

    if (!isMobileOrTablet) {
      return;
    }

    // 3. Detect iOS / iPadOS Safari
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) || isIPad;
    setIsIOS(isAppleDevice);

    // 4. Capture beforeinstallprompt for Android Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Check dismissal cache (dismissed within the last 7 days)
    const dismissedAt = localStorage.getItem("pwa_home_prompt_dismissed");
    if (dismissedAt) {
      const pastTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - pastTime < sevenDays) {
        return () => {
          window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
      }
    }

    // Show after slight delay so it smoothly slides up
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("pwa_home_prompt_dismissed", Date.now().toString());
    }
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      handleClose();
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl p-6 sm:p-7 pt-7 shadow-2xl relative animate-in slide-in-from-bottom duration-300 border border-slate-200/80 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button matching screenshot */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Center Icon: Peach/Orange circle with iOS Share Icon or Install Icon */}
        <div className="w-16 h-16 rounded-full bg-[#fff4ed] dark:bg-orange-950/40 text-[#f97316] flex items-center justify-center mx-auto mb-4 shadow-xs">
          {isIOS ? (
            <svg
              className="w-7 h-7 text-[#f97316]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          ) : (
            <Download className="w-7 h-7 text-[#f97316]" />
          )}
        </div>

        {/* Centered Heading */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-6">
          Add to Home Screen
        </h3>

        {/* Instructions matching screenshot */}
        <ol className="space-y-3.5 text-[15px] sm:text-base text-slate-700 dark:text-slate-300 font-medium max-w-xs mx-auto mb-6">
          {isIOS ? (
            <>
              <li className="flex items-start">
                <span className="text-[#f97316] font-bold mr-2 shrink-0">1.</span>
                <span>
                  Tap the <strong className="font-bold text-slate-900 dark:text-white">Share</strong> button in Safari&apos;s toolbar
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#f97316] font-bold mr-2 shrink-0">2.</span>
                <span>
                  Scroll and tap <strong className="font-bold text-slate-900 dark:text-white">Add to Home Screen</strong>
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#f97316] font-bold mr-2 shrink-0">3.</span>
                <span>
                  Tap <strong className="font-bold text-slate-900 dark:text-white">Add</strong> to confirm
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start">
                <span className="text-[#f97316] font-bold mr-2 shrink-0">1.</span>
                <span>
                  Tap the <strong className="font-bold text-slate-900 dark:text-white">Menu (⋮)</strong> in Chrome&apos;s toolbar
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#f97316] font-bold mr-2 shrink-0">2.</span>
                <span>
                  Tap <strong className="font-bold text-slate-900 dark:text-white">Add to Home screen</strong> or <strong className="font-bold text-slate-900 dark:text-white">Install app</strong>
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-[#f97316] font-bold mr-2 shrink-0">3.</span>
                <span>
                  Tap <strong className="font-bold text-slate-900 dark:text-white">Install</strong> to confirm
                </span>
              </li>
            </>
          )}
        </ol>

        {/* Optional Direct Install Action for Android Chrome if beforeinstallprompt available */}
        {!isIOS && deferredPrompt && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={handleNativeInstall}
              className="w-full max-w-xs bg-[#f97316] hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Install InterSmart App
            </button>
          </div>
        )}

        {/* Footer Text matching screenshot */}
        <p className="text-xs sm:text-[13px] text-slate-400 dark:text-slate-500 text-center font-normal mt-2">
          Open InterSmart from your home screen for the full experience.
        </p>
      </div>
    </div>
  );
}
