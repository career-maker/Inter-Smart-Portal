"use client";

import Link from "next/link";
import { format, isToday } from "date-fns";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Gift,
  Info,
  Laptop,
  Leaf,
  Plus,
  Sun,
} from "lucide-react";
import { RoyalAvatar } from "@/components/ui/RoyalAvatar";
import type { CalendarEvent, UpcomingDay, UpcomingItem } from "./types";
import {
  comparePeopleEvents,
  eventBadge,
  formatEventRange,
  isCompanyHoliday,
  isPeopleEvent,
  isWeekendEvent,
  isWfhEvent,
} from "./utils";

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900";

/* ── Event Types legend ────────────────────────────────────────────── */

const LEGEND = [
  { label: "Company Holiday", dot: "bg-rose-600" },
  { label: "Weekend", dot: "bg-rose-200 dark:bg-rose-300" },
  { label: "Leave", dot: "bg-emerald-500" },
  { label: "Work From Home", dot: "bg-sky-500" },
  { label: "Working Day", dot: "bg-violet-500" },
];

export function EventTypesCard() {
  return (
    <div className={cardClass}>
      <h3 className="text-base font-extrabold text-[#0B1F4B] dark:text-white">Event Types</h3>
      <ul className="mt-4 space-y-3">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.dot}`} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Upcoming (Next 7 Days) ────────────────────────────────────────── */

const PILL: Record<UpcomingItem["kind"], { label: string; className: string }> = {
  holiday: { label: "Holiday", className: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" },
  weekend: { label: "Weekend", className: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" },
  leave: { label: "Leave", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  wfh: { label: "WFH", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
};

export function UpcomingCard({ days }: { days: UpcomingDay[] }) {
  return (
    <div className={cardClass}>
      <h3 className="flex items-center gap-2 text-base font-extrabold text-[#0B1F4B] dark:text-white">
        <CalendarIcon className="portal-accent-text h-4 w-4" />
        Upcoming (Next 7 Days)
      </h3>

      {days.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-slate-400">
          Nothing scheduled — regular working days ahead.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {days.map(({ date, items, more }) => {
            const offDay = items.some((i) => i.kind === "holiday" || i.kind === "weekend");
            return (
              <div key={date.toISOString()} className="flex items-start gap-3">
                <div
                  className={`w-12 shrink-0 rounded-xl border py-1.5 text-center ${
                    offDay
                      ? "border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
                      : "portal-accent-tint portal-accent-border portal-accent-text"
                  }`}
                >
                  <div className="text-lg font-extrabold leading-none">{format(date, "d")}</div>
                  <div className="mt-0.5 text-[10px] font-semibold opacity-80">{format(date, "MMM")}</div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                  {items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.label}
                        {isToday(date) && item === items[0] && (
                          <span className="portal-accent-text ml-1.5 text-[10px] font-bold uppercase">Today</span>
                        )}
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${PILL[item.kind].className}`}>
                        {PILL[item.kind].label}
                      </span>
                    </div>
                  ))}
                  {more > 0 && <p className="text-xs font-semibold text-slate-400">+{more} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/leaves"
        className="portal-accent-tint portal-accent-border portal-accent-text portal-focus mt-5 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-colors hover:brightness-95"
      >
        View Full Leave List
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ── Selected day details (Month view) ─────────────────────────────── */

function eventIcon(ev: CalendarEvent) {
  if (isCompanyHoliday(ev)) return <Gift className="h-4 w-4 text-rose-500" />;
  if (isWeekendEvent(ev)) return <CalendarIcon className="h-4 w-4 text-violet-500" />;
  if (isWfhEvent(ev)) return <Laptop className="h-4 w-4 text-sky-600" />;
  return <Leaf className="h-4 w-4 text-emerald-600" />;
}

export function DayDetailsCard({
  date,
  events,
  isTeamView,
}: {
  date: Date;
  events: CalendarEvent[];
  isTeamView: boolean;
}) {
  // Holidays/weekends first, then people (you first)
  const sorted = [...events].sort((a, b) => {
    const aPeople = isPeopleEvent(a);
    if (aPeople !== isPeopleEvent(b)) return aPeople ? 1 : -1;
    return comparePeopleEvents(a, b);
  });

  return (
    <div className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-[#0B1F4B] dark:text-white">
          <CalendarIcon className="portal-accent-text h-5 w-5" />
          Events on {format(date, "EEEE, dd MMMM yyyy")}
        </h3>
        {isToday(date) && (
          <span className="portal-accent-tint-strong portal-accent-text rounded-full px-2.5 py-0.5 text-xs font-bold">
            Today
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="py-1 text-sm font-medium text-slate-400">
          Regular working day. No leaves, WFH, or company holidays scheduled for this date.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sorted.map((ev) => {
            const badge = eventBadge(ev);
            const person = isTeamView && isPeopleEvent(ev) ? ev.user : null;
            const title = isWeekendEvent(ev) ? format(date, "EEEE") : ev.title;
            return (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {person ? (
                    <RoyalAvatar
                      src={person.profile_photo_path}
                      name={person.name}
                      userId={person.id}
                      className="h-9 w-9 shrink-0 rounded-full border border-slate-200 text-xs dark:border-slate-700"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                      {eventIcon(ev)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {person ? `${person.name}${person.is_self ? " (You)" : ""}` : title}
                    </p>
                    {person && (
                      <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {ev.title}
                        {person.designation ? ` · ${person.designation}` : ""}
                      </p>
                    )}
                    {isPeopleEvent(ev) && (
                      <p className="text-xs text-slate-400">{formatEventRange(ev)}</p>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Bottom banner + quote ─────────────────────────────────────────── */

export function ApplyLeaveBanner() {
  return (
    <div className="portal-accent-tint portal-accent-border flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 pl-5">
      <div className="flex items-center gap-4">
        <div className="portal-accent-solid flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <p className="portal-accent-text text-sm font-extrabold">Need to apply for leave?</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Go to Leaves &amp; WFH to submit a new request.
          </p>
        </div>
      </div>
      <Link
        href="/leaves/apply"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        Apply Leave
      </Link>
    </div>
  );
}

export function QuoteCard() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
      <Sun className="h-9 w-9 shrink-0 text-amber-500" />
      <p className="text-sm font-medium leading-snug text-slate-600 dark:text-slate-300">
        A well-rested team
        <br />
        builds extraordinary things.
      </p>
    </div>
  );
}
