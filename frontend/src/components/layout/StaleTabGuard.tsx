"use client";

import { useEffect } from "react";

// A tab left open for a long time can go dead (buttons and links stop responding) until it is
// refreshed: the site was redeployed so its old script files are gone, or the connection broke.
// Reload it ourselves when the person comes back after a long idle spell, and when a script file
// fails to load.
const IDLE_MS = 30 * 60 * 1000;
const CHUNK_ERROR = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch RSC payload/i;
const RELOAD_KEY = "stale-tab-reload-at";

function reloadOnce() {
  try {
    // Never loop: at most one automatic reload a minute.
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {}
  window.location.reload();
}

function typingInField() {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export default function StaleTabGuard() {
  useEffect(() => {
    let lastActive = Date.now();
    const touch = () => { lastActive = Date.now(); };
    const checkIdle = () => {
      // ponytail: skips the reload while a field has focus so a half-typed form is not lost
      if (document.visibilityState === "visible" && Date.now() - lastActive > IDLE_MS && !typingInField()) reloadOnce();
    };
    const onError = (e: ErrorEvent) => { if (CHUNK_ERROR.test(e.message || "")) reloadOnce(); };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: any = e.reason;
      if (CHUNK_ERROR.test(`${r?.name || ""} ${r?.message || r || ""}`)) reloadOnce();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((n) => window.addEventListener(n, touch, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", checkIdle);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const timer = setInterval(checkIdle, 60_000);
    return () => {
      events.forEach((n) => window.removeEventListener(n, touch, true));
      document.removeEventListener("visibilitychange", checkIdle);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearInterval(timer);
    };
  }, []);
  return null;
}
