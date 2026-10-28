"use client";

/**
 * Clean screen kit (design rules in docs/roadmap/DESIGN.md):
 * plain text labels (no emoji), neutrals plus ONE accent (#1F5C4E), spacing only 4/8/16/24/32 (Tailwind 1, 2, 4, 6, 8),
 * four font sizes 12/14/20/32 (text-xs, text-sm, text-xl, text-[32px]), no shadows or glow (1px border, radius 12),
 * status = a 6px dot plus a word, rows 44px high, one clear primary action per area.
 */
import * as React from "react";

export const ACCENT = "#1F5C4E";
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

export function Page({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-[32px] leading-10 font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {hint && <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}{count !== undefined && <span className="ml-2 text-sm font-normal text-slate-500">{count}</span>}</h2>
      {children}
    </section>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 p-4", className)}>{children}</div>;
}

type Tone = "ok" | "warn" | "bad" | "neutral";
const DOT: Record<Tone, string> = { ok: "bg-[#1F5C4E]", warn: "bg-amber-600", bad: "bg-red-600", neutral: "bg-slate-400" };

/** Status: a 6px dot and a word. */
export function Dot({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><span className={cx("h-1.5 w-1.5 rounded-full shrink-0", DOT[tone])} />{children}</span>;
}

/** 44px row; rows inside a Panel with p-0 look like a clean list. */
export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("min-h-11 flex items-center gap-4 px-4 py-2 text-sm border-b border-slate-200 dark:border-white/10 last:border-0", className)}>{children}</div>;
}

export const field = "h-11 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-transparent px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1F5C4E]";
export const area = "w-full rounded-xl border border-slate-300 dark:border-white/15 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1F5C4E] min-h-24";

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block mb-1 text-xs text-slate-500">{children}</label>;
}

/** The one clear action of an area. */
export function Primary({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cx("h-11 px-4 rounded-xl bg-[#1F5C4E] text-white text-sm font-medium hover:bg-[#184a3e] disabled:opacity-40 disabled:cursor-not-allowed", p.className)}>{children}</button>;
}

/** Secondary actions are plain text, never a second filled button. */
export function Quiet({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cx("h-11 px-2 text-sm text-slate-600 dark:text-slate-300 underline-offset-4 hover:underline disabled:opacity-40", p.className)}>{children}</button>;
}

export function Alert({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm text-red-800 dark:text-red-200">{children}</div>;
}

export function Spinner() {
  return <div className="p-8 text-sm text-slate-500">Loading</div>;
}

export const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const errMsg = (e: any) =>
  (e?.response?.data?.errors ? (Object.values(e.response.data.errors as Record<string, string[]>)[0] as string[])?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
