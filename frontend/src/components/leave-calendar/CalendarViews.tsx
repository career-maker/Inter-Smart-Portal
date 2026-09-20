"use client";

import { useMemo } from "react";
import { format, isSameDay, isSameMonth, isToday, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Gift, Laptop, Leaf } from "lucide-react";
import type { CalendarEvent, ListFilter } from "./types";
import {
  buildListGroups,
  chipClass,
  comparePeopleEvents,
  dotClass,
  eventBadge,
  eventsOnDay,
  formatEventRange,
  isCompanyHoliday,
  isPeopleEvent,
  isWeekendEvent,
  isWfhEvent,
  personLabel,
} from "./utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Team Lead cells can hold many people; beyond this the rest collapse into "+N more"
const MAX_TEAM_CHIPS = 3;

const cellKeyDown = (onSelect: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onSelect();
  }
};

/* ── Shared bits ───────────────────────────────────────────────────── */

function EventChip({ ev, label }: { ev: CalendarEvent; label: string }) {
  return (
    <div
      title={`${ev.user?.name ? `${ev.user.name} — ` : ""}${ev.title} (${ev.status || "Pending"})`}
      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold shadow-2xs ${chipClass(ev)}`}
    >
      {isWfhEvent(ev) && <Laptop className="h-3 w-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </div>
  );
}

// Week columns are tall, so a team member's name and their leave type get a line each
function WeekEventChip({ ev, isTeamView }: { ev: CalendarEvent; isTeamView: boolean }) {
  const headline = isTeamView ? (ev.user?.is_self ? "You" : ev.user?.name || "Member") : ev.title || "Leave";
  return (
    <div
      title={`${ev.user?.name ? `${ev.user.name} — ` : ""}${ev.title} (${ev.status || "Pending"})`}
      className={`rounded-md border px-2 py-1 shadow-2xs ${chipClass(ev)}`}
    >
      <div className="flex items-center gap-1 text-[11px] font-bold">
        {isWfhEvent(ev) && <Laptop className="h-3 w-3 shrink-0" />}
        <span className="truncate">{headline}</span>
      </div>
      {isTeamView && <div className="truncate text-[10.5px] font-semibold opacity-80">{ev.title}</div>}
    </div>
  );
}

function HolidayChip({ ev }: { ev: CalendarEvent }) {
  return (
    <div
      title={ev.title}
      className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700 shadow-2xs dark:border-rose-800/60 dark:bg-rose-900/50 dark:text-rose-200"
    >
      <Gift className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{ev.title}</span>
    </div>
  );
}

const WeekendPill = ({ className = "" }: { className?: string }) => (
  <span
    className={`rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 ${className}`}
  >
    Weekend
  </span>
);

const TodayMark = () => (
  <span className="portal-accent-text flex items-center gap-1 text-[11px] font-bold">
    <span className="portal-accent-solid h-1.5 w-1.5 rounded-full" />
    Today
  </span>
);

/* ── Month ─────────────────────────────────────────────────────────── */

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  isTeamView: boolean;
  onSelect: (day: Date) => void;
}

export function MonthView({ days, currentDate, selectedDate, events, isTeamView, onSelect }: MonthViewProps) {
  return (
    <div>
      <div className="grid grid-cols-7 border-y border-slate-200/70 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const selected = !!selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);
          const dayEvents = eventsOnDay(events, day);
          const holidays = dayEvents.filter(isCompanyHoliday);
          const people = dayEvents.filter(isPeopleEvent).sort(comparePeopleEvents);
          const weekend = dayEvents.some(isWeekendEvent);
          const nonWorking = weekend || holidays.length > 0;
          const shown = isTeamView ? people.slice(0, MAX_TEAM_CHIPS) : people;

          const bg = today
            ? "portal-accent-tint"
            : !inMonth
            ? nonWorking
              ? "bg-rose-50/40 dark:bg-rose-950/10"
              : "bg-slate-50/60 dark:bg-slate-900/40"
            : nonWorking
            ? "bg-rose-50/80 dark:bg-rose-950/20"
            : "bg-white dark:bg-slate-900";
          const numberColor = today
            ? "portal-accent-text"
            : !inMonth
            ? "text-slate-300 dark:text-slate-600"
            : nonWorking
            ? "text-rose-600 dark:text-rose-400"
            : "text-slate-800 dark:text-slate-100";

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={format(day, "EEEE, d MMMM yyyy")}
              onClick={() => onSelect(day)}
              onKeyDown={cellKeyDown(() => onSelect(day))}
              className={`portal-focus-inset relative flex min-h-[96px] cursor-pointer flex-col gap-1 border-b border-r border-slate-100 p-1.5 transition-colors hover:brightness-[0.98] sm:min-h-[112px] sm:p-2 dark:border-slate-800 ${bg} ${
                selected ? "portal-accent-ring z-10 ring-2 ring-inset" : ""
              }`}
            >
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[15px] font-bold leading-none ${numberColor}`}>{format(day, "d")}</span>
                {today && <TodayMark />}
                {inMonth && weekend && <WeekendPill className="hidden sm:inline-flex" />}
              </div>

              {inMonth && holidays.map((h) => (
                <div key={h.id}>
                  <div className="hidden sm:block">
                    <HolidayChip ev={h} />
                  </div>
                  <Gift className="ml-auto h-3.5 w-3.5 text-rose-500 sm:hidden" />
                </div>
              ))}

              {inMonth && people.length > 0 && (
                <>
                  {/* Desktop: labelled chips */}
                  <div className="hidden space-y-1 sm:block">
                    {shown.map((ev) => (
                      <EventChip key={ev.id} ev={ev} label={isTeamView ? personLabel(ev) : ev.title || "Leave"} />
                    ))}
                    {isTeamView && people.length > MAX_TEAM_CHIPS && (
                      <div className="text-center text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                        +{people.length - MAX_TEAM_CHIPS} more
                      </div>
                    )}
                  </div>
                  {/* Mobile: dots, details are in the day panel */}
                  <div className="flex flex-wrap justify-end gap-0.5 sm:hidden">
                    {people.slice(0, 6).map((ev) => (
                      <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${dotClass(ev)}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week ──────────────────────────────────────────────────────────── */

interface WeekViewProps {
  days: Date[];
  selectedDate: Date | null;
  events: CalendarEvent[];
  isTeamView: boolean;
  onSelect: (day: Date) => void;
}

export function WeekView({ days, selectedDate, events, isTeamView, onSelect }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-200/70 md:grid-cols-7 md:divide-x md:divide-y-0 dark:divide-slate-800 dark:border-slate-800">
      {days.map((day) => {
        const selected = !!selectedDate && isSameDay(day, selectedDate);
        const today = isToday(day);
        const dayEvents = eventsOnDay(events, day);
        const holidays = dayEvents.filter(isCompanyHoliday);
        const people = dayEvents.filter(isPeopleEvent).sort(comparePeopleEvents);
        const weekend = dayEvents.some(isWeekendEvent);
        const nonWorking = weekend || holidays.length > 0;

        const bg = today
          ? "portal-accent-tint"
          : nonWorking
          ? "bg-rose-50/80 dark:bg-rose-950/20"
          : "bg-white dark:bg-slate-900";

        return (
          <div
            key={day.toISOString()}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={format(day, "EEEE, d MMMM yyyy")}
            onClick={() => onSelect(day)}
            onKeyDown={cellKeyDown(() => onSelect(day))}
            className={`portal-focus-inset flex min-h-[110px] cursor-pointer flex-col gap-2 p-3 transition-colors md:min-h-[320px] ${bg} ${
              selected ? "portal-accent-ring relative z-10 ring-2 ring-inset" : ""
            }`}
          >
            <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1.5">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400">
                {format(day, "EEE").toUpperCase()}
              </span>
              <span
                className={`flex h-8 min-w-8 items-center justify-center rounded-full text-lg font-extrabold ${
                  today
                    ? "portal-accent-solid px-1"
                    : nonWorking
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {format(day, "d")}
              </span>
              {weekend && <WeekendPill />}
            </div>

            {holidays.map((h) => (
              <HolidayChip key={h.id} ev={h} />
            ))}
            {people.length > 0 && (
              <div className="space-y-1">
                {people.map((ev) => (
                  <WeekEventChip key={ev.id} ev={ev} isTeamView={isTeamView} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── List ──────────────────────────────────────────────────────────── */

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "nonworking", label: "Non-working" },
  { id: "holiday", label: "Holidays" },
  { id: "weekend", label: "Weekends" },
  { id: "leave", label: "Leave" },
  { id: "wfh", label: "WFH" },
];

function rowIcon(ev: CalendarEvent) {
  if (isCompanyHoliday(ev)) return <Gift className="h-4 w-4 text-rose-500" />;
  if (isWeekendEvent(ev)) return <CalendarIcon className="h-4 w-4 text-violet-500" />;
  if (isWfhEvent(ev)) return <Laptop className="h-4 w-4 text-sky-600" />;
  return <Leaf className="h-4 w-4 text-emerald-600" />;
}

interface ListViewProps {
  events: CalendarEvent[];
  month: Date;
  filter: ListFilter;
  onFilterChange: (filter: ListFilter) => void;
  isTeamView: boolean;
}

export function ListView({ events, month, filter, onFilterChange, isTeamView }: ListViewProps) {
  const groups = useMemo(() => buildListGroups(events, month, filter), [events, month, filter]);

  return (
    <div className="space-y-4 border-t border-slate-200/70 p-4 sm:p-5 dark:border-slate-800">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter events">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              filter === f.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-slate-400">
          Nothing to show for {format(month, "MMMM yyyy")}
          {filter !== "all" ? " with this filter" : ""}.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const date = parseISO(group.key);
            const offDay = group.events.some((e) => isCompanyHoliday(e) || isWeekendEvent(e));
            return (
              <div key={group.key} className="flex items-start gap-3">
                <div
                  className={`w-14 shrink-0 rounded-xl border py-1.5 text-center ${
                    offDay
                      ? "border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
                      : "portal-accent-tint portal-accent-border portal-accent-text"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">{format(date, "EEE")}</div>
                  <div className="text-xl font-extrabold leading-none">{format(date, "d")}</div>
                  <div className="text-[10px] font-semibold opacity-80">{format(date, "MMM")}</div>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  {group.events.map((ev) => {
                    const badge = eventBadge(ev);
                    const title = isWeekendEvent(ev)
                      ? format(date, "EEEE")
                      : isPeopleEvent(ev) && isTeamView
                      ? personLabel(ev, true)
                      : ev.title;
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                            {rowIcon(ev)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                            {isPeopleEvent(ev) && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {formatEventRange(ev)}
                              </p>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
