"use client";

import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Holiday {
  id?: number | string;
  name: string;
  date: string;
  type?: string;
}

interface CommunityHolidayCardProps {
  holiday: Holiday | null;
}

export function CommunityHolidayCard({ holiday }: CommunityHolidayCardProps) {
  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 shadow-xs p-5 flex flex-col justify-between w-full h-full min-h-[220px]"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-rose-500 stroke-[2]" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base tracking-tight m-0">
            Upcoming Holiday
          </h3>
        </div>

        <Link
          href="/holidays"
          className="text-[#2563eb] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-colors group"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* ── BANNER CARD ── */}
      {holiday ? (
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#FFF6F3] dark:bg-slate-750/70 border border-orange-100/70 dark:border-slate-700/50 p-5 flex items-center justify-between gap-4">
          {/* Decorative soft glow backgrounds */}
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#FFE2D6]/40 dark:bg-rose-950/20 blur-xl pointer-events-none" />
          <div className="absolute -right-4 -top-4 w-44 h-44 rounded-full bg-[#FED7AA]/35 dark:bg-amber-950/20 pointer-events-none" />

          {/* Left info column */}
          <div className="relative z-10 space-y-2 min-w-0 pr-2">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FEF3C7] dark:bg-amber-900/40 text-[#D97706] dark:text-amber-300 text-[10.5px] font-bold tracking-wider uppercase border border-amber-200/50 dark:border-amber-700/40">
                {holiday.type || "CELEBRATION"}
              </span>
            </div>

            <h4
              className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2"
              title={holiday.name}
            >
              {holiday.name}
            </h4>

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-[13px] font-medium pt-0.5">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>
                {holiday.date ? format(parseISO(holiday.date), "EEEE, d MMMM yyyy") : "TBD"}
              </span>
            </div>
          </div>

          {/* Right Festive Party Popper SVG Illustration */}
          <div className="relative shrink-0 w-28 sm:w-32 h-24 sm:h-28 flex items-center justify-center pointer-events-none select-none z-10">
            {/* Soft pink/peach aura */}
            <div className="absolute w-20 h-20 rounded-full bg-[#FFEAE1] dark:bg-rose-950/40 right-2 top-2" />

            {/* Little floating pink dot from screenshot */}
            <span className="absolute -bottom-0.5 left-2 w-2 h-2 rounded-full bg-rose-300 dark:bg-rose-400 opacity-80" />

            <svg
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full relative z-10 drop-shadow-2xs"
            >
              {/* Confetti ribbons & strips bursting from nozzle */}
              <path
                d="M74 46L86 32"
                stroke="#0EA5E9"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M66 36L72 20"
                stroke="#F59E0B"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M84 54L100 48"
                stroke="#10B981"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M80 38L96 26"
                stroke="#F43F5E"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Confetti particles */}
              <circle cx="86" cy="18" r="2.5" fill="#F59E0B" />
              <circle cx="102" cy="38" r="2.5" fill="#0EA5E9" />
              <circle cx="68" cy="14" r="2" fill="#F43F5E" />
              <circle cx="106" cy="22" r="2" fill="#10B981" />
              <circle cx="62" cy="28" r="2" fill="#8B5CF6" />

              {/* Party popper cone tilted */}
              <g transform="rotate(-15 54 68)">
                {/* Cone Body */}
                <path
                  d="M38 78L46 44C46 44 68 49 72 70L46 84C41 85 37 82 38 78Z"
                  fill="#F43F5E"
                />
                {/* Highlight stripe on cone */}
                <path
                  d="M48 50L43 72"
                  stroke="#FB7185"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Top mouth rim */}
                <ellipse
                  cx="59"
                  cy="57"
                  rx="14"
                  ry="6"
                  transform="rotate(28 59 57)"
                  fill="#FBBF24"
                />
                {/* Inner nozzle darkness */}
                <ellipse
                  cx="60"
                  cy="56"
                  rx="11"
                  ry="4"
                  transform="rotate(28 60 56)"
                  fill="#D97706"
                />
                {/* Decorative stars/dots on cone */}
                <circle cx="50" cy="70" r="1.5" fill="#FEF08A" />
                <circle cx="56" cy="74" r="1.5" fill="#FEF08A" />
              </g>
            </svg>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#FFF6F3] dark:bg-slate-750/70 border border-orange-100/70 dark:border-slate-700/50 p-6 text-center">
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            No upcoming holidays scheduled.
          </p>
        </div>
      )}
    </div>
  );
}
