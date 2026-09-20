"use client";

import { format, parseISO } from "date-fns";
import { BookOpen, Check, Clock, Lightbulb, Loader2 } from "lucide-react";

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900";

const GUIDELINES = [
  "WFH requests will be sent to your Team Lead and Super Admin for approval.",
  "Use WFH only for genuine work-from-home needs.",
  "Ensure you are available during working hours.",
  "Provide a clear reason for your request.",
];

export function GuidelinesCard() {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-3">
        <div className="portal-accent-tint-strong portal-accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-extrabold text-[#0B1F4B] dark:text-white">WFH Guidelines</h3>
      </div>
      <ul className="mt-5 space-y-4">
        {GUIDELINES.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="text-[15px] leading-snug text-slate-600 dark:text-slate-300">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NeedHelpCard() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-amber-200/80 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-500 dark:bg-amber-900/40">
        <Lightbulb className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-amber-800 dark:text-amber-300">Need Help?</h3>
        <p className="mt-1 text-[15px] leading-snug text-slate-600 dark:text-slate-300">
          For any clarifications, please reach out to HR or your Team Lead.
        </p>
      </div>
    </div>
  );
}

/* ── Recent requests ───────────────────────────────────────────────── */

export interface RecentWfhRequest {
  id: number;
  start_date: string;
  end_date?: string | null;
  duration_type?: string | null;
  status: string;
  tl_status?: string | null;
  admin_status?: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  Full: "Full Day",
  "Half-Morning": "Half Day (Morning)",
  "Half-Afternoon": "Half Day (Afternoon)",
};

function formatRequestDate(r: RecentWfhRequest) {
  try {
    const start = parseISO(r.start_date);
    if (!r.end_date || r.end_date === r.start_date) return format(start, "dd MMM yyyy");
    return `${format(start, "dd")} – ${format(parseISO(r.end_date), "dd MMM yyyy")}`;
  } catch {
    return r.start_date;
  }
}

function statusPill(r: RecentWfhRequest): { label: string; className: string; title?: string } {
  switch (r.status) {
    case "Approved":
      return { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
    case "Rejected":
      return { label: "Rejected", className: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" };
    case "Cancelled":
      return { label: "Cancelled", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };
    default: {
      const waitingOnTl = (r.tl_status || "").toLowerCase() === "pending";
      return {
        label: "Under Review",
        className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        title: waitingOnTl ? "Waiting for your Team Lead" : "Waiting for admin approval",
      };
    }
  }
}

interface RecentRequestsCardProps {
  /** null while loading */
  requests: RecentWfhRequest[] | null;
  onViewAll: () => void;
}

export function RecentRequestsCard({ requests, onViewAll }: RecentRequestsCardProps) {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="portal-accent-tint-strong portal-accent-text flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="text-base font-extrabold text-[#0B1F4B] dark:text-white">Your Recent WFH Requests</h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="portal-accent-text shrink-0 text-sm font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      <div className="mt-4">
        {requests === null ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm font-medium text-slate-400 dark:bg-slate-800/50">
            No WFH requests yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 px-3 dark:divide-slate-800 dark:bg-slate-800/40">
            {requests.map((r) => {
              const pill = statusPill(r);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatRequestDate(r)}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {TYPE_LABEL[r.duration_type || "Full"] ?? r.duration_type}
                    </p>
                  </div>
                  <span
                    title={pill.title}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${pill.className}`}
                  >
                    {pill.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
