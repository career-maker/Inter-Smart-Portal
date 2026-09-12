"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useRef } from "react";
import {
  CalendarDays,
  Gift,
  Calendar as CalendarIcon,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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

export default function HolidaysPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin =
    user?.role === "Super Admin" ||
    (user as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    user?.role === "HR";

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
      setOverrides(res.data.data || []);
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
      const isOverridden = overrides.some((o) => o.date === dateStr);
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
    try {
      await api.post("/working-days-overrides", {
        date: overrideDate,
        reason: overrideReason || "Compensatory Working Day",
      });
      setShowOverrideDialog(false);
      setSuccessMessage("Working day override saved successfully!");
      setShowSuccess(true);
      fetchOverrides();
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

  const deleteOverride = async (id: number) => {
    if (!confirm("Delete this working day override? The day will revert to being a holiday.")) return;
    try {
      await api.delete(`/working-days-overrides/${id}`);
      fetchOverrides();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error deleting override.");
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

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

              {showAdminMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
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
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 flex items-center justify-around gap-2 shadow-2xs">
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
            const override = overrides.find((o) => o.date === dateStr);
            const isWorkingWeekend = isWeekend && !!override;

            // Check if there is a holiday on this date
            const holiday = holidays.find((h) => h.date === dateStr);

            // Determine weekend background and text colors
            const isTreatedAsWeekend = isWeekend && !isWorkingWeekend && isCurrentMonth;

            return (
              <div
                key={dateStr + idx}
                className={`min-h-[105px] sm:min-h-[115px] p-2 sm:p-2.5 flex flex-col justify-between border-b border-r border-slate-100 dark:border-slate-750 transition-colors relative ${
                  isTreatedAsWeekend
                    ? "bg-[#FFF5F6] dark:bg-rose-950/15"
                    : "bg-white dark:bg-slate-800"
                } ${!isCurrentMonth ? "bg-white/60 dark:bg-slate-850/40" : ""}`}
              >
                {/* Top Row: Date number */}
                <div className="flex justify-end items-center w-full">
                  <span
                    className={`text-sm font-bold ${
                      !isCurrentMonth
                        ? "text-slate-300 dark:text-slate-600"
                        : isTreatedAsWeekend || (holiday && isCurrentMonth)
                        ? "text-rose-500 dark:text-rose-400 font-bold"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Middle Content Row: Weekend Badge OR Holiday Card OR Working Override */}
                {isCurrentMonth && (
                  <div className="my-auto w-full flex items-center justify-center">
                    {/* CASE A: Weekday Holiday (like Day 21 in screenshot) */}
                    {holiday && !isWeekend && (
                      <div
                        onClick={() => isSuperAdmin && openEditHoliday(holiday)}
                        className={`bg-[#FFE4E8] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/50 rounded-lg p-2 flex items-start gap-2 w-full shadow-2xs transition-transform ${
                          isSuperAdmin ? "cursor-pointer hover:scale-[1.02]" : ""
                        }`}
                        title={isSuperAdmin ? "Click to edit holiday" : holiday.name}
                      >
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-sm shrink-0">
                          {format(day, "d")}
                        </span>
                        <span className="text-slate-900 dark:text-white font-bold text-xs leading-snug line-clamp-2">
                          {holiday.name}
                        </span>
                      </div>
                    )}

                    {/* CASE B: Weekend Day (Sunday or Saturday, not overridden) */}
                    {isTreatedAsWeekend && !holiday && (
                      <span className="bg-[#FFE4E8] dark:bg-rose-900/30 text-[#E11D48] dark:text-rose-300 text-[10.5px] font-bold px-3 py-0.5 rounded-md shadow-2xs self-center">
                        Weekend
                      </span>
                    )}

                    {/* CASE C: Holiday falling on a weekend */}
                    {holiday && isWeekend && (
                      <div
                        onClick={() => isSuperAdmin && openEditHoliday(holiday)}
                        className={`bg-[#FFE4E8] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/50 rounded-lg p-1.5 flex flex-col items-center text-center w-full shadow-2xs transition-transform ${
                          isSuperAdmin ? "cursor-pointer hover:scale-[1.02]" : ""
                        }`}
                      >
                        <span className="text-slate-900 dark:text-white font-bold text-xs leading-tight line-clamp-2">
                          {holiday.name}
                        </span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                          (Weekend Holiday)
                        </span>
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
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom spacer / empty */}
                <div className="h-1" />
              </div>
            );
          })}
        </div>
      </div>

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

      {/* ── 6. MANAGE ALL HOLIDAYS & OVERRIDES FULL LIST MODAL ── */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between pr-6">
              <span>Manage Company Holidays & Overrides</span>
            </DialogTitle>
          </DialogHeader>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 pt-2">
            <button
              type="button"
              onClick={() => setManageTab("holidays")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                manageTab === "holidays"
                  ? "bg-[#56348f] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Holidays ({holidays.length})
            </button>
            <button
              type="button"
              onClick={() => setManageTab("overrides")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                manageTab === "overrides"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Weekend Overrides ({overrides.length})
            </button>
          </div>

          {manageTab === "holidays" ? (
            <div className="space-y-2 py-2">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {h.date} • {h.type || "Company Holiday"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManageModal(false);
                        openEditHoliday(h);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteHoliday(h.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {overrides.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No overrides set.</p>
              ) : (
                overrides.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div>
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        {o.date} (Working Day)
                      </p>
                      <p className="text-xs text-slate-500">{o.reason || "Working weekend"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteOverride(o.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
