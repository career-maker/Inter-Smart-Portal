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
    if (data.status === 'Checked In') {
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
    return <div className="bg-gradient-to-br from-white/90 dark:from-slate-800/90 to-slate-50/90 dark:to-slate-900/90 border border-slate-200 dark:border-white/[0.06] rounded-3xl p-6 shadow-none dark:shadow-[8px_8px_24px_rgba(0,0,0,0.5)] animate-pulse h-48 mb-6"></div>;
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
  }
  const breakDurationStr = totalBreakMins > 0 ? `${Math.floor(totalBreakMins / 60)}h ${totalBreakMins % 60}m` : '0m';

  return (
    <div className="bg-gradient-to-br from-white/90 dark:from-slate-800/90 to-slate-50/90 dark:to-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 shadow-none dark:shadow-[8px_8px_24px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.03)] mb-6 relative overflow-hidden group">
      <div className="absolute -bottom-10 -left-10 w-6 h-6 rounded-full scale-0 group-hover:scale-[50] transition-transform duration-700 ease-out bg-cyan-50 z-0 dark:hidden pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      
      <div className="relative z-10">

      <div className="flex items-center justify-between mb-5 relative z-10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Today's Attendance
        </h2>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
          data?.status === 'Checked In'  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
          data?.status === 'On Break'    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
          data?.status === 'Checked Out' ? 'bg-slate-500/20 text-slate-300 border-slate-500/30' :
          'bg-rose-500/20 text-rose-300 border-rose-500/30'
        }`}>
          {data?.status || 'Not Checked In'}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
        {/* Metrics Grid — same KPI card style as Super Admin dashboard */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Punch In */}
            <div className="bg-gradient-to-br from-white/90 dark:from-slate-800/90 to-slate-50/90 dark:to-slate-900/90 rounded-2xl p-4 text-center shadow-none dark:shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.03)] border border-emerald-500/25 backdrop-blur-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-2">Punch In</p>
              <p className="font-black text-lg text-slate-900 dark:text-white">{formatTime(data?.attendance?.check_in_time)}</p>
            </div>
            {/* Punch Out */}
            <div className="bg-gradient-to-br from-white/90 dark:from-slate-800/90 to-slate-50/90 dark:to-slate-900/90 rounded-2xl p-4 text-center shadow-none dark:shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.03)] border border-rose-500/25 backdrop-blur-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-2">Punch Out</p>
              <p className="font-black text-lg text-slate-900 dark:text-white">{formatTime(data?.attendance?.check_out_time)}</p>
            </div>
            {/* Total Break */}
            <div className="bg-gradient-to-br from-white/90 dark:from-slate-800/90 to-slate-50/90 dark:to-slate-900/90 rounded-2xl p-4 text-center shadow-none dark:shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.03)] border border-amber-500/25 backdrop-blur-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-2">Total Break</p>
              <p className="font-black text-lg text-slate-900 dark:text-white">{breakDurationStr}</p>
            </div>
            {/* Worked Time */}
            <div className="bg-gradient-to-br from-white/90 dark:from-slate-800/90 to-slate-50/90 dark:to-slate-900/90 rounded-2xl p-4 text-center shadow-none dark:shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.03)] border border-cyan-500/25 backdrop-blur-xl">
              <p className="text-xs text-cyan-400 uppercase font-bold tracking-widest mb-2">Worked Time</p>
              <p className="font-black text-xl text-cyan-300 font-mono tracking-tight">{formatDuration(elapsedSeconds)}</p>
            </div>
          </div>
        </div>

        {/* Biometric Entry Notice */}
        <div className="flex-shrink-0 w-full lg:w-auto min-w-[180px] p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl hover:bg-blue-500/20 transition-colors cursor-default">
          <p className="text-center text-xs text-blue-300">
            <span className="font-semibold block">Biometric Entry</span>
            Attendance is recorded automatically via biometric device
          </p>
        </div>
      </div>
    </div>
  );
}
