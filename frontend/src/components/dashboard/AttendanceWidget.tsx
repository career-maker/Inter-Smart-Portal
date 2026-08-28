"use client";

import { useState, useEffect } from "react";
import { Play, Square, Coffee, CheckCircle, Clock } from "lucide-react";
import api from "@/services/api";

export function AttendanceWidget({ initialData }: { initialData?: any }) {
  const [data, setData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  useEffect(() => {
    // Always fetch fresh data on mount, even if initialData is provided
    // This ensures we get today's data, not stale cached data from page load
    fetchData();
  }, []);

  // Auto-refresh attendance status every 30 seconds to ensure latest punch times
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data?.attendance || data.status === 'Not Checked In') {
      setElapsedSeconds(0);
      return;
    }

    const calcSeconds = () => {
      // When checked out, use total_working_minutes from backend (source of truth)
      if (data.status === 'Checked Out' && data.attendance.total_working_minutes !== null && data.attendance.total_working_minutes !== undefined) {
        setElapsedSeconds(data.attendance.total_working_minutes * 60);
        return;
      }

      // For active state, calculate from check-in time
      const checkIn = new Date(data.attendance.check_in_time).getTime();
      let end = new Date().getTime();

      if (data.status === 'Checked Out') {
        end = new Date(data.attendance.check_out_time).getTime();
      } else if (data.status === 'On Break') {
        // find open break
        const openBreak = data.attendance.breaks.find((b: any) => !b.break_end);
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

    calcSeconds(); // Initial calculation

    let interval: NodeJS.Timeout;
    if (data.status === 'Checked In' || data.status === 'On Break') {
      interval = setInterval(calcSeconds, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data]);

  const handleAction = async (endpoint: string) => {
    setActionLoading(true);
    try {
      await api.post(`/attendance/${endpoint}`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-md p-6 shadow-sm animate-pulse h-48 mb-6"></div>;
  }

  // Calculate break time: total time - working time
  let totalBreakMins = 0;
  if (data?.attendance?.check_in_time && data?.attendance?.check_out_time) {
    const checkIn = new Date(data.attendance.check_in_time).getTime();
    const checkOut = new Date(data.attendance.check_out_time).getTime();
    const totalMinutes = (checkOut - checkIn) / 1000 / 60;
    const workingMinutes = data.attendance.total_working_minutes || 0;
    totalBreakMins = Math.max(0, Math.round(totalMinutes - workingMinutes));
  } else {
    // Fallback to summing breaks array if times not available
    totalBreakMins = data?.attendance?.breaks?.reduce((acc: number, b: any) => acc + (b.total_break_minutes || 0), 0) || 0;
    
    // Unresolved eSSL break parity: add time of ongoing open break
    const openBreak = data?.attendance?.breaks?.find((b: any) => !b.break_end);
    if (openBreak && openBreak.break_start) {
      const breakStart = new Date(openBreak.break_start).getTime();
      const now = new Date().getTime();
      const ongoingMins = Math.max(0, (now - breakStart) / 1000 / 60);
      totalBreakMins += Math.round(ongoingMins);
    }
  }
  const breakDurationStr = totalBreakMins > 0 ? `${Math.floor(totalBreakMins / 60)}h ${totalBreakMins % 60}m` : '0m';

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
      className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 rounded-md p-5 sm:p-6 shadow-sm relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <h2
            style={{
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: 500,
              color: "rgb(15, 24, 36)"
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
              color: "rgb(94, 105, 120)"
            }}
            className="dark:text-slate-400 font-normal"
          >
            Real-time biometric punch logs and work duration
          </p>
        </div>
        <span
          style={{
            fontSize: "11px",
            lineHeight: "16px"
          }}
          className={`px-3 py-1 rounded-full font-semibold uppercase tracking-wider border ${
            data?.status === 'Checked In'  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' :
            data?.status === 'On Break'    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' :
            data?.status === 'Checked Out' ? 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30' :
            'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
          }`}
        >
          {data?.status || 'Not Checked In'}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-4 relative z-10">
        {/* Metrics Grid */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Punch In */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
              <p style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1">Punch In</p>
              <p style={{ fontSize: "15px", lineHeight: "22px", color: "rgb(15, 24, 36)" }} className="font-semibold dark:text-white">{formatTime(data?.attendance?.check_in_time)}</p>
            </div>
            {/* Punch Out */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
              <p style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1">Punch Out</p>
              <p style={{ fontSize: "15px", lineHeight: "22px", color: "rgb(15, 24, 36)" }} className="font-semibold dark:text-white">{formatTime(data?.attendance?.check_out_time)}</p>
            </div>
            {/* Total Break */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
              <p style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1">Total Break</p>
              <p style={{ fontSize: "15px", lineHeight: "22px", color: "rgb(15, 24, 36)" }} className="font-semibold dark:text-white">{breakDurationStr}</p>
            </div>
            {/* Worked Time */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3.5 text-center border border-slate-200/70 dark:border-slate-800">
              <p style={{ fontSize: "11px", lineHeight: "16px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 uppercase font-medium tracking-wider mb-1">Worked Time</p>
              <p style={{ fontSize: "15px", lineHeight: "22px" }} className="font-semibold text-cyan-600 dark:text-cyan-300 font-mono tracking-tight">{formatDuration(elapsedSeconds)}</p>
            </div>
          </div>
        </div>

        {/* Biometric Entry Notice */}
        <div className="flex-shrink-0 w-full lg:w-auto min-w-[180px] p-3.5 bg-purple-50/60 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 rounded-md cursor-default">
          <p style={{ fontSize: "12px", lineHeight: "18px" }} className="text-center text-slate-600 dark:text-slate-300">
            <span style={{ fontWeight: 600, color: "#56348f" }} className="dark:text-purple-300 block">Biometric Entry</span>
            Attendance logged automatically via device
          </p>
        </div>
      </div>
    </div>
  );
}
