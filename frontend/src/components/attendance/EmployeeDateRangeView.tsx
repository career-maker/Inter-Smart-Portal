"use client";

import React from "react";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import {
  Fingerprint,
  Palmtree,
  Laptop,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  LogIn,
  LogOut,
  Timer,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  designation?: string;
  profile_photo_path?: string;
  team?: { id?: number; name: string };
}

interface EmployeeDateRangeViewProps {
  employee: Employee;
  startDate: string;
  endDate: string;
  data: any;
  isLoading: boolean;
  onRangeChange: (start: string, end: string) => void;
}

export function EmployeeDateRangeView({
  employee,
  startDate,
  endDate,
  data,
  isLoading,
  onRangeChange,
}: EmployeeDateRangeViewProps) {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  const formatMinutes = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined || minutes === 0) return "—";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const handlePreset = (type: "thisMonth" | "lastMonth" | "last30Days") => {
    const today = new Date();
    if (type === "thisMonth") {
      onRangeChange(
        format(startOfMonth(today), "yyyy-MM-dd"),
        format(endOfMonth(today), "yyyy-MM-dd")
      );
    } else if (type === "lastMonth") {
      const prev = subMonths(today, 1);
      onRangeChange(
        format(startOfMonth(prev), "yyyy-MM-dd"),
        format(endOfMonth(prev), "yyyy-MM-dd")
      );
    } else if (type === "last30Days") {
      onRangeChange(
        format(subDays(today, 30), "yyyy-MM-dd"),
        format(today, "yyyy-MM-dd")
      );
    }
  };

  const esslDays = data?.essl_days_count ?? 0;
  const totalLeaves = data?.total_leaves ?? 0;
  const wfhDays = data?.wfh_count ?? 0;
  const lateDays = data?.l_count ?? 0;
  const totalPresent = (data?.p_count ?? 0) + (data?.wfh_count ?? 0);
  const dailyStatusList = data?.daily_status || [];

  return (
    <div className="space-y-6">
      {/* Date Range Controls Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
              Date Range Filter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select date span to analyze eSSL usage, leaves, WFH, and daily floor times.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-lg text-xs">
              <button
                onClick={() => handlePreset("thisMonth")}
                className="px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all font-medium cursor-pointer"
              >
                This Month
              </button>
              <button
                onClick={() => handlePreset("lastMonth")}
                className="px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all font-medium cursor-pointer"
              >
                Last Month
              </button>
              <button
                onClick={() => handlePreset("last30Days")}
                className="px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all font-medium cursor-pointer"
              >
                Last 30 Days
              </button>
            </div>

            {/* From Date */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                From:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onRangeChange(e.target.value, endDate)}
                disabled={isLoading}
                className="bg-transparent border-0 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                To:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onRangeChange(startDate, e.target.value)}
                disabled={isLoading}
                className="bg-transparent border-0 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-8 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#56348f] dark:text-purple-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Analyzing biometric events, leaves, and floor times for {employee.first_name}...
          </p>
        </div>
      ) : !data ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-12 text-center shadow-sm">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No attendance records found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting the date range filter above.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Days Used eSSL */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-purple-200/70 dark:border-purple-900/40 p-5 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Days Used eSSL
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-[#56348f] dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                  <Fingerprint className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {esslDays} <span className="text-xs font-medium text-slate-400">days</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Physical biometric entries
                </p>
              </div>
            </div>

            {/* Card 2: Total Leaves */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200/70 dark:border-amber-900/40 p-5 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Total Leaves
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40">
                  <Palmtree className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {totalLeaves} <span className="text-xs font-medium text-slate-400">days</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  CL: {data.cl_count || 0} • SL: {data.sl_count || 0} • LOP: {data.lop_count || 0}
                </p>
              </div>
            </div>

            {/* Card 3: Present (W) / WFH */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200/70 dark:border-blue-900/40 p-5 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Present (W)
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
                  <Laptop className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {wfhDays} <span className="text-xs font-medium text-slate-400">days</span>
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  WFH counts as Present
                </p>
              </div>
            </div>

            {/* Card 4: Late Coming Days */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-rose-200/70 dark:border-rose-900/40 p-5 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Late Coming Days
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-300 border border-rose-100 dark:border-rose-800/40">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {lateDays} <span className="text-xs font-medium text-slate-400">days</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Checked in after threshold
                </p>
              </div>
            </div>
          </div>

          {/* Daily Table of Results */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Daily Attendance &amp; Floor Time Breakdown
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing eSSL first in, last out, and total floor duration for {startDate} to {endDate} ({dailyStatusList.length} days)
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                Total Present: <strong className="text-slate-900 dark:text-white">{totalPresent}</strong> days
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[750px]">
                <thead className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">eSSL First In</th>
                    <th className="py-3.5 px-4">eSSL Last Out</th>
                    <th className="py-3.5 px-4">Late Coming</th>
                    <th className="py-3.5 px-5 text-right">Total Floor Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {dailyStatusList.map((day: any, idx: number) => {
                    const isWfh = day.status === "W";
                    const isPresent = day.status === "P";
                    const isLeave = day.status === "L" || day.status === "H";
                    const isOff = day.status === "OFF";
                    const isAbsent = day.status === "A";

                    return (
                      <tr
                        key={day.date || idx}
                        className={`hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors ${
                          isOff ? "opacity-60 bg-slate-50/40 dark:bg-slate-900/30" : ""
                        }`}
                      >
                        {/* Date */}
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {format(new Date(day.date), "dd MMM yyyy")}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {day.day_name}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle2 className="w-3 h-3" /> Present (eSSL)
                            </span>
                          ) : isWfh ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                              <Laptop className="w-3 h-3" /> Present (W)
                            </span>
                          ) : isLeave ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              <Palmtree className="w-3 h-3" /> {day.leave_type || "Leave"}
                            </span>
                          ) : isOff ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              Weekend / Holiday
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                              Absent
                            </span>
                          )}
                        </td>

                        {/* eSSL First In */}
                        <td className="py-3.5 px-4">
                          {day.has_essl && day.essl_first_in ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                              <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {formatTime(day.essl_first_in)}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">—</span>
                          )}
                        </td>

                        {/* eSSL Last Out */}
                        <td className="py-3.5 px-4">
                          {day.has_essl && day.essl_last_out ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                              <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              {formatTime(day.essl_last_out)}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">—</span>
                          )}
                        </td>

                        {/* Late Coming */}
                        <td className="py-3.5 px-4">
                          {day.is_late ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Late ({formatTime(day.check_in)})
                            </span>
                          ) : isPresent || (day.has_essl && day.essl_first_in) ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              On Time
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">—</span>
                          )}
                        </td>

                        {/* Total Floor Time */}
                        <td className="py-3.5 px-5 text-right">
                          {day.total_working_minutes ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 font-mono text-xs font-bold text-[#56348f] dark:text-purple-300">
                              <Timer className="w-3.5 h-3.5" />
                              {formatMinutes(day.total_working_minutes)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
