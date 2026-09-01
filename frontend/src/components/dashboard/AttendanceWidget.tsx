"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  History,
  X,
  RefreshCw,
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import api from "@/services/api";

export function AttendanceWidget({ initialData }: { initialData?: any }) {
  const [data, setData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Today's Punches Drawer State (Scoped strictly to today and auth employee only)
  const [isTimelineDrawerOpen, setIsTimelineDrawerOpen] = useState(false);
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await api.get("/attendance/status");
      setData(res.data);
    } catch (e) {
      console.error("Failed to fetch attendance status", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimelineData = async () => {
    setIsLoadingTimeline(true);
    setTimelineError(null);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      // Strictly query today's date and omit user_id so backend strictly returns auth user's records
      const res = await api.get(`/attendance/details?date=${todayStr}`);
      setTimelineData(res.data);
    } catch (e: any) {
      console.error("Failed to fetch today's timeline details", e);
      setTimelineError(e.response?.data?.message || "Failed to load today's punch records");
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh attendance status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
      if (isTimelineDrawerOpen) {
        fetchTimelineData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isTimelineDrawerOpen]);

  // Fetch timeline data when drawer is opened
  useEffect(() => {
    if (isTimelineDrawerOpen) {
      fetchTimelineData();
    }
  }, [isTimelineDrawerOpen]);

  useEffect(() => {
    if (!data?.attendance || data.status === "Not Checked In") {
      setElapsedSeconds(0);
      return;
    }

    const calcSeconds = () => {
      if (
        data.status === "Checked Out" &&
        data.attendance.total_working_minutes !== null &&
        data.attendance.total_working_minutes !== undefined
      ) {
        setElapsedSeconds(data.attendance.total_working_minutes * 60);
        return;
      }

      const checkIn = new Date(data.attendance.check_in_time).getTime();
      let end = new Date().getTime();

      if (data.status === "Checked Out") {
        end = new Date(data.attendance.check_out_time).getTime();
      } else if (data.status === "On Break") {
        const openBreak = data.attendance.breaks?.find((b: any) => !b.break_end);
        if (openBreak) {
          end = new Date(openBreak.break_start).getTime();
        }
      }

      let breakSeconds = 0;
      data.attendance.breaks?.forEach((b: any) => {
        if (b.break_end) {
          breakSeconds += (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 1000;
        }
      });

      const totalSeconds = Math.max(0, (end - checkIn) / 1000 - breakSeconds);
      setElapsedSeconds(totalSeconds);
    };

    calcSeconds();

    let interval: NodeJS.Timeout;
    if (data.status === "Checked In" || data.status === "On Break") {
      interval = setInterval(calcSeconds, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data]);

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "--:--";
    try {
      return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const formatExactTime = (dateString: string | null) => {
    if (!dateString) return "--:--";
    try {
      return new Date(dateString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-md p-6 shadow-sm animate-pulse h-48 mb-6"></div>
    );
  }

  // Calculate break time
  let totalBreakMins = 0;
  if (data?.attendance?.check_in_time && data?.attendance?.check_out_time) {
    const checkIn = new Date(data.attendance.check_in_time).getTime();
    const checkOut = new Date(data.attendance.check_out_time).getTime();
    const totalMinutes = (checkOut - checkIn) / 1000 / 60;
    const workingMinutes = data.attendance.total_working_minutes || 0;
    totalBreakMins = Math.max(0, Math.round(totalMinutes - workingMinutes));
  } else {
    totalBreakMins =
      data?.attendance?.breaks?.reduce((acc: number, b: any) => acc + (b.total_break_minutes || 0), 0) || 0;

    const openBreak = data?.attendance?.breaks?.find((b: any) => !b.break_end);
    if (openBreak && openBreak.break_start) {
      const breakStart = new Date(openBreak.break_start).getTime();
      const now = new Date().getTime();
      const ongoingMins = Math.max(0, (now - breakStart) / 1000 / 60);
      totalBreakMins += Math.round(ongoingMins);
    }
  }
  const breakDurationStr = totalBreakMins > 0 ? `${Math.floor(totalBreakMins / 60)}h ${totalBreakMins % 60}m` : "0m";

  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <>
      <div
        style={{
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 rounded-md p-5 sm:p-6 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
          <div>
            <h2
              style={{
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "13px",
                lineHeight: "20px",
                fontWeight: 500,
                color: "rgb(15, 24, 36)",
              }}
              className="dark:text-white flex items-center gap-2 box-title"
            >
              <Clock className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
              Today's Attendance
            </h2>
            <p
              style={{
                fontSize: "12px",
                lineHeight: "20px",
                color: "rgb(94, 105, 120)",
              }}
              className="dark:text-slate-400 font-normal"
            >
              Real-time biometric punch logs and work duration
            </p>
          </div>

          {/* Action Button & Status Pill */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTimelineDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all cursor-pointer shadow-2xs"
              title="View all your check-in and check-out punches for today"
            >
              <History className="w-3.5 h-3.5" />
              <span>Today's Punches</span>
            </button>

            <span
              style={{
                fontSize: "11px",
                lineHeight: "16px",
              }}
              className={`px-3 py-1 rounded-full font-semibold uppercase tracking-wider border ${
                data?.status === "Checked In"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                  : data?.status === "On Break"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                  : data?.status === "Checked Out"
                  ? "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30"
              }`}
            >
              {data?.status || "Not Checked In"}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 relative z-10">
          {/* Metrics Grid */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Punch In */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
                <p
                  style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1"
                >
                  First In
                </p>
                <p
                  style={{ fontSize: "15px", lineHeight: "22px", color: "rgb(15, 24, 36)" }}
                  className="font-semibold dark:text-white"
                >
                  {formatTime(data?.attendance?.check_in_time)}
                </p>
              </div>
              {/* Punch Out */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
                <p
                  style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1"
                >
                  Last Out
                </p>
                <p
                  style={{ fontSize: "15px", lineHeight: "22px", color: "rgb(15, 24, 36)" }}
                  className="font-semibold dark:text-white"
                >
                  {formatTime(data?.attendance?.check_out_time)}
                </p>
              </div>
              {/* Total Break */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
                <p
                  style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1"
                >
                  Total Break
                </p>
                <p
                  style={{ fontSize: "15px", lineHeight: "22px", color: "rgb(15, 24, 36)" }}
                  className="font-semibold dark:text-white"
                >
                  {breakDurationStr}
                </p>
              </div>
              {/* Worked Time */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
                <p
                  style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1"
                >
                  Worked Time
                </p>
                <p
                  style={{ fontSize: "15px", lineHeight: "22px" }}
                  className="font-semibold text-cyan-600 dark:text-cyan-300 font-mono tracking-tight"
                >
                  {formatDuration(elapsedSeconds)}
                </p>
              </div>
            </div>
          </div>

          {/* Biometric Entry & View All Punches Card */}
          <div className="flex-shrink-0 w-full lg:w-auto min-w-[200px] p-3.5 bg-purple-50/60 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 rounded-md">
            <p style={{ fontSize: "12px", lineHeight: "18px" }} className="text-center text-slate-600 dark:text-slate-300">
              <span style={{ fontWeight: 600, color: "#56348f" }} className="dark:text-purple-300 block">
                Biometric Entry
              </span>
              Logged automatically via scanner
            </p>
            <button
              type="button"
              onClick={() => setIsTimelineDrawerOpen(true)}
              className="w-full mt-2.5 py-1.5 px-3 text-center text-xs font-bold rounded-md bg-white dark:bg-slate-800 text-[#56348f] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>All Today's Punches</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TODAY'S PUNCHES & WORK SESSIONS SIDE DRAWER
          (Strictly shows current employee's own check-in/out for today)
          ───────────────────────────────────────────────────────────── */}
      {isTimelineDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <div
            onClick={() => setIsTimelineDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 via-purple-50/30 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
              <button
                onClick={() => setIsTimelineDrawerOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-[#56348f] dark:text-purple-300 shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "17px",
                      lineHeight: "24px",
                      fontWeight: 700,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white"
                  >
                    Today's Check-ins & Check-outs
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {todayFormatted} • Your Activity
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Toolbar */}
            <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Personal records for today
              </span>

              <button
                onClick={fetchTimelineData}
                disabled={isLoadingTimeline}
                className="inline-flex items-center gap-1 font-semibold text-[#56348f] dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingTimeline ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Body / Timeline Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {isLoadingTimeline ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw className="h-7 w-7 animate-spin text-[#56348f] dark:text-purple-400" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Loading your punches for today...
                  </p>
                </div>
              ) : timelineError ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                  {timelineError}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Summary Ribbon */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First Punch In</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatTime(timelineData?.first_in || data?.attendance?.check_in_time)}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Punch Out</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {timelineData?.is_currently_working ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            Working Now
                          </span>
                        ) : (
                          formatTime(timelineData?.last_out || data?.attendance?.check_out_time)
                        )}
                      </p>
                    </div>
                  </div>

                  {/* ── SECTION 1: WORKING SESSIONS ── */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-2xs">
                    <div className="pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-3 flex items-center justify-between">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Check-in & Check-out Sessions
                      </h3>
                      <span className="text-[11px] font-semibold text-[#56348f] dark:text-purple-300">
                        {timelineData?.working_sessions?.length || 0} Sessions
                      </span>
                    </div>

                    {timelineData?.working_sessions && timelineData.working_sessions.length > 0 ? (
                      <div className="space-y-3">
                        {timelineData.working_sessions.map((session: any, sIdx: number) => {
                          const isOngoing = !session.end;
                          const sessionMins = session.minutes;
                          const durText = sessionMins
                            ? `${Math.floor(sessionMins / 60)}h ${sessionMins % 60}m`
                            : isOngoing
                            ? "Active / In Progress"
                            : "--";

                          return (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Session #{sIdx + 1}
                                </span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    isOngoing
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      : "bg-slate-200/60 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {durText}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                    Check In
                                  </span>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <LogIn className="w-3.5 h-3.5" />
                                    {formatTime(session.start)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                    Check Out
                                  </span>
                                  {isOngoing ? (
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      Working
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                      <LogOut className="w-3.5 h-3.5" />
                                      {formatTime(session.end)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-4">
                        No check-in / check-out sessions recorded yet today.
                      </p>
                    )}
                  </div>

                  {/* ── SECTION 2: BIOMETRIC PUNCH LOG ── */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-2xs">
                    <div className="pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-3 flex items-center justify-between">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Biometric Scanner Log
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {timelineData?.raw_punches?.length || 0} Events
                      </span>
                    </div>

                    {timelineData?.raw_punches && timelineData.raw_punches.length > 0 ? (
                      <div className="space-y-2">
                        {timelineData.raw_punches.map((p: any, idx: number) => {
                          const typeUpper = (p.type || "").toUpperCase();
                          const isPunchIn = typeUpper === "IN";
                          const isPunchOut = typeUpper === "OUT";
                          const isBreak = typeUpper.includes("BREAK");

                          return (
                            <div
                              key={p.event_id || idx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isPunchIn
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : isPunchOut
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  }`}
                                >
                                  {isPunchIn ? (
                                    <LogIn className="w-3.5 h-3.5" />
                                  ) : isPunchOut ? (
                                    <LogOut className="w-3.5 h-3.5" />
                                  ) : (
                                    <Coffee className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    {isPunchIn ? "Punch IN" : isPunchOut ? "Punch OUT" : typeUpper}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    Punch #{idx + 1} • Scanner Verified
                                  </p>
                                </div>
                              </div>

                              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {formatExactTime(p.time)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">
                        <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5 opacity-50" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          No punches registered today
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          When you scan your biometric device, events will appear here.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Security Notice */}
                  <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl text-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      🔒 Strictly displays your check-in and check-out logs for today ({todayFormatted}).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setIsTimelineDrawerOpen(false)}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
