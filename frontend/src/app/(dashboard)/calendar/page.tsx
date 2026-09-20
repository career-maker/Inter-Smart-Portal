"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { CalendarToolbar } from "@/components/leave-calendar/CalendarToolbar";
import { ListView, MonthView, WeekView } from "@/components/leave-calendar/CalendarViews";
import {
  ApplyLeaveBanner,
  DayDetailsCard,
  EventTypesCard,
  QuoteCard,
  UpcomingCard,
} from "@/components/leave-calendar/SidePanels";
import { StatCards } from "@/components/leave-calendar/StatCards";
import {
  DEFAULT_PREFS,
  type CalendarEvent,
  type CalendarMeta,
  type CalendarPrefs,
  type CalendarView,
  type ListFilter,
} from "@/components/leave-calendar/types";
import {
  applyPrefs,
  buildUpcoming,
  computeMonthStats,
  eventsOnDay,
} from "@/components/leave-calendar/utils";

const PREFS_KEY = "leave-calendar-prefs";
const EMPTY_EVENTS: CalendarEvent[] = [];

const monthKey = (d: Date) => format(d, "yyyy-MM");

// Display preferences are a per-browser convenience. The dashboard layout only renders
// pages after hydration, so reading storage in the initializer is safe.
function readPrefs(): CalendarPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS; // storage unavailable or corrupt
  }
}

const isExcludedEvent = (e: CalendarEvent) => {
  const s = (e.status || "").toLowerCase();
  return s === "rejected" || s === "cancelled";
};

async function fetchMonth(date: Date) {
  const res = await api.get(`/calendar?month=${date.getMonth() + 1}&year=${date.getFullYear()}`);
  const raw: CalendarEvent[] = res.data.data || [];
  return {
    events: raw.filter((e) => !isExcludedEvent(e)),
    meta: (res.data.meta || null) as CalendarMeta | null,
  };
}

function weekLabel(start: Date, end: Date) {
  if (isSameMonth(start, end)) return `${format(start, "d")} – ${format(end, "d MMM yyyy")}`;
  if (start.getFullYear() === end.getFullYear()) return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

export default function CalendarPage() {
  const role = useAuthStore((s) => s.user?.role);

  // currentDate is the month shown (Month/List) or a day inside the week shown (Week)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [prefs, setPrefs] = useState<CalendarPrefs>(readPrefs);

  const [events, setEvents] = useState<CalendarEvent[]>(EMPTY_EVENTS);
  const [meta, setMeta] = useState<CalendarMeta | null>(null);
  // Month the loaded `events` belong to (lags currentDate while a fetch is in flight)
  const [loadedMonth, setLoadedMonth] = useState<Date | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[] | null>(null);

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();
  const monthAnchor = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const requestedKey = monthKey(monthAnchor);
  const todayMonthKey = monthKey(new Date());

  const updatePrefs = (next: CalendarPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore: the preference just won't persist
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchMonth(monthAnchor)
      .then(({ events: loaded, meta: loadedMeta }) => {
        if (cancelled) return;
        setEvents(loaded);
        setMeta(loadedMeta);
        setLoadedMonth(monthAnchor);
        setFailedKey(null);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setFailedKey(monthKey(monthAnchor));
      });
    return () => {
      cancelled = true;
    };
  }, [monthAnchor]);

  // Loading until events for the requested month arrive (or the request fails)
  const loadedKey = loadedMonth ? monthKey(loadedMonth) : null;
  const isLoading = loadedKey !== requestedKey && failedKey !== requestedKey;

  // "Upcoming" is relative to today: reuse the loaded month when it is today's month,
  // otherwise fetch today's month once
  useEffect(() => {
    if (loadedKey === null || loadedKey === todayMonthKey || todayEvents !== null) return;
    fetchMonth(new Date())
      .then(({ events: loaded }) => setTodayEvents(loaded))
      .catch((e) => console.error(e));
  }, [loadedKey, todayMonthKey, todayEvents]);
  const upcomingSource = loadedKey === todayMonthKey ? events : todayEvents ?? EMPTY_EVENTS;

  /* ── Derived data ── */

  const isTeamView = !!meta?.is_team_view;
  const visibleEvents = useMemo(() => applyPrefs(events, prefs), [events, prefs]);
  const stats = useMemo(
    () => computeMonthStats(events, loadedMonth ?? monthAnchor),
    [events, loadedMonth, monthAnchor]
  );
  const upcoming = useMemo(
    () => buildUpcoming(applyPrefs(upcomingSource, prefs), new Date(), isTeamView),
    [upcomingSource, prefs, isTeamView]
  );

  const gridDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 }),
      }),
    [monthAnchor]
  );
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      }),
    [currentDate]
  );

  const toolbarLabel =
    view === "week" ? weekLabel(weekDays[0], weekDays[6]) : format(currentDate, "MMMM yyyy");

  /* ── Navigation ── */

  // After a month change select today (if it is that month) so the day panel always has data
  const goToMonth = (month: Date) => {
    setCurrentDate(month);
    setSelectedDate(isSameMonth(month, new Date()) ? new Date() : startOfMonth(month));
  };

  const shiftWeek = (weeks: 1 | -1) => {
    const next = weeks === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    setCurrentDate(next);
    setSelectedDate(next);
  };

  const handlePrev = () => (view === "week" ? shiftWeek(-1) : goToMonth(startOfMonth(subMonths(currentDate, 1))));
  const handleNext = () => (view === "week" ? shiftWeek(1) : goToMonth(startOfMonth(addMonths(currentDate, 1))));

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleViewChange = (next: CalendarView) => {
    // Week view opens on the week of the selected day
    if (next === "week" && view !== "week") setCurrentDate(selectedDate);
    setView(next);
  };

  const openList = (filter: ListFilter) => {
    setListFilter(filter);
    setView("list");
  };

  const subtitle = isTeamView
    ? `Your leave and WFH, your team's${meta?.team_name ? ` (${meta.team_name})` : ""}, plus company holidays.`
    : "Your leave and WFH, plus company holidays and weekends.";

  return (
    <div className="relative space-y-5 pb-10">
      {/* Decorative artwork (top right) */}
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 hidden h-56 w-[540px] select-none overflow-hidden lg:block">
        <svg
          viewBox="0 0 260 220"
          className="portal-accent-text absolute right-0 top-0 h-56 w-64 opacity-[0.14]"
          fill="currentColor"
        >
          <path d="M190,10 C145,45 145,115 178,150 C200,128 218,82 190,10 Z" />
          <path d="M228,58 C196,86 196,134 218,168 C240,146 250,106 228,58 Z" />
          <path d="M150,72 C124,98 128,146 150,172 C166,150 172,118 150,72 Z" opacity="0.6" />
        </svg>
        <p className="card-tagline cursive-slogan absolute right-36 top-7 !text-[22px] leading-[1.15]">
          Take Time
          <br />
          What You Do Matters
        </p>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="portal-accent-tint portal-accent-border portal-accent-text flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-3xl border shadow-xs">
          <CalendarDays className="h-9 w-9" />
        </div>
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Link href="/leaves" className="text-slate-500 transition-colors hover:underline dark:text-slate-400">
              Leaves
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">Calendar</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1F4B] dark:text-white">Leave Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="relative z-10">
        <StatCards stats={stats} onOpen={openList} />
      </div>

      {/* Calendar + side column */}
      <div className="relative z-10 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CalendarToolbar
              view={view}
              onViewChange={handleViewChange}
              label={toolbarLabel}
              pickerEnabled={view !== "week"}
              year={viewYear}
              monthIndex={viewMonth}
              onPickMonth={(idx) => goToMonth(new Date(viewYear, idx, 1))}
              onPickYear={(yr) => goToMonth(new Date(yr, viewMonth, 1))}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
              prefs={prefs}
              onPrefsChange={updatePrefs}
              showTeamToggle={isTeamView}
            />

            <div className="relative overflow-hidden rounded-b-2xl">
              {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs dark:bg-slate-900/60">
                  <Loader2 className="portal-accent-text h-8 w-8 animate-spin" />
                </div>
              )}

              {view === "month" && (
                <MonthView
                  days={gridDays}
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  events={visibleEvents}
                  isTeamView={isTeamView}
                  onSelect={setSelectedDate}
                />
              )}
              {view === "week" && (
                <WeekView
                  days={weekDays}
                  selectedDate={selectedDate}
                  events={visibleEvents}
                  isTeamView={isTeamView}
                  onSelect={setSelectedDate}
                />
              )}
              {view === "list" && (
                <ListView
                  events={visibleEvents}
                  month={monthAnchor}
                  filter={listFilter}
                  onFilterChange={setListFilter}
                  isTeamView={isTeamView}
                />
              )}
            </div>
          </div>

          {view === "month" && (
            <DayDetailsCard
              date={selectedDate}
              events={eventsOnDay(visibleEvents, selectedDate)}
              isTeamView={isTeamView}
            />
          )}

          {/* Super Admin cannot apply for leave personally */}
          {role !== "Super Admin" && <ApplyLeaveBanner />}
        </div>

        <aside className="space-y-5">
          <EventTypesCard />
          <UpcomingCard days={upcoming} />
          <QuoteCard />
        </aside>
      </div>
    </div>
  );
}
