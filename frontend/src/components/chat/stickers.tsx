"use client";

import React from "react";

/**
 * Built-in sticker pack. A sticker message stores only its id (server validates /^st_[a-z0-9_]+$/),
 * and every client renders it from this catalogue, so no image files are needed.
 */
export interface Sticker {
  id: string;
  emoji: string;
  label: string;
  bg: string; // tailwind-free colour so it renders the same everywhere
}

export const STICKERS: Sticker[] = [
  { id: "st_thanks", emoji: "🙏", label: "Thank you!", bg: "#FEF3C7" },
  { id: "st_great", emoji: "👏", label: "Great job!", bg: "#DCFCE7" },
  { id: "st_ontime", emoji: "⏰", label: "On it!", bg: "#DBEAFE" },
  { id: "st_done", emoji: "✅", label: "Done", bg: "#D1FAE5" },
  { id: "st_ok", emoji: "👍", label: "Okay", bg: "#E0F2FE" },
  { id: "st_lol", emoji: "😂", label: "LOL", bg: "#FEF9C3" },
  { id: "st_love", emoji: "😍", label: "Love it", bg: "#FFE4E6" },
  { id: "st_wow", emoji: "🤩", label: "Wow!", bg: "#FAE8FF" },
  { id: "st_party", emoji: "🎉", label: "Congrats!", bg: "#FCE7F3" },
  { id: "st_cake", emoji: "🎂", label: "Happy birthday", bg: "#FFEDD5" },
  { id: "st_coffee", emoji: "☕", label: "Coffee?", bg: "#F5E6D3" },
  { id: "st_lunch", emoji: "🍽️", label: "Lunch time", bg: "#FEE2E2" },
  { id: "st_sorry", emoji: "🙇", label: "Sorry!", bg: "#EDE9FE" },
  { id: "st_think", emoji: "🤔", label: "Thinking", bg: "#F1F5F9" },
  { id: "st_busy", emoji: "🧑‍💻", label: "Busy now", bg: "#E0E7FF" },
  { id: "st_late", emoji: "🏃", label: "Running late", bg: "#FFEDD5" },
  { id: "st_home", emoji: "🏠", label: "Working from home", bg: "#CCFBF1" },
  { id: "st_leave", emoji: "🌴", label: "On leave", bg: "#D9F99D" },
  { id: "st_meeting", emoji: "📅", label: "In a meeting", bg: "#DBEAFE" },
  { id: "st_call", emoji: "📞", label: "Call me", bg: "#DCFCE7" },
  { id: "st_cheers", emoji: "🥂", label: "Cheers!", bg: "#FEF3C7" },
  { id: "st_fire", emoji: "🔥", label: "On fire", bg: "#FFE4E6" },
  { id: "st_star", emoji: "⭐", label: "Star performer", bg: "#FEF9C3" },
  { id: "st_bye", emoji: "👋", label: "Bye!", bg: "#E0F2FE" },
];

const BY_ID: Record<string, Sticker> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export function stickerLabel(id?: string | null): string {
  return (id && BY_ID[id]?.label) || "Sticker";
}

/** A sticker as drawn inside a chat bubble (or in the picker when size is small). */
export function StickerView({ id, small = false }: { id?: string | null; small?: boolean }) {
  const s = id ? BY_ID[id] : undefined;
  if (!s) return <span className="text-xs italic opacity-70">Sticker</span>;
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl select-none ${small ? "w-full aspect-square p-1" : "w-32 h-32 p-2 shadow-sm"}`}
      style={{ background: s.bg, color: "#1e293b" }}
      title={s.label}
    >
      <span className={small ? "text-3xl leading-none" : "text-5xl leading-none"}>{s.emoji}</span>
      <span className={`font-extrabold text-center leading-tight mt-1 ${small ? "text-[9px]" : "text-[12px]"}`}>{s.label}</span>
    </div>
  );
}

export function StickerPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  return (
    <div
      className="absolute bottom-full mb-2 left-2 sm:left-4 z-40 w-[290px] sm:w-[340px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      role="dialog"
      aria-label="Stickers"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Stickers</span>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Close stickers">
          Close
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 p-2.5 max-h-[230px] overflow-y-auto custom-scrollbar">
        {STICKERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            className="rounded-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            aria-label={`Send sticker: ${s.label}`}
          >
            <StickerView id={s.id} small />
          </button>
        ))}
      </div>
    </div>
  );
}
