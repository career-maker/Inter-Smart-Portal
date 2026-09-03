"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Calendar, AlertCircle, LogIn, LogOut, Coffee } from "lucide-react";

interface AttendanceDetails {
  date: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  status_label: string;
  first_in: string | null;
  last_out: string | null;
  is_currently_working: boolean;
  total_working_minutes: number | null;
  total_completed_break_minutes: number;
}

interface DailySummaryCardProps {
  attendance: AttendanceDetails | undefined;
  totalBreaks: number;
  isCurrentlyWorking: boolean;
}

export function DailySummaryCard({
  attendance,
  totalBreaks,
  isCurrentlyWorking,
}: DailySummaryCardProps) {
  if (!attendance) {
    return null;
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMinutesToHours = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "--";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getStatusBadge = () => {
    if (isCurrentlyWorking) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
          Currently Working
        </span>
      );
    }
    if (attendance.status_label?.includes("Complete")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          Shift Complete
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm">
        {attendance.status_label || "No Activity"}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Daily Summary
          </h2>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{formatDate(attendance.date)}</span>
          </div>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Employee Info */}
        {attendance.employee && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Employee</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {attendance.employee.first_name} {attendance.employee.last_name}
              </p>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* First Check-In */}
          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/70 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden space-y-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 truncate">
                First Check-In
              </p>
              <LogIn className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-black text-emerald-950 dark:text-emerald-100 font-mono tracking-tight truncate">
              {formatTime(attendance.first_in)}
            </p>
          </div>

          {/* Last Check-Out / Latest Activity */}
          <div className="p-3 sm:p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-800/70 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden space-y-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 truncate">
                {isCurrentlyWorking ? "Latest Activity" : "Final Check-Out"}
              </p>
              <LogOut className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" />
            </div>
            <p className={`font-black text-rose-950 dark:text-rose-100 tracking-tight truncate ${
              isCurrentlyWorking ? "text-sm sm:text-base font-bold" : "text-base sm:text-lg lg:text-xl font-mono"
            }`}>
              {isCurrentlyWorking ? "Still Working" : formatTime(attendance.last_out)}
            </p>
          </div>

          {/* Total Working Hours */}
          <div className="p-3 sm:p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/90 dark:border-purple-800/70 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden space-y-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#56348f] dark:text-purple-300 truncate">
                Total Worked
              </p>
              <Clock className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400 shrink-0" />
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-black text-purple-950 dark:text-purple-100 tracking-tight truncate">
              {formatMinutesToHours(attendance.total_working_minutes)}
            </p>
          </div>

          {/* Breaks */}
          <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 truncate">
                Breaks
              </p>
              <Coffee className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            </div>
            <div>
              <p className="text-base sm:text-lg lg:text-xl font-black text-amber-950 dark:text-amber-100 tracking-tight truncate">
                {totalBreaks} {totalBreaks === 1 ? "break" : "breaks"}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-amber-800/90 dark:text-amber-300 truncate">
                ({formatMinutesToHours(attendance.total_completed_break_minutes)})
              </p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {attendance.status_label?.includes("Missing") && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-900 dark:text-rose-200 text-sm font-bold">Requires Review</p>
              <p className="text-rose-700 dark:text-rose-300 text-xs mt-0.5">
                This attendance record may be incomplete (missing clock-out) and requires review.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
