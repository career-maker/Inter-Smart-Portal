"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles } from "lucide-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { useAuthStore } from "@/store/auth";

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
  // Employees / Team Leads see holidays on their Leave Calendar; the Holiday Calendar page is for admins
  const role = useAuthStore((s) => s.user?.role);
  const calendarHref = role === "Employee" || role === "Team Lead" ? "/calendar" : "/holidays";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPopping, setIsPopping] = useState(false);
  const [hasAutoPopped, setHasAutoPopped] = useState(false);

  // Trigger celebration pop particles
  const triggerCelebrationPop = () => {
    setIsPopping(true);
    const newParticles: Particle[] = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360 + (Math.random() * 30 - 15);
      const distance = 45 + Math.random() * 65;
      const rad = (angle * Math.PI) / 180;

      newParticles.push({
        id: Date.now() + i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance - 20,
        color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
        size: Math.floor(Math.random() * 4) + 4,
        shape: Math.random() > 0.4 ? "circle" : "rect",
        rot: Math.floor(Math.random() * 360),
      });
    }

    setParticles(newParticles);

    setTimeout(() => {
      setIsPopping(false);
      setParticles([]);
    }, 1200);
  };

  useEffect(() => {
    if (holidays.length > 0 && !hasAutoPopped) {
      const timer = setTimeout(() => {
        triggerCelebrationPop();
        setHasAutoPopped(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [holidays.length, hasAutoPopped]);

  const safeIndex = holidays.length > 0 ? ((currentIndex % holidays.length) + holidays.length) % holidays.length : 0;
  const currentHoliday = holidays[safeIndex];
  const otherHolidays = holidays.filter((_, idx) => idx !== safeIndex).slice(0, 3);

  const handlePrev = () => {
    if (holidays.length <= 1) return;
    setCurrentIndex((prev) => ((prev - 1) % holidays.length + holidays.length) % holidays.length);
  };

  const handleNext = () => {
    if (holidays.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % holidays.length);
  };

  const getDaysRemainingText = (dateStr: string) => {
    try {
      const holidayDate = parseISO(dateStr);
      const today = new Date();
      const diff = differenceInCalendarDays(holidayDate, today);

      if (diff === 0) return "Today!";
      if (diff === 1) return "Tomorrow";
      if (diff > 1) return `In ${diff} days`;
      return null;
    } catch {
      return null;
    }
  };

  const formatHolidayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, dd MMMM, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`premium-card wave-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs transition-all ${className}`}
    >
      {/* Celebration Confetti Particles Overlay on Manual Pop */}
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
        <div className="flex items-center justify-between z-10 relative mb-1">
          <h3
            style={{
              fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)',
              fontSize: "calc(14px * var(--portal-heading-multiplier, 1))",
              lineHeight: "20px",
              fontWeight: 600,
              color: "rgb(15, 24, 36)",
            }}
            className="dark:text-white box-title m-0 tracking-normal"
          >
            Holidays
          </h3>

          <div className="flex items-center gap-2">

            <NextLink
              href={calendarHref}
              style={{
                fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)',
                backgroundColor: "var(--portal-primary-color, #0F766E)",
                color: "#ffffff",
              }}
              className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
            >
              View All
            </NextLink>
          </div>
        </div>

        {/* Content */}
        {holidays.length === 0 ? (
          <div className="py-8 text-center space-y-2 z-10 relative">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              No upcoming holidays scheduled.
            </p>
            <NextLink
              href={calendarHref}
              className="inline-block text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1"
            >
              {calendarHref === "/calendar" ? "View calendar →" : "Configure holidays →"}
            </NextLink>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Featured Celebration Section (Screenshot 1 exact design) */}
            {currentHoliday && (
              <div className="relative py-4 sm:py-5 flex items-center justify-between gap-1 z-10">
                {/* Left Arrow Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={holidays.length <= 1}
                  aria-label="Previous holiday"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#56348f] dark:text-purple-400 hover:bg-purple-100/60 dark:hover:bg-purple-900/30 active:scale-90 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2]" />
                </button>

                {/* Center Title & Date */}
                <div className="flex-1 text-center min-w-0 px-2 space-y-1">
                  <h4
                    style={{
                      fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)',
                      color: "var(--portal-primary-color, #56348f)",
                    }}
                    className="text-[20px] sm:text-[22px] font-semibold tracking-tight truncate max-w-full leading-tight dark:text-purple-300"
                    title={currentHoliday.name}
                  >
                    {currentHoliday.name}
                  </h4>
                  <p
                    style={{
                      fontFamily: 'var(--portal-font-family, "Proxima Nova", sans-serif)',
                      color: "var(--portal-primary-color, #56348f)",
                    }}
                    className="text-[13px] sm:text-[14px] font-medium opacity-85 dark:text-purple-300/85"
                  >
                    {formatHolidayDate(currentHoliday.date)}
                  </p>

                  {/* Subtitle pill for days remaining or type */}
                  {(getDaysRemainingText(currentHoliday.date) || currentHoliday.type) && (
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      {getDaysRemainingText(currentHoliday.date) && (
                        <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shadow-2xs">
                          {getDaysRemainingText(currentHoliday.date)}
                        </span>
                      )}
                      {currentHoliday.type && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {currentHoliday.type}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Arrow Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={holidays.length <= 1}
                  aria-label="Next holiday"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#56348f] dark:text-purple-400 hover:bg-purple-100/60 dark:hover:bg-purple-900/30 active:scale-90 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2]" />
                </button>
              </div>
            )}

            {/* Carousel Dots */}
            {holidays.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pb-2 z-10 relative">
                {holidays.map((h, i) => (
                  <button
                    key={h.id || i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    aria-label={`Go to holiday ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === safeIndex
                        ? "w-4 bg-[#56348f] dark:bg-purple-400"
                        : "w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Subsequent Upcoming Holidays (Clean mini list) */}
            {otherHolidays.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-1 space-y-1.5 z-10 relative">
                {otherHolidays.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {h.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-2">
                      {format(parseISO(h.date), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
