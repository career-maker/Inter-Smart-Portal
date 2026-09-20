"use client";

import { CalendarCheck, Calendar as CalendarIcon, ChevronRight, Gift, Leaf } from "lucide-react";
import type { ListFilter, MonthStats } from "./types";
import { formatCount } from "./utils";

interface StatCardProps {
  value: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: string; // card gradient + border
  iconTone: string; // icon tile
  onClick: () => void;
}

function StatCard({ value, label, hint, icon, tone, iconTone, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`portal-focus group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-4 sm:pr-3 ${tone}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${iconTone}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-extrabold leading-none text-[#0B1F4B] sm:text-3xl dark:text-white">{value}</div>
        <div className="mt-1.5 line-clamp-2 text-xs font-bold leading-tight text-slate-800 sm:line-clamp-1 sm:text-sm dark:text-slate-100">{label}</div>
        <div className="truncate text-[11px] font-medium text-slate-400 sm:text-xs dark:text-slate-500">{hint}</div>
      </div>
      <ChevronRight className="hidden h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 sm:block" />
    </button>
  );
}

interface StatCardsProps {
  stats: MonthStats;
  /** Card click opens the List view pre-filtered to that card's events */
  onOpen: (filter: ListFilter) => void;
}

export function StatCards({ stats, onOpen }: StatCardsProps) {
  const { leaves } = stats;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        value={String(stats.companyHolidays)}
        label="Company Holidays"
        hint="This Month"
        icon={<Gift className="h-5 w-5 sm:h-7 sm:w-7" />}
        tone="border-rose-100 bg-gradient-to-br from-rose-50 to-white dark:border-rose-900/40 dark:from-rose-950/30 dark:to-slate-900"
        iconTone="bg-rose-100 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400"
        onClick={() => onOpen("holiday")}
      />
      <StatCard
        value={String(stats.weekends)}
        label="Weekends"
        hint="This Month"
        icon={<CalendarIcon className="h-5 w-5 sm:h-7 sm:w-7" />}
        tone="border-violet-100 bg-gradient-to-br from-violet-50 to-white dark:border-violet-900/40 dark:from-violet-950/30 dark:to-slate-900"
        iconTone="bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400"
        onClick={() => onOpen("weekend")}
      />
      <StatCard
        value={String(stats.nonWorkingDays)}
        label="Total Non-Working Days"
        hint="Holidays + Weekends"
        icon={<CalendarCheck className="h-5 w-5 sm:h-7 sm:w-7" />}
        tone="border-blue-100 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/40 dark:from-blue-950/30 dark:to-slate-900"
        iconTone="bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
        onClick={() => onOpen("nonworking")}
      />
      <StatCard
        value={leaves.total > 0 ? formatCount(leaves.total) : "–"}
        label="Leaves This Month"
        hint={
          leaves.total > 0
            ? `${formatCount(leaves.approved)} Approved / ${formatCount(leaves.pending)} Pending`
            : "Approved / Pending"
        }
        icon={<Leaf className="h-5 w-5 sm:h-7 sm:w-7" />}
        tone="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-slate-900"
        iconTone="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        onClick={() => onOpen("leave")}
      />
    </div>
  );
}
