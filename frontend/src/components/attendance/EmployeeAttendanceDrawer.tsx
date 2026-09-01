"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import api from "@/services/api";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { DailySummaryCard } from "@/components/attendance/DailySummaryCard";
import { BiometricPunchTimeline } from "@/components/attendance/BiometricPunchTimeline";
import { AdminLeaveWfhModal } from "@/components/attendance/AdminLeaveWfhModal";
import { Button } from "@/components/ui/button";

export interface AttendanceDrawerEmployee {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  employee_code?: string;
  designation?: string;
  profile_photo_path?: string | null;
  team?: { id?: number; name: string } | string | null;
  leave_type?: string;
}

interface EmployeeAttendanceDrawerProps {
  employee: AttendanceDrawerEmployee | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  backButtonLabel?: string;
  initialDate?: string;
  initialMode?: "menu" | "dateWise";
}

export function EmployeeAttendanceDrawer({
  employee,
  isOpen,
  onClose,
  onBack,
  backButtonLabel = "← Change Employee",
  initialDate,
  initialMode = "menu",
}: EmployeeAttendanceDrawerProps) {
  const router = useRouter();

  const [mode, setMode] = useState<"menu" | "dateWise">(initialMode);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return initialDate || format(new Date(), "yyyy-MM-dd");
  });

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [dailyDetails, setDailyDetails] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLeaveWfhModalOpen, setIsLeaveWfhModalOpen] = useState(false);

  // Sync mode and date when employee changes or drawer opens
  useEffect(() => {
    if (isOpen && employee) {
      setMode(initialMode);
      const dateToUse = initialDate || format(new Date(), "yyyy-MM-dd");
      setSelectedDate(dateToUse);
      if (initialMode === "dateWise") {
        fetchAttendanceDetails(employee.id, dateToUse);
      } else {
        setDailyDetails(null);
        setError(null);
      }
    }
  }, [isOpen, employee, initialMode, initialDate]);

  const fetchAttendanceDetails = async (userId: number, date: string) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      const res = await api.get(`/attendance/details?date=${date}&user_id=${userId}`);
      setDailyDetails(res.data);
    } catch (err: any) {
      console.error("Failed to load attendance details:", err);
      setError(err.response?.data?.message || "Failed to load attendance details");
      setDailyDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenDateWise = () => {
    setMode("dateWise");
    if (employee) {
      fetchAttendanceDetails(employee.id, selectedDate);
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (employee && newDate) {
      fetchAttendanceDetails(employee.id, newDate);
    }
  };

  const handleStepDay = (days: number) => {
    try {
      const current = selectedDate ? parseISO(selectedDate) : new Date();
      const nextDate = days > 0 ? addDays(current, days) : subDays(current, Math.abs(days));
      const formatted = format(nextDate, "yyyy-MM-dd");
      handleDateChange(formatted);
    } catch {
      handleDateChange(format(new Date(), "yyyy-MM-dd"));
    }
  };

  if (!isOpen || !employee) return null;

  const firstName = employee.first_name || employee.name?.split(" ")[0] || "Employee";
  const lastName = employee.last_name || employee.name?.split(" ").slice(1).join(" ") || "";
  const fullName = employee.name || `${firstName} ${lastName}`.trim();
  const teamName = typeof employee.team === "object" ? employee.team?.name : employee.team;
  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />

        {/* Drawer Panel */}
        <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
          {/* ── HEADER ── */}
          <div className="relative p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 via-purple-50/30 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 pr-8">
              <RoyalAvatar
                src={employee.profile_photo_path}
                name={fullName}
                userId={employee.id}
                employeeCode={employee.employee_code}
                className="w-14 h-14 rounded-full shrink-0 border-2 border-white dark:border-slate-700 shadow-sm text-base"
              />
              <div className="min-w-0">
                <h2
                  style={{
                    fontSize: "18px",
                    lineHeight: "26px",
                    fontWeight: 600,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white truncate"
                >
                  <RoyalName
                    name={fullName}
                    userId={employee.id}
                    employeeCode={employee.employee_code}
                  />
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                  Employee Code:{" "}
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {employee.employee_code || "N/A"}
                  </span>
                </p>
                <p className="text-xs text-[#56348f] dark:text-purple-400 mt-0.5 font-medium truncate">
                  {employee.designation || "Team Member"}
                  {teamName ? ` • ${teamName}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          {mode === "menu" ? (
            /* ────────────────────────────────────────────────────────
               VIEW 1: MENU (Matches Attendance Management Screenshot 2)
               ──────────────────────────────────────────────────────── */
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Select how you want to view attendance:
              </span>

              {/* Option 1: Date Wise */}
              <button
                onClick={handleOpenDateWise}
                className="w-full p-4.5 bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 border border-slate-200/90 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-xl text-left transition-all group flex items-start gap-4 shadow-xs cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center text-[#56348f] dark:text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-[15px]">
                      Date Wise
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    View detailed timeline for a specific date
                  </p>
                </div>
              </button>

              {/* Option 2: Add Leave / WFH */}
              <button
                onClick={() => setIsLeaveWfhModalOpen(true)}
                className="w-full p-4.5 bg-white dark:bg-slate-800/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 border border-slate-200/90 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-700/60 rounded-xl text-left transition-all group flex items-start gap-4 shadow-xs cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-[15px]">
                      Add Leave / WFH
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Create leave or work-from-home for this employee
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────
               VIEW 2: DATE WISE TIMELINE & SUMMARY
               ──────────────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Date Navigation Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => setMode("menu")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Back to options"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Options</span>
                </button>

                {/* Date Picker with Prev / Next */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <button
                    onClick={() => handleStepDay(-1)}
                    disabled={isLoadingDetails}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors disabled:opacity-50 cursor-pointer"
                    title="Previous day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    disabled={isLoadingDetails}
                    className="bg-transparent border-0 text-slate-900 dark:text-white text-xs font-bold focus:outline-none cursor-pointer"
                  />

                  <button
                    onClick={() => handleStepDay(1)}
                    disabled={isLoadingDetails}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors disabled:opacity-50 cursor-pointer"
                    title="Next day"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isToday && (
                  <button
                    onClick={() => handleDateChange(format(new Date(), "yyyy-MM-dd"))}
                    disabled={isLoadingDetails}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                )}

                <button
                  onClick={() => {
                    onClose();
                    router.push(
                      `/attendance/management?user_id=${employee.id}&date=${selectedDate}`
                    );
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#56348f] dark:hover:text-purple-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Open full page in Attendance Management"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Timeline & Summary Content */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                {isLoadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-[#56348f] dark:text-purple-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Loading attendance details for {selectedDate}...
                    </p>
                  </div>
                ) : error ? (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                    {error}
                  </div>
                ) : dailyDetails ? (
                  <div className="space-y-5">
                    <DailySummaryCard
                      attendance={dailyDetails}
                      totalBreaks={dailyDetails.completed_breaks?.length || 0}
                      isCurrentlyWorking={dailyDetails.is_currently_working}
                    />

                    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs p-5">
                      <div className="pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            Biometric Punch Timeline
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Chronological events on {selectedDate}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {dailyDetails.raw_punches?.length || 0} Punches
                        </span>
                      </div>
                      <BiometricPunchTimeline
                        punches={dailyDetails.raw_punches || []}
                        isCurrentlyWorking={dailyDetails.is_currently_working}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-10 text-center">
                    <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No attendance record found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No biometric punches recorded for {selectedDate}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0">
            {onBack ? (
              <button
                onClick={onBack}
                className="py-2 px-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                {backButtonLabel}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="py-2 px-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            )}

            <button
              onClick={() => setIsLeaveWfhModalOpen(true)}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition-all shadow-2xs cursor-pointer ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Leave / WFH
            </button>
          </div>
        </div>
      </div>

      {/* Admin Leave/WFH Modal */}
      {isLeaveWfhModalOpen && employee && (
        <AdminLeaveWfhModal
          isOpen={isLeaveWfhModalOpen}
          onClose={() => setIsLeaveWfhModalOpen(false)}
          onSuccess={() => {
            setIsLeaveWfhModalOpen(false);
            if (mode === "dateWise") {
              fetchAttendanceDetails(employee.id, selectedDate);
            }
          }}
          selectedEmployeeId={employee.id}
        />
      )}
    </>
  );
}
