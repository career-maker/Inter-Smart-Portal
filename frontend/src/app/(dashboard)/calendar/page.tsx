"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Gift,
  CalendarCheck,
  Calendar as CalendarIcon,
  Loader2,
  Laptop,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns";
import api from "@/services/api";
import { Button } from "@/components/ui/button";

interface CalendarEvent {
  id: string | number;
  title: string;
  date?: string;
  end_date?: string;
  type: "Holiday" | "WFH" | "Leave" | string;
  status?: "Approved" | "Pending" | "Rejected" | string;
  reason?: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMonthDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isExcludedEvent = (e: CalendarEvent) => {
    const s = (e.status || "").toLowerCase();
    return s === "rejected" || s === "cancelled";
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await api.get(`/calendar?month=${month}&year=${year}`);
      const rawEvents: CalendarEvent[] = res.data.data || [];
      setEvents(rawEvents.filter((e) => !isExcludedEvent(e)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const setMonthByIndex = (mIdx: number) => {
    const updated = new Date(currentDate.getFullYear(), mIdx, 1);
    setCurrentDate(updated);
    setShowMonthDropdown(false);
  };

  const setYearByNumber = (yr: number) => {
    const updated = new Date(yr, currentDate.getMonth(), 1);
    setCurrentDate(updated);
    setShowMonthDropdown(false);
  };

  // Calendar grid interval from Sunday of first week to Saturday of last week
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart.getTime(), calendarEnd.getTime()]);

  // Separate events for a specific day
  const getEventsForDay = (date: Date) => {
    const dayStr = format(date, "yyyy-MM-dd");
    return events.filter((e) => {
      if (isExcludedEvent(e)) return false;
      if (!e.date) return false;
      const eventStart = e.date.split(" ")[0].split("T")[0];
      if (!e.end_date) return eventStart === dayStr;
      const eventEnd = e.end_date.split(" ")[0].split("T")[0];
      return dayStr >= eventStart && dayStr <= eventEnd;
    });
  };

  // Metrics computation for selected month
  const metrics = useMemo(() => {
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: mStart, end: mEnd });

    let weekendCount = 0;
    const weekendDateSet = new Set<string>();
    const companyHolidayDateSet = new Set<string>();

    daysInMonth.forEach((day) => {
      const dayOfWeek = day.getDay();
      const dateStr = format(day, "yyyy-MM-dd");
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++;
        weekendDateSet.add(dateStr);
      }
    });

    events.forEach((ev) => {
      if (ev.type === "Holiday" && ev.date) {
        const evDate = ev.date.split(" ")[0].split("T")[0];
        // If it's a named holiday and not auto-generated weekend
        const isAutoWeekend = String(ev.id).startsWith("weekend_") || ev.title === "Saturday" || ev.title === "Sunday";
        if (!isAutoWeekend) {
          const d = new Date(evDate + "T00:00:00");
          if (isSameMonth(d, currentDate)) {
            companyHolidayDateSet.add(evDate);
          }
        }
      }
    });

    // Total non-working days = unique union of weekend dates + company holiday dates
    const allNonWorkingDates = new Set([...weekendDateSet, ...companyHolidayDateSet]);

    return {
      companyHolidays: companyHolidayDateSet.size,
      weekends: weekendCount,
      totalNonWorkingDays: allNonWorkingDates.size,
    };
  }, [currentDate, events]);

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="relative min-h-[calc(100vh-5rem)] pb-12 space-y-6">
      {/* ── BACKGROUND ARTWORK (TOP RIGHT) ── */}
      <div className="absolute top-0 right-0 -z-10 pointer-events-none select-none overflow-hidden h-72 w-96">
        {/* Soft pink blush blur circle */}
        <div className="absolute -top-10 right-4 w-40 h-40 rounded-full bg-rose-200/45 dark:bg-rose-900/20 blur-xl" />
        {/* Botanical leaf silhouettes */}
        <svg
          viewBox="0 0 240 200"
          className="absolute top-2 right-0 w-60 h-52 text-indigo-100/70 dark:text-indigo-950/30"
          fill="currentColor"
        >
          <path d="M180,20 C140,50 140,110 170,140 C190,120 205,80 180,20 Z" />
          <path d="M210,60 C180,85 180,130 200,160 C220,140 230,105 210,60 Z" />
          <path d="M145,70 C120,95 125,140 145,165 C160,145 165,115 145,70 Z" opacity="0.6" />
          <circle cx="215" cy="35" r="18" className="text-rose-200/60 dark:text-rose-900/30" />
        </svg>
      </div>

      {/* ── 1. HEADER ROW ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        {/* Left: Icon + Title + Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              Holiday Calendar
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              View company holidays and weekends at a glance.
            </p>
          </div>
        </div>

        {/* Right: Navigation Controls + Today */}
        <div className="flex items-center gap-2 relative">
          <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="h-9 w-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Month & Year Dropdown Trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs md:text-sm font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-w-[145px]"
              >
                <span>{format(currentDate, "MMMM yyyy")}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Month / Year Popover */}
              {showMonthDropdown && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  {/* Year selector */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500">Year</span>
                    <div className="flex items-center gap-1">
                      {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setYearByNumber(yr)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                            yr === currentDate.getFullYear()
                              ? "bg-[#56348f] text-white"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 12 Months Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                    ].map((monthName, idx) => (
                      <button
                        key={monthName}
                        type="button"
                        onClick={() => setMonthByIndex(idx)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          idx === currentDate.getMonth()
                            ? "bg-[#56348f] text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {monthName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-9 w-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Today Button */}
          <Button
            variant="outline"
            onClick={goToToday}
            className="h-10 px-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs md:text-sm rounded-xl shadow-xs"
          >
            Today
          </Button>
        </div>
      </div>

      {/* ── 2. METRIC SUMMARY CARDS ROW (4 CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Company Holiday */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[#FFF1F2] dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-[#E11D48] shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {metrics.companyHolidays}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Company Holiday
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">This Month</p>
          </div>
        </div>

        {/* Card 2: Weekends */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {metrics.weekends}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Weekends
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">This Month</p>
          </div>
        </div>

        {/* Card 3: Total Non-Working Days */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {metrics.totalNonWorkingDays}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Total Non-Working Days
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Holidays + Weekends</p>
          </div>
        </div>

        {/* Card 4: Legend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center gap-2.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#E11D48] shrink-0 shadow-2xs" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Company Holiday / Weekend
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#94A3B8] shrink-0 shadow-2xs" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Working Day
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. CALENDAR GRID ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs z-20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#56348f]" />
          </div>
        )}

        {/* Weekday Header Columns */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dayName) => (
            <div
              key={dayName}
              className="py-3.5 text-xs font-extrabold tracking-wider text-slate-600 dark:text-slate-400"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 border-collapse divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const today = isToday(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            const dayEvents = getEventsForDay(day);

            // Separate company holidays vs personal events (leaves, WFH)
            const companyHolidaysOnDay = dayEvents.filter(
              (ev) =>
                ev.type === "Holiday" &&
                !String(ev.id).startsWith("weekend_") &&
                ev.title !== "Saturday" &&
                ev.title !== "Sunday"
            );
            const wfhEvents = dayEvents.filter((ev) => ev.type === "WFH");
            const leaveEvents = dayEvents.filter((ev) => ev.type === "Leave" || (ev.type !== "Holiday" && ev.type !== "WFH"));

            const hasHoliday = companyHolidaysOnDay.length > 0;
            const isNonWorking = isWeekend || hasHoliday;

            // Background coloring
            let cellBg = "bg-white dark:bg-slate-900";
            if (isCurrentMonth) {
              if (isNonWorking) {
                cellBg = "bg-[#FFF5F6] dark:bg-rose-950/20";
              }
            } else {
              // Outside month padding days
              cellBg = isNonWorking
                ? "bg-[#FFF8F9] dark:bg-rose-950/10"
                : "bg-slate-50/50 dark:bg-slate-900/30";
            }

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[105px] md:min-h-[120px] p-2.5 flex flex-col justify-between transition-colors relative cursor-pointer group ${cellBg} ${
                  isSelected
                    ? "ring-2 ring-inset ring-[#56348f] z-10"
                    : today
                    ? "ring-2 ring-inset ring-amber-400/80"
                    : ""
                }`}
              >
                {/* Top Row: Date number */}
                <div className="flex items-center justify-end">
                  <span
                    className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                      !isCurrentMonth
                        ? "text-slate-300 dark:text-slate-600"
                        : isNonWorking
                        ? "text-[#E11D48]"
                        : "text-slate-800 dark:text-slate-200"
                    } ${
                      today
                        ? "bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-300"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Middle / Center Content */}
                <div className="flex-1 flex flex-col justify-center items-center gap-1 my-1">
                  {/* Weekend Pill (if weekend and current month) */}
                  {isCurrentMonth && isWeekend && !hasHoliday && (
                    <div className="w-full flex justify-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-[#FFE4E8] dark:bg-rose-900/40 text-[#E11D48] dark:text-rose-300 text-xs font-bold tracking-wide shadow-2xs">
                        Weekend
                      </span>
                    </div>
                  )}

                  {/* Company Holiday Box (like Sept 21 Sree Narayana Guru Samadhi) */}
                  {isCurrentMonth && hasHoliday && (
                    <div className="w-full space-y-1">
                      {companyHolidaysOnDay.map((h) => (
                        <div
                          key={h.id}
                          title={h.title}
                          className="w-full p-1.5 rounded-lg bg-[#FFE4E8] dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-[#E11D48] dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs truncate"
                        >
                          <Gift className="w-3.5 h-3.5 shrink-0 text-[#E11D48]" />
                          <span className="truncate">{h.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Work From Home (WFH) Badges */}
                  {isCurrentMonth && wfhEvents.length > 0 && (
                    <div className="w-full flex flex-wrap justify-center gap-1">
                      {wfhEvents.map((w) => (
                        <span
                          key={w.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-800 shadow-2xs"
                        >
                          <Laptop className="w-3 h-3" />
                          WFH
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Leave Badges */}
                  {isCurrentMonth && leaveEvents.length > 0 && (
                    <div className="w-full space-y-0.5">
                      {leaveEvents.map((l) => {
                        const isApproved = l.status === "Approved";
                        const isRejected = l.status === "Rejected";
                        const bgStyle = isApproved
                          ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : isRejected
                          ? "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";

                        return (
                          <div
                            key={l.id}
                            title={`${l.title} (${l.status || "Pending"})`}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border truncate text-center shadow-2xs ${bgStyle}`}
                          >
                            {l.title || "Leave"}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom subtle indicator or placeholder */}
                <div className="h-1" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. SELECTED DAY EVENTS DRAWER / CARD ── */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Events on {format(selectedDate, "EEEE, dd MMMM yyyy")}
            </h3>
            {isToday(selectedDate) && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                Today
              </span>
            )}
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-1 font-medium">
              Regular working day. No leaves, WFH, or company holidays scheduled for this date.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayEvents.map((event) => {
                let badgeType = "Leave Request";
                let badgeClass =
                  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300";
                let IconComponent = Clock;

                if (event.type === "Holiday") {
                  badgeType = "Company Holiday / Weekend";
                  badgeClass =
                    "bg-rose-100 text-[#E11D48] border-rose-200 dark:bg-rose-900/40 dark:text-rose-300";
                  IconComponent = Gift;
                } else if (event.type === "WFH") {
                  badgeType = "Work From Home";
                  badgeClass =
                    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300";
                  IconComponent = Laptop;
                } else if (event.status === "Approved") {
                  badgeType = "Approved Leave";
                  badgeClass =
                    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300";
                  IconComponent = CheckCircle2;
                } else if (event.status === "Rejected") {
                  badgeType = "Rejected";
                  badgeClass =
                    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300";
                  IconComponent = XCircle;
                }

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {event.title}
                        </p>
                        {event.date && event.type !== "Holiday" && (
                          <p className="text-xs text-slate-400">
                            {event.end_date && event.end_date !== event.date
                              ? `${event.date} to ${event.end_date}`
                              : event.date}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${badgeClass}`}
                    >
                      {badgeType}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
