"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarDays,
  CalendarOff,
  Gift,
  Calendar as CalendarIcon,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Laptop,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  Sparkles,
  Settings2,
  X,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar } from "@/components/ui/RoyalAvatar";
import { Portal } from "@/components/ui/portal";
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
  isSameDay,
  isToday,
  parseISO,
  setMonth,
  setYear,
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const HOLIDAY_TYPES = [
  {
    value: "National Holiday",
    label: "National Holiday",
    cls: "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  },
  {
    value: "Festival Holiday",
    label: "Festival Holiday",
    cls: "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  },
  {
    value: "Company Holiday",
    label: "Company Holiday",
    cls: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  {
    value: "Optional Holiday",
    label: "Optional Holiday",
    cls: "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
  },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Approved leave / WFH entries for the month (Super Admin only), from GET /calendar/overview
interface PeopleEvent {
  id: string;
  type: "Leave" | "WFH";
  title: string;
  start_date: string;
  end_date: string;
  days?: number | string | null;
  duration?: string | null;
  reason?: string | null;
  user: {
    id: number;
    name: string;
    employee_code?: string | null;
    designation?: string | null;
    profile_photo_path?: string | null;
    team?: string | null;
  };
}

interface DayPeople {
  leave: PeopleEvent[];
  wfh: PeopleEvent[];
}

const EMPTY_DAY_PEOPLE: DayPeople = { leave: [], wfh: [] };

// One row per employee; a person with several entries that day (e.g. two half-days) is grouped
function groupByEmployee(entries: PeopleEvent[]) {
  const byUser = new Map<number, { user: PeopleEvent["user"]; entries: PeopleEvent[] }>();
  entries.forEach((e) => {
    const group = byUser.get(e.user.id);
    if (group) group.entries.push(e);
    else byUser.set(e.user.id, { user: e.user, entries: [e] });
  });
  return Array.from(byUser.values()).sort((a, b) => a.user.name.localeCompare(b.user.name));
}

function formatEntryDates(e: PeopleEvent) {
  try {
    const start = parseISO(e.start_date);
    const end = parseISO(e.end_date);
    if (e.start_date === e.end_date) return format(start, "dd MMM yyyy");
    return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
  } catch {
    return e.start_date;
  }
}

function formatDays(days?: number | string | null) {
  const n = Number(days);
  if (!days || Number.isNaN(n)) return null;
  return `${n} ${n === 1 ? "day" : "days"}`;
}

// Normalize any date representation (ISO timestamp, YYYY-MM-DD, Date object) to "YYYY-MM-DD"
const toDateKey = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") {
    return val.substring(0, 10);
  }
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return String(val).substring(0, 10);
  }
};

export default function HolidaysPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin =
    user?.role === "Super Admin" ||
    (user as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    user?.role === "HR";

  // Per-day leave/WFH counts + side popup (backed by the Super Admin-only /calendar/overview)
  const canViewPeople = isSuperAdmin;

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Data State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Leave / WFH overview (Super Admin) + day side popup
  const [peopleEvents, setPeopleEvents] = useState<PeopleEvent[]>([]);
  const [peopleDrawer, setPeopleDrawer] = useState<{ date: string; tab: "leave" | "wfh" } | null>(null);

  // Admin Management Dialog States
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<"holidays" | "overrides">("holidays");
  const [showDialog, setShowDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Holiday Form
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("Company Holiday");
  const [description, setDescription] = useState("");

  // Override Form
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Manage panel: weekend-month picker + inline override expansion
  const [manageOverrideMonth, setManageOverrideMonth] = useState(new Date().getMonth());
  const [manageOverrideYear, setManageOverrideYear] = useState(new Date().getFullYear());
  const [inlineOverrideDate, setInlineOverrideDate] = useState<string | null>(null);
  const [inlineOverrideReason, setInlineOverrideReason] = useState("");
  const [inlineOverrideLoading, setInlineOverrideLoading] = useState(false);

  useEffect(() => {
    fetchHolidays();
    fetchOverrides();
  }, []);

  // Close popups on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setShowAdminMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load approved leave/WFH for the visible month (Super Admin only)
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();
  useEffect(() => {
    if (!canViewPeople) return;
    let cancelled = false;
    api
      .get(`/calendar/overview?month=${viewMonth + 1}&year=${viewYear}`)
      .then((res) => {
        if (!cancelled) setPeopleEvents(res.data?.data || []);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setPeopleEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canViewPeople, viewYear, viewMonth]);

  // Expand each entry across its date range: { "yyyy-MM-dd": { leave: [...], wfh: [...] } }
  const peopleByDay = useMemo(() => {
    const map: Record<string, DayPeople> = {};
    peopleEvents.forEach((ev) => {
      try {
        const start = parseISO(ev.start_date);
        let end = parseISO(ev.end_date);
        if (end < start) end = start;
        eachDayOfInterval({ start, end }).forEach((d) => {
          const key = format(d, "yyyy-MM-dd");
          const bucket = (map[key] ||= { leave: [], wfh: [] });
          (ev.type === "WFH" ? bucket.wfh : bucket.leave).push(ev);
        });
      } catch {
        // skip entries with unparseable dates
      }
    });
    return map;
  }, [peopleEvents]);

  // Escape closes the side popup
  useEffect(() => {
    if (!peopleDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPeopleDrawer(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [peopleDrawer]);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/holidays");
      setHolidays(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverrides = async () => {
    try {
      const res = await api.get("/working-days-overrides");
      const list = (res.data?.data || []).map((o: any) => ({
        ...o,
        date: toDateKey(o.date),
      }));
      setOverrides(list);
    } catch (e) {
      console.error(e);
    }
  };

  // Month navigation helpers
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleSelectMonth = (monthIdx: number) => {
    setCurrentDate(setMonth(currentDate, monthIdx));
    setIsMonthPickerOpen(false);
  };

  const handleSelectYear = (yearNum: number) => {
    setCurrentDate(setYear(currentDate, yearNum));
  };

  // ── STATS CALCULATION FOR CURRENT MONTH ──
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const currentMonthKey = format(currentDate, "yyyy-MM");

  // Company holidays this month
  const holidaysThisMonth = holidays.filter((h) => {
    try {
      return format(parseISO(h.date), "yyyy-MM") === currentMonthKey;
    } catch {
      return false;
    }
  });
  const companyHolidaysCount = holidaysThisMonth.length;

  // Weekend days this month (Saturdays and Sundays not overridden)
  let weekendsCount = 0;
  monthDays.forEach((day) => {
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const dateStr = format(day, "yyyy-MM-dd");
      const isOverridden = overrides.some((o) => toDateKey(o.date) === dateStr);
      if (!isOverridden) {
        weekendsCount++;
      }
    }
  });

  // Total non-working days (weekends + holidays that don't fall on already counted weekends)
  let holidaysOnWeekdaysCount = 0;
  holidaysThisMonth.forEach((h) => {
    try {
      const d = parseISO(h.date);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        holidaysOnWeekdaysCount++;
      }
    } catch {}
  });
  const totalNonWorkingDays = weekendsCount + holidaysOnWeekdaysCount;

  // ── CALENDAR GRID DAYS CALCULATION (Starting on Sunday) ──
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // ── ADMIN ACTIONS ──
  const seedKeralaHolidays = async () => {
    if (
      !confirm(
        "This will pre-populate the official Kerala Bank & Public Holidays (Christmas, Gandhi Jayanthi, Vishu, Onam, Bakrid, etc.). Proceed?"
      )
    ) {
      return;
    }
    setSeedingLoading(true);
    try {
      const res = await api.post("/holidays/seed-kerala");
      const msg = res.data?.message || "Kerala bank holidays processed successfully!";
      setSuccessMessage(msg);
      setShowSuccess(true);
      fetchHolidays();
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message || "Error adding Kerala holidays.";
      alert(msg);
    } finally {
      setSeedingLoading(false);
    }
  };

  const openNewHoliday = () => {
    setEditId(null);
    setName("");
    setDate(format(currentDate, "yyyy-MM-dd"));
    setType("Company Holiday");
    setDescription("");
    setShowDialog(true);
  };

  const openEditHoliday = (h: any) => {
    setEditId(h.id);
    setName(h.name);
    setDate(h.date);
    setType(h.type || "Company Holiday");
    setDescription(h.description || "");
    setShowDialog(true);
  };

  const saveHoliday = async () => {
    if (!name || !date || !type) return;
    setActionLoading(true);
    try {
      const payload = { name, date, type, description };
      if (editId) {
        await api.put(`/holidays/${editId}`, payload);
        setHolidays(holidays.map((h) => (h.id === editId ? { ...h, ...payload } : h)));
        setSuccessMessage("Holiday updated successfully!");
      } else {
        const res = await api.post("/holidays", payload);
        const newHoliday = res.data?.data || { id: Date.now(), ...payload };
        setHolidays([...holidays, newHoliday]);
        setSuccessMessage("Holiday added successfully!");
      }
      setShowDialog(false);
      setShowSuccess(true);
      setTimeout(() => fetchHolidays(), 800);
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message || "Error saving holiday.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      await api.delete(`/holidays/${id}`);
      setHolidays(holidays.filter((h) => h.id !== id));
      setSuccessMessage("Holiday removed.");
      setShowSuccess(true);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error deleting holiday.");
    }
  };

  const openNewOverride = () => {
    setOverrideDate(format(currentDate, "yyyy-MM-dd"));
    setOverrideReason("");
    setShowOverrideDialog(true);
  };

  const saveOverride = async () => {
    if (!overrideDate) return;
    setActionLoading(true);
    const dateKey = toDateKey(overrideDate);
    try {
      const res = await api.post("/working-days-overrides", {
        date: dateKey,
        reason: overrideReason || "Compensatory Working Day",
      });
      // Optimistic update — do NOT call fetchOverrides() here; it races with
      // this state update and can wipe the new entry before it's committed.
      const raw = res.data?.data;
      const newOverride = {
        id: raw?.id || Date.now(),
        date: toDateKey(raw?.date) || dateKey,
        reason: raw?.reason || overrideReason || "Compensatory Working Day",
      };
      setOverrides((prev) => [...prev.filter((o) => toDateKey(o.date) !== dateKey), newOverride]);
      setShowOverrideDialog(false);
      setSuccessMessage("Working day override saved successfully!");
      setShowSuccess(true);
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message || "Error saving override.";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOverride = async (id: number | string) => {
    if (!confirm("Delete this working day override? The day will revert to being a weekend.")) return;
    // Optimistic update — remove immediately, revert only on API error.
    setOverrides((prev) => prev.filter((o) => String(o.id) !== String(id) && toDateKey(o.date) !== String(id)));
    try {
      await api.delete(`/working-days-overrides/${id}`);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error deleting override.");
      fetchOverrides(); // revert optimistic on error only
    }
  };

  // Inline override save (used inside the manage panel weekend list)
  const saveInlineOverride = async (dateStr: string) => {
    setInlineOverrideLoading(true);
    const dateKey = toDateKey(dateStr);
    try {
      const res = await api.post("/working-days-overrides", {
        date: dateKey,
        reason: inlineOverrideReason || "Compensatory Working Day",
      });
      // Optimistic update — do NOT call fetchOverrides() here (race condition).
      const raw = res.data?.data;
      const newOverride = {
        id: raw?.id || Date.now(),
        date: toDateKey(raw?.date) || dateKey,
        reason: raw?.reason || inlineOverrideReason || "Compensatory Working Day",
      };
      setOverrides((prev) => [...prev.filter((o) => toDateKey(o.date) !== dateKey), newOverride]);
      setInlineOverrideDate(null);
      setInlineOverrideReason("");
    } catch (e: any) {
      const msg = e.response?.data?.message || "Error saving override.";
      alert(msg);
    } finally {
      setInlineOverrideLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Side popup data: who is on leave / WFH on the clicked day, one row per employee
  const drawerDay = peopleDrawer ? peopleByDay[peopleDrawer.date] ?? EMPTY_DAY_PEOPLE : null;
  const drawerLeaveRows = drawerDay ? groupByEmployee(drawerDay.leave) : [];
  const drawerWfhRows = drawerDay ? groupByEmployee(drawerDay.wfh) : [];
  const drawerRows = peopleDrawer?.tab === "wfh" ? drawerWfhRows : drawerLeaveRows;

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-5 pb-12 relative"
    >
      {/* ── TOP RIGHT SUBTLE DECORATIVE BLOBS (MATCHING SCREENSHOT) ── */}
      <div className="absolute -top-6 right-0 w-52 h-44 pointer-events-none select-none overflow-hidden z-0">
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Pink circle */}
          <circle cx="165" cy="28" r="22" fill="#FCE7F3" opacity="0.8" />
          {/* Soft botanical curved leaf shapes */}
          <path
            d="M135 75C125 50 160 30 185 55C185 80 160 100 135 75Z"
            fill="#DBEAFE"
            opacity="0.6"
          />
          <path
            d="M100 100C90 75 125 55 150 80C150 105 125 125 100 100Z"
            fill="#E0E7FF"
            opacity="0.5"
          />
          <path
            d="M150 120C140 95 175 75 195 100C195 125 175 145 150 120Z"
            fill="#EFF6FF"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* ── 1. HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        {/* Left: Icon, Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
            <CalendarDays className="w-7 h-7 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight m-0">
              Holiday Calendar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              View company holidays and weekends at a glance.
            </p>
          </div>
        </div>

        {/* Right: Month Controls & Today Button */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Navigation Pill (< | Month Year v | >) */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-xl shadow-2xs overflow-visible relative">
            {/* Prev Month */}
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 sm:px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-r border-slate-200 dark:border-slate-700"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* Month & Year Dropdown Trigger */}
            <div className="relative" ref={monthPickerRef}>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                className="px-3.5 sm:px-4 py-2 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <span>{format(currentDate, "MMMM yyyy")}</span>
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-slate-500" />
              </button>

              {/* Month & Year Picker Popover */}
              {isMonthPickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Year selector */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Select Month & Year
                    </span>
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => handleSelectYear(Number(e.target.value))}
                      className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border-0 rounded px-2 py-1 text-slate-800 dark:text-white focus:outline-none"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Months Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_NAMES.map((m, idx) => {
                      const isSelected = currentDate.getMonth() === idx;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMonth(idx)}
                          className={`text-xs py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer truncate ${
                            isSelected
                              ? "bg-[#56348f] text-white"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {m.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Next Month */}
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 sm:px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-l border-slate-200 dark:border-slate-700"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={goToToday}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-2xs"
          >
            Today
          </button>

          {/* Admin Management Menu */}
          {isSuperAdmin && (
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={() => setShowAdminMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-xl text-xs sm:text-sm font-bold text-[#56348f] dark:text-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
                title="Admin Holiday Management"
              >
                <Settings2 className="w-4 h-4" />
                <span>Admin</span>
              </button>

              {/* Render via Portal so it is never clipped by KPI card stacking contexts */}
              {showAdminMenu && (
                <Portal>
                  <div
                    style={{
                      position: "fixed",
                      top: (adminMenuRef.current?.getBoundingClientRect().bottom ?? 0) + 8,
                      right: window.innerWidth - (adminMenuRef.current?.getBoundingClientRect().right ?? 0),
                      zIndex: 99999,
                    }}
                    className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100 space-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminMenu(false);
                        openNewHoliday();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-600" />
                      <span>Add New Holiday</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminMenu(false);
                        openNewOverride();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left cursor-pointer"
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Mark Weekend Working</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminMenu(false);
                        seedKeralaHolidays();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pre-add Kerala Holidays</span>
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          setShowManageModal(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Manage All / View List</span>
                      </button>
                    </div>
                  </div>
                </Portal>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. METRIC STATS ROW (4 CARDS MATCHING SCREENSHOT) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* Card 1: Company Holiday */}
        <div className="bg-[#F8FAFC] dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-750 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-500 shrink-0">
            <Gift className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white leading-none">
              {companyHolidaysCount}
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate block">
                Company Holiday
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                This Month
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Weekends */}
        <div className="bg-[#F8FAFC] dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-750 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <CalendarIcon className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white leading-none">
              {weekendsCount}
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate block">
                Weekends
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                This Month
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Non-Working Days */}
        <div className="bg-[#F8FAFC] dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-750 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <CalendarCheck2 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white leading-none">
              {totalNonWorkingDays}
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate block">
                Total Non-Working Days
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                Holidays + Weekends
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Legend Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 flex flex-wrap items-center justify-around gap-x-3 gap-y-2 shadow-2xs">
          {/* Legend 1 */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-2xs" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Company Holiday / Weekend
            </span>
          </div>

          {/* Legend 2 */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-200 dark:bg-indigo-400 shrink-0 shadow-2xs" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Working Day
            </span>
          </div>

          {canViewPeople && (
            <>
              {/* Legend 3 */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  On Leave
                </span>
              </div>

              {/* Legend 4 */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0 shadow-2xs" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Work From Home
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 3. MAIN CALENDAR GRID ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dayName) => (
            <div
              key={dayName}
              className="py-3 text-center text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 border-t-0">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const dateStr = format(day, "yyyy-MM-dd");
            const dayOfWeek = day.getDay(); // 0 = Sun, 6 = Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Check if there is a working day override on this date
            const override = overrides.find((o) => toDateKey(o.date) === dateStr);
            const isWorkingWeekend = isWeekend && !!override;

            // Check if there is a holiday on this date
            const holiday = holidays.find((h) => toDateKey(h.date) === dateStr);

            // Determine weekend background and text colors
            const isTreatedAsWeekend = isWeekend && !isWorkingWeekend && isCurrentMonth;

            // Distinct employees on approved leave / WFH. Only counted on working days:
            // a leave range that spans a weekend or holiday is not a leave day there.
            const dayPeople =
              canViewPeople && isCurrentMonth && !isTreatedAsWeekend && !holiday
                ? peopleByDay[dateStr] ?? EMPTY_DAY_PEOPLE
                : EMPTY_DAY_PEOPLE;
            const leaveCount = new Set(dayPeople.leave.map((e) => e.user.id)).size;
            const wfhCount = new Set(dayPeople.wfh.map((e) => e.user.id)).size;

            return (
              <div
                key={dateStr + idx}
                className={`group/day min-h-[105px] sm:min-h-[115px] p-2 sm:p-2.5 flex flex-col justify-between border-b border-r border-slate-100 dark:border-slate-750 transition-colors relative ${
                  isTreatedAsWeekend
                    ? "bg-[#FFF5F6] dark:bg-rose-950/15"
                    : isWorkingWeekend
                    ? "bg-purple-50/40 dark:bg-purple-950/20"
                    : "bg-white dark:bg-slate-800"
                } ${!isCurrentMonth ? "bg-white/60 dark:bg-slate-850/40" : ""}`}
              >
              {/* Top Row: Date number + quick-add button for Super Admin */}
                <div className="flex justify-between items-center w-full">
                  {/* Quick add holiday button (Super Admin only, visible on hover) */}
                  {isSuperAdmin && isCurrentMonth ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditId(null);
                        setName("");
                        setDate(dateStr);
                        setType("Company Holiday");
                        setDescription("");
                        setShowDialog(true);
                      }}
                      title={`Add holiday on ${format(day, "d MMMM")}`}
                      className="opacity-0 group-hover/day:opacity-100 w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      !isCurrentMonth
                        ? "text-slate-300 dark:text-slate-600"
                        : isTreatedAsWeekend || (holiday && isCurrentMonth)
                        ? "text-rose-500 dark:text-rose-400 font-bold"
                        : isWorkingWeekend
                        ? "text-purple-700 dark:text-purple-300 font-bold"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Middle Content Row: Weekend Badge OR Holiday Card OR Working Override */}
                {isCurrentMonth && (
                  <div className="my-auto w-full flex items-center justify-center">
                    {/* CASE A: Weekday Holiday */}
                    {holiday && !isWeekend && (
                      <div className="bg-[#FFE4E8] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/50 rounded-lg p-2 w-full shadow-2xs">
                        <div className="flex items-start gap-1.5">
                          <span className="text-rose-600 dark:text-rose-400 font-bold text-sm shrink-0">
                            {format(day, "d")}
                          </span>
                          <span className="text-slate-900 dark:text-white font-bold text-xs leading-snug line-clamp-2 flex-1">
                            {holiday.name}
                          </span>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1 mt-1.5 justify-end">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditHoliday(holiday); }}
                              title="Edit holiday"
                              className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-200/60 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteHoliday(holiday.id); }}
                              title="Delete holiday"
                              className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-200/60 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE B: Weekend Day (Sunday or Saturday, not overridden) */}
                    {isTreatedAsWeekend && !holiday && (
                      <div className="flex flex-col items-center gap-1 w-full">
                        <span className="bg-[#FFE4E8] dark:bg-rose-900/30 text-[#E11D48] dark:text-rose-300 text-[10.5px] font-bold px-3 py-0.5 rounded-md shadow-2xs self-center">
                          Weekend
                        </span>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverrideDate(dateStr);
                              setOverrideReason("");
                              setShowOverrideDialog(true);
                            }}
                            title="Mark as working day"
                            className="opacity-0 group-hover/day:opacity-100 text-[9.5px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 px-2 py-0.5 rounded-md hover:bg-purple-100 transition-all cursor-pointer"
                          >
                            Mark Working
                          </button>
                        )}
                      </div>
                    )}

                    {/* CASE C: Holiday falling on a weekend */}
                    {holiday && isWeekend && (
                      <div className="bg-[#FFE4E8] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/50 rounded-lg p-1.5 w-full shadow-2xs">
                        <div className="flex flex-col items-center text-center">
                          <span className="text-slate-900 dark:text-white font-bold text-xs leading-tight line-clamp-2">
                            {holiday.name}
                          </span>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                            (Weekend Holiday)
                          </span>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1 mt-1 justify-center">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditHoliday(holiday); }}
                              title="Edit holiday"
                              className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-200/60 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteHoliday(holiday.id); }}
                              title="Delete holiday"
                              className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-200/60 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE D: Weekend marked as Working Day */}
                    {isWorkingWeekend && (
                      <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 rounded-lg p-1.5 text-center w-full">
                        <span className="text-[10.5px] font-bold text-purple-700 dark:text-purple-300 block">
                          Working Day
                        </span>
                        {override?.reason && (
                          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block truncate">
                            {override.reason}
                          </span>
                        )}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteOverride(override.id); }}
                            title="Remove working day override (revert to weekend)"
                            className="mt-1 text-[9px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            ✕ Revert to Weekend
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom row: leave / WFH headcount badges (Super Admin) — click opens the day side popup */}
                {leaveCount > 0 || wfhCount > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {leaveCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPeopleDrawer({ date: dateStr, tab: "leave" })}
                        title={`${leaveCount} on leave — click for details`}
                        aria-label={`${leaveCount} on leave on ${format(day, "d MMMM")}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition-colors bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900"
                      >
                        <CalendarOff className="w-3 h-3" />
                        <span>{leaveCount}</span>
                        <span className="hidden xl:inline">Leave</span>
                      </button>
                    )}
                    {wfhCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPeopleDrawer({ date: dateStr, tab: "wfh" })}
                        title={`${wfhCount} working from home — click for details`}
                        aria-label={`${wfhCount} working from home on ${format(day, "d MMMM")}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition-colors bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-200 dark:hover:bg-sky-900"
                      >
                        <Laptop className="w-3 h-3" />
                        <span>{wfhCount}</span>
                        <span className="hidden xl:inline">WFH</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3b. DAY SIDE POPUP: who is on leave / WFH (Super Admin) ── */}
      {peopleDrawer && drawerDay && (
        <Portal>
          <div className="fixed inset-0 z-[99999] overflow-hidden font-sans" data-side-popup="true">
            {/* Backdrop */}
            <div
              onClick={() => setPeopleDrawer(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            />

            {/* Drawer Panel */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Leave and WFH on ${format(parseISO(peopleDrawer.date), "d MMMM yyyy")}`}
              className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 z-[99999] animate-in slide-in-from-right duration-300"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 to-white dark:from-slate-800 dark:to-slate-900 shrink-0 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#56348f] dark:text-purple-300">
                    Leave &amp; WFH
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                    {format(parseISO(peopleDrawer.date), "EEEE, dd MMMM yyyy")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPeopleDrawer(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close (Esc)"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-5 pt-4 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPeopleDrawer({ date: peopleDrawer.date, tab: "leave" })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    peopleDrawer.tab === "leave"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <CalendarOff className="w-3.5 h-3.5" />
                  On Leave ({drawerLeaveRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleDrawer({ date: peopleDrawer.date, tab: "wfh" })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    peopleDrawer.tab === "wfh"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  Work From Home ({drawerWfhRows.length})
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {drawerRows.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 py-6 text-center">
                    {peopleDrawer.tab === "wfh"
                      ? "No one is working from home on this day."
                      : "No one is on leave on this day."}
                  </p>
                ) : (
                  drawerRows.map(({ user: person, entries }) => (
                    <div
                      key={person.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <RoyalAvatar
                          src={person.profile_photo_path}
                          name={person.name}
                          userId={person.id}
                          employeeCode={person.employee_code}
                          className="w-10 h-10 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 text-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{person.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {[person.employee_code, person.designation].filter(Boolean).join(" · ") || "Employee"}
                          </p>
                        </div>
                        {person.team && (
                          <span className="shrink-0 max-w-[40%] truncate text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50">
                            {person.team}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                        {entries.map((e) => {
                          const half =
                            e.duration === "Half-Morning"
                              ? "Morning half"
                              : e.duration === "Half-Afternoon"
                              ? "Afternoon half"
                              : null;
                          const days = formatDays(e.days);
                          return (
                            <div key={e.id} className="text-xs">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded-md border ${
                                    e.type === "WFH"
                                      ? "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                                      : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  }`}
                                >
                                  {e.title}
                                </span>
                                {half && (
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">{half}</span>
                                )}
                              </div>
                              <p className="mt-1 font-medium text-slate-500 dark:text-slate-400">
                                {formatEntryDates(e)}
                                {days ? ` · ${days}` : ""}
                              </p>
                              {e.reason && (
                                <p className="mt-1 text-slate-600 dark:text-slate-300 line-clamp-2" title={e.reason}>
                                  {e.reason}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── 4. ADD / EDIT HOLIDAY MODAL ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-lg font-bold">
              {editId ? "Edit Holiday" : "Add New Holiday"}
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {editId ? "Update details for this holiday." : "Create an official holiday on the company calendar."}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Holiday Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sree Narayana Guru Samadhi"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#56348f] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#56348f] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Holiday Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#56348f] transition-colors"
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description <span className="text-slate-400 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2 outline-none focus:border-[#56348f] resize-none transition-colors"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between gap-3">
            {editId ? (
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  deleteHoliday(editId);
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                Delete
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveHoliday}
                disabled={actionLoading || !name || !date || !type}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#56348f] hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>{editId ? "Update" : "Save Holiday"}</span>
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 5. WEEKEND OVERRIDE MODAL ── */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-lg font-bold">Mark Weekend as Working Day</DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select a Saturday or Sunday to designate as an official working day (e.g. compensatory working day).
            </p>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Weekend Date *
              </label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Reason / Note *
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Compensatory working day for Friday holiday"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 placeholder:text-slate-400 transition-colors"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowOverrideDialog(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveOverride}
              disabled={actionLoading || !overrideDate}
              className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>Save Working Day</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 6. MANAGE ALL HOLIDAYS & OVERRIDES — FULL-HEIGHT SIDE PANEL ── */}
      {showManageModal && (() => {
        // Compute weekends for the selected manage month
        const mStart = startOfMonth(new Date(manageOverrideYear, manageOverrideMonth, 1));
        const mEnd = endOfMonth(mStart);
        const weekendsInMonth = eachDayOfInterval({ start: mStart, end: mEnd })
          .filter((d) => d.getDay() === 0 || d.getDay() === 6);
        return (
          <Portal>
            <div className="fixed inset-0 z-[99998] overflow-hidden">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setShowManageModal(false)}
              />
              {/* Full-height panel */}
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 z-[99999] animate-in slide-in-from-right duration-300"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#56348f] dark:text-purple-300">Admin</p>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">Manage Holidays &amp; Overrides</h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {manageTab === "holidays" && (
                        <button
                          type="button"
                          onClick={() => { setShowManageModal(false); openNewHoliday(); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#56348f] hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Holiday
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowManageModal(false)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setManageTab("holidays")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        manageTab === "holidays" ? "bg-[#56348f] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Holidays ({holidays.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManageTab("overrides")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        manageTab === "overrides" ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Weekend Overrides ({overrides.length})
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  {manageTab === "holidays" ? (
                    <div className="p-5 space-y-2">
                      {holidays.length === 0 ? (
                        <div className="text-center py-16">
                          <Gift className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No holidays added yet.</p>
                          <button
                            type="button"
                            onClick={() => { setShowManageModal(false); openNewHoliday(); }}
                            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#56348f] text-white text-xs font-bold rounded-xl mx-auto cursor-pointer hover:bg-purple-800 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add First Holiday
                          </button>
                        </div>
                      ) : (
                        holidays.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1 mr-3">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{h.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                {h.date} &bull; {h.type || "Company Holiday"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => { setShowManageModal(false); openEditHoliday(h); }}
                                className="p-1.5 text-slate-500 hover:text-[#56348f] dark:hover:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteHoliday(h.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="p-5">
                      {/* Month + Year selector for weekend list */}
                      <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl">
                        <CalendarIcon className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Select Month:</span>
                        <select
                          value={manageOverrideMonth}
                          onChange={(e) => setManageOverrideMonth(Number(e.target.value))}
                          className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                        >
                          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select
                          value={manageOverrideYear}
                          onChange={(e) => setManageOverrideYear(Number(e.target.value))}
                          className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                        >
                          {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>

                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                        {weekendsInMonth.length} Weekends in {MONTH_NAMES[manageOverrideMonth]} {manageOverrideYear}
                      </p>

                      <div className="space-y-2">
                        {weekendsInMonth.map((day) => {
                          const ds = format(day, "yyyy-MM-dd");
                          const existing = overrides.find((o) => toDateKey(o.date) === ds);
                          const isExpanded = inlineOverrideDate === ds;
                          return (
                            <div
                              key={ds}
                              className={`rounded-xl border transition-colors ${
                                existing
                                  ? "border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50"
                              }`}
                            >
                              <div className="flex items-center justify-between p-3.5">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {format(day, "EEEE, dd MMMM yyyy")}
                                  </p>
                                  {existing ? (
                                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mt-0.5">
                                      ✓ Working Day &bull; {existing.reason || "Compensatory"}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-rose-500 font-semibold mt-0.5">Weekend</p>
                                  )}
                                </div>
                                <div className="shrink-0 ml-3">
                                  {existing ? (
                                    <button
                                      type="button"
                                      onClick={() => deleteOverride(existing.id)}
                                      className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 px-2.5 py-1.5 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" /> Revert to Weekend
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInlineOverrideDate(isExpanded ? null : ds);
                                        setInlineOverrideReason("");
                                      }}
                                      className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 px-2.5 py-1.5 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                                    >
                                      <CalendarCheck2 className="w-3 h-3" />
                                      {isExpanded ? "Cancel" : "Mark Working"}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Inline expand: reason + save */}
                              {isExpanded && (
                                <div className="px-3.5 pb-3.5 pt-0 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={inlineOverrideReason}
                                    onChange={(e) => setInlineOverrideReason(e.target.value)}
                                    placeholder="Reason (e.g. Compensatory working day)"
                                    className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-400 transition-colors"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => saveInlineOverride(ds)}
                                    disabled={inlineOverrideLoading}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                  >
                                    {inlineOverrideLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Save
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Portal>
        );
      })()}

      {/* ── 7. SUCCESS POPUP ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowSuccess(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-center z-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {successMessage}
            </h3>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="w-full py-2 bg-[#56348f] hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
