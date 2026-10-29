"use client";

import { useEffect } from "react";

// Older screens use plain <button>s with no busy state, so a double click sends the request twice.
// Swallow a second click on the same action button inside this window. Steppers, pagination and
// carousel arrows have no action wording, so they stay instant.
const WINDOW_MS = 900;
const ACTION = /^\s*(save|submit|send|create|add|apply|approve|reject|delete|remove|confirm|update|upload|assign|publish|post|request|mark|pay|generate|import|export|schedule|invite|award|resolve|close|reopen|verify|take)\b/i;

export default function DoubleClickGuard() {
  useEffect(() => {
    const last = new WeakMap<Element, number>();
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.("button");
      if (!btn || btn.disabled) return;
      const isAction = btn.type === "submit" || ACTION.test(btn.textContent || "");
      if (!isAction) return;
      const now = Date.now();
      const prev = last.get(btn);
      if (prev && now - prev < WINDOW_MS) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      last.set(btn, now);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
