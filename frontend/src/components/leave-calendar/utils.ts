import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import type {
  CalendarEvent,
  CalendarPrefs,
  ListFilter,
  MonthStats,
  UpcomingDay,
  UpcomingItem,
} from "./types";

export const toKey = (d: Date) => format(d, "yyyy-MM-dd");

const dayPart = (s?: string) => (s || "").split(" ")[0].split("T")[0];
export const startKey = (e: CalendarEvent) => dayPart(e.date);
export const endKey = (e: CalendarEvent) => dayPart(e.end_date) || dayPart(e.date);

export const isWeekendEvent = (e: CalendarEvent) =>
  e.type === "Holiday" &&
  (String(e.id).startsWith("weekend_") || e.title === "Saturday" || e.title === "Sunday");
export const isCompanyHoliday = (e: CalendarEvent) => e.type === "Holiday" && !isWeekendEvent(e);
export const isWfhEvent = (e: CalendarEvent) => e.type === "WFH";
export const isPeopleEvent = (e: CalendarEvent) => e.type !== "Holiday";
export const isLeaveEvent = (e: CalendarEvent) => e.type !== "Holiday" && e.type !== "WFH";
// Events from before the API sent `user` belong to the viewer
export const isSelfEvent = (e: CalendarEvent) => !e.user || !!e.user.is_self;

export const occursOn = (e: CalendarEvent, key: string) => {
  const start = startKey(e);
  return !!start && key >= start && key <= endKey(e);
};

export const eventsOnDay = (events: CalendarEvent[], day: Date) => {
  const key = toKey(day);
  return events.filter((e) => occursOn(e, key));
};

export const applyPrefs = (events: CalendarEvent[], prefs: CalendarPrefs) =>
  events.filter((e) => {
    if (isWfhEvent(e) && !prefs.wfh) return false;
    if (isLeaveEvent(e) && !prefs.leave) return false;
    if (isPeopleEvent(e) && !isSelfEvent(e) && !prefs.team) return false;
    return true;
  });

/* ── Chip styling & labels ─────────────────────────────────────────── */

export const wfhChipClass =
  "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800";

export const leaveChipClass = (status?: string) =>
  status === "Approved"
    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    : status === "Rejected"
    ? "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
    : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";

export const chipClass = (e: CalendarEvent) =>
  isWfhEvent(e) ? wfhChipClass : leaveChipClass(e.status);

export const dotClass = (e: CalendarEvent) =>
  isWfhEvent(e) ? "bg-sky-500" : e.status === "Approved" ? "bg-emerald-500" : "bg-amber-500";

// Self first, then Leave before WFH, then by name
export const comparePeopleEvents = (a: CalendarEvent, b: CalendarEvent) => {
  const selfDiff = Number(!!b.user?.is_self) - Number(!!a.user?.is_self);
  if (selfDiff !== 0) return selfDiff;
  if (a.type !== b.type) return isWfhEvent(a) ? 1 : -1;
  return (a.user?.name || "").localeCompare(b.user?.name || "");
};

/** "You · WFH" / "Anu · Sick Leave" (first name, or full name when `full`) */
export const personLabel = (e: CalendarEvent, full = false) => {
  const name = e.user?.name || "";
  const who = e.user?.is_self ? "You" : full ? name || "Member" : name.split(" ")[0] || "Member";
  return `${who} · ${e.title || (isWfhEvent(e) ? "WFH" : "Leave")}`;
};

export const eventBadge = (e: CalendarEvent): { label: string; className: string } => {
  if (e.type === "Holiday") {
    return {
      label: isWeekendEvent(e) ? "Weekend" : "Company Holiday",
      className:
        "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
    };
  }
  const approved = e.status === "Approved";
  if (isWfhEvent(e)) {
    return {
      label: approved ? "Approved WFH" : "WFH Request",
      className: approved
        ? "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800"
        : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    };
  }
  return {
    label: approved ? "Approved Leave" : "Leave Request",
    className: approved
      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
      : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  };
};

/** "22 Sep 2026" or "22 – 23 Sep 2026" */
export const formatEventRange = (e: CalendarEvent) => {
  const start = startKey(e);
  const end = endKey(e);
  if (!start) return "";
  try {
    if (start === end) return format(parseISO(start), "dd MMM yyyy");
    return `${format(parseISO(start), "dd MMM")} – ${format(parseISO(end), "dd MMM yyyy")}`;
  } catch {
    return start;
  }
};

/* ── Month stats (cards) ───────────────────────────────────────────── */

const isHalfDay = (e: CalendarEvent) =>
  /half/i.test(e.title || "") || (e.duration || "").startsWith("Half");

export function computeMonthStats(events: CalendarEvent[], month: Date): MonthStats {
  const monthStart = toKey(startOfMonth(month));
  const monthEnd = toKey(endOfMonth(month));
  const inMonth = (k: string) => k >= monthStart && k <= monthEnd;

  const holidayDates = new Set<string>();
  const weekendDates = new Set<string>();

  events.forEach((e) => {
    if (e.type !== "Holiday") return;
    const k = startKey(e);
    if (!k || !inMonth(k)) return;
    if (isWeekendEvent(e)) {
      weekendDates.add(k);
    } else {
      holidayDates.add(k);
      // A company holiday that lands on Sat/Sun is still a weekend day
      const dow = parseISO(k).getDay();
      if (dow === 0 || dow === 6) weekendDates.add(k);
    }
  });

  const nonWorking = new Set([...holidayDates, ...weekendDates]);

  // Own leave days this month, skipping weekends/holidays; half-days count 0.5
  let approved = 0;
  let pending = 0;
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  events
    .filter(
      (e) =>
        isLeaveEvent(e) && isSelfEvent(e) && !/wfh|work from home/i.test(e.title || "")
    )
    .forEach((e) => {
      const weight = isHalfDay(e) ? 0.5 : 1;
      daysInMonth.forEach((d) => {
        const k = toKey(d);
        if (!occursOn(e, k) || nonWorking.has(k)) return;
        if (e.status === "Approved") approved += weight;
        else pending += weight;
      });
    });

  return {
    companyHolidays: holidayDates.size,
    weekends: weekendDates.size,
    nonWorkingDays: nonWorking.size,
    leaves: { approved, pending, total: approved + pending },
  };
}

export const formatCount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ── Upcoming (next 7 days) ────────────────────────────────────────── */

const MAX_UPCOMING_ITEMS_PER_DAY = 3;

export function buildUpcoming(
  events: CalendarEvent[],
  from: Date,
  isTeamView: boolean,
  days = 7
): UpcomingDay[] {
  const result: UpcomingDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const dayEvents = eventsOnDay(events, date);
    if (dayEvents.length === 0) continue;

    const ordered = [
      ...dayEvents.filter(isCompanyHoliday),
      ...dayEvents.filter(isWeekendEvent),
      ...dayEvents.filter(isPeopleEvent).sort(comparePeopleEvents),
    ];
    const items: UpcomingItem[] = ordered.map((e) => ({
      key: String(e.id),
      label: isWeekendEvent(e)
        ? format(date, "EEEE")
        : isPeopleEvent(e) && isTeamView
        ? personLabel(e)
        : e.title,
      kind: isCompanyHoliday(e) ? "holiday" : isWeekendEvent(e) ? "weekend" : isWfhEvent(e) ? "wfh" : "leave",
    }));

    result.push({
      date,
      items: items.slice(0, MAX_UPCOMING_ITEMS_PER_DAY),
      more: Math.max(0, items.length - MAX_UPCOMING_ITEMS_PER_DAY),
    });
  }
  return result;
}

/* ── List view ─────────────────────────────────────────────────────── */

export const matchesFilter = (e: CalendarEvent, filter: ListFilter) => {
  switch (filter) {
    case "nonworking":
      return e.type === "Holiday";
    case "holiday":
      return isCompanyHoliday(e);
    case "weekend":
      return isWeekendEvent(e);
    case "leave":
      return isLeaveEvent(e);
    case "wfh":
      return isWfhEvent(e);
    default:
      return true;
  }
};

const kindOrder = (e: CalendarEvent) => (isCompanyHoliday(e) ? 0 : isWeekendEvent(e) ? 1 : 2);

/** Events overlapping `month`, filtered, one row per event at its (clamped) start date */
export function buildListGroups(events: CalendarEvent[], month: Date, filter: ListFilter) {
  const monthStart = toKey(startOfMonth(month));
  const monthEnd = toKey(endOfMonth(month));

  const rows = events
    .filter((e) => matchesFilter(e, filter))
    .filter((e) => startKey(e) && startKey(e) <= monthEnd && endKey(e) >= monthStart)
    .map((e) => ({ e, key: startKey(e) < monthStart ? monthStart : startKey(e) }))
    .sort(
      (a, b) =>
        a.key.localeCompare(b.key) ||
        kindOrder(a.e) - kindOrder(b.e) ||
        comparePeopleEvents(a.e, b.e)
    );

  const groups: { key: string; events: CalendarEvent[] }[] = [];
  rows.forEach(({ e, key }) => {
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(e);
    else groups.push({ key, events: [e] });
  });
  return groups;
}
