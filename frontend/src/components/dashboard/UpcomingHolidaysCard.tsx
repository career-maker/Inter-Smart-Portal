"use client";

import { useState, useEffect } from "react";
import Link from "next/navigation";
import NextLink from "next/link";
import { CalendarDays, ChevronRight, Sparkles } from "lucide-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

interface Holiday {
  id?: number | string;
  name: string;
  date: string;
  type?: string;
  description?: string;
}

interface UpcomingHolidaysCardProps {
  holidays: Holiday[];
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  shape: "circle" | "rect";
  rot: number;
}

const CELEBRATION_COLORS = [
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#eab308", // Yellow
];

export function UpcomingHolidaysCard({ holidays = [], className = "" }: UpcomingHolidaysCardProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPopping, setIsPopping] = useState(false);
  const [hasAutoPopped, setHasAutoPopped] = useState(false);

  // Trigger celebration pop particles
  const triggerCelebrationPop = () => {
    setIsPopping(true);
    const newParticles: Particle[] = [];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360 + (Math.random() * 30 - 15);
      const distance = 45 + Math.random() * 65;
      const rad = (angle * Math.PI) / 180;

      newParticles.push({
        id: Date.now() + i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance - 20, // Slight upward bias
        color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
        size: Math.floor(Math.random() * 4) + 4,
        shape: Math.random() > 0.4 ? "circle" : "rect",
        rot: Math.floor(Math.random() * 360),
      });
    }

    setParticles(newParticles);

    // Reset after animation ends
    setTimeout(() => {
      setIsPopping(false);
      setParticles([]);
    }, 1200);
  };

  // Auto pop once on initial mount if there are upcoming holidays
  useEffect(() => {
    if (holidays.length > 0 && !hasAutoPopped) {
      const timer = setTimeout(() => {
        triggerCelebrationPop();
        setHasAutoPopped(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [holidays.length, hasAutoPopped]);

  const nextHoliday = holidays[0];
  const otherHolidays = holidays.slice(1, 4);

  const getDaysRemainingText = (dateStr: string) => {
    try {
      const holidayDate = parseISO(dateStr);
      const today = new Date();
      const diff = differenceInCalendarDays(holidayDate, today);

      if (diff === 0) return "Today! 🎉";
      if (diff === 1) return "Tomorrow";
      if (diff > 1 && diff <= 7) return `In ${diff} days`;
      return `In ${diff} days`;
    } catch {
      return null;
    }
  };

  return (
    <div
      className={`premium-card wave-card p-6 flex flex-col justify-between relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs transition-all ${className}`}
    >
      {/* Celebration Confetti Particles Overlay */}
      {particles.length > 0 && (
        <div className="absolute right-12 top-10 pointer-events-none z-30">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute inline-block transition-all duration-1000 ease-out"
              style={{
                width: `${p.size}px`,
                height: p.shape === "circle" ? `${p.size}px` : `${p.size * 2}px`,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
                transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`,
                opacity: isPopping ? 1 : 0,
                boxShadow: `0 0 4px ${p.color}80`,
              }}
            />
          ))}
        </div>
      )}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200/90 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "14px",
                  lineHeight: "20px",
                  fontWeight: 600,
                  color: "rgb(15, 24, 36)",
                }}
                className="dark:text-white flex items-center gap-1.5"
              >
                Upcoming Holidays
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "rgb(100, 116, 139)",
                }}
                className="dark:text-slate-400 font-normal"
              >
                Public & company calendar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Celebration Popper */}
            <button
              onClick={triggerCelebrationPop}
              title="Pop celebration celebration!"
              className={`p-1.5 rounded-lg border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-sm transition-transform active:scale-90 ${
                isPopping ? "animate-celebration-wiggle scale-110" : "hover:scale-105"
              }`}
            >
              🎉
            </button>

            <NextLink
              href="/holidays"
              className="text-xs font-bold text-[#56348f] dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline flex items-center gap-0.5 ml-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NextLink>
          </div>
        </div>

        {/* Content */}
        {holidays.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              No upcoming holidays scheduled.
            </p>
            <NextLink
              href="/holidays"
              className="inline-block text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1"
            >
              Configure holidays →
            </NextLink>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Featured Next Celebration Card */}
            {nextHoliday && (
              <div className="bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-purple-500/5 border border-rose-200/90 dark:border-rose-500/30 rounded-xl p-3.5 relative overflow-hidden transition-all hover:border-rose-300 dark:hover:border-rose-500/50 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Next Celebration
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      🎉 {nextHoliday.name}
                    </h4>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span>{format(parseISO(nextHoliday.date), "EEEE, dd MMM yyyy")}</span>
                      {nextHoliday.type && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {nextHoliday.type}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {getDaysRemainingText(nextHoliday.date) && (
                    <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 shadow-2xs">
                      {getDaysRemainingText(nextHoliday.date)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* List of subsequent holidays */}
            {otherHolidays.length > 0 && (
              <div className="space-y-2 pt-1">
                {otherHolidays.map((h, i) => {
                  let formattedDate = "";
                  let monthName = "";
                  let dayNum = "";
                  let dayOfWeek = "";

                  try {
                    const parsed = parseISO(h.date);
                    formattedDate = format(parsed, "MMM d");
                    monthName = format(parsed, "MMM");
                    dayNum = format(parsed, "dd");
                    dayOfWeek = format(parsed, "EEE");
                  } catch {
                    formattedDate = h.date;
                  }

                  return (
                    <div
                      key={h.id || i}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Mini Calendar Date Pill */}
                        <div className="w-10 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg text-center flex-shrink-0 leading-tight">
                          <div className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400">
                            {monthName}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {dayNum}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {h.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {dayOfWeek} {h.type ? `• ${h.type}` : ""}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md flex-shrink-0 font-mono">
                        {formattedDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
