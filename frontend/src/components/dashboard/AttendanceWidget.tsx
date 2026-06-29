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
    if (initialData) {
      setData(initialData);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [initialData]);

  useEffect(() => {
    if (!data?.attendance || data.status === 'Not Checked In') {
      setElapsedSeconds(0);
      return;
    }

    const calcSeconds = () => {
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
    return <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] animate-pulse h-48 mb-6"></div>;
  }

  const totalBreakMins = data?.attendance?.breaks?.reduce((acc: number, b: any) => acc + (b.total_break_minutes || 0), 0) || 0;
  const breakDurationStr = totalBreakMins > 0 ? `${Math.floor(totalBreakMins / 60)}h ${totalBreakMins % 60}m` : '0m';

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] text-gray-800 mb-6 relative overflow-hidden">
      {/* Glassmorphism subtle glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/40 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-700" />
          Today's Attendance
        </h2>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${
          data?.status === 'Checked In' ? 'bg-green-100 text-green-700 border-green-200' :
          data?.status === 'On Break' ? 'bg-amber-100 text-amber-700 border-amber-200' :
          data?.status === 'Checked Out' ? 'bg-gray-100 text-gray-600 border-gray-200' :
          'bg-red-50 text-red-600 border-red-100'
        }`}>
          {data?.status || 'Not Checked In'}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
        {/* Metrics Grid */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/50 rounded-2xl p-4 border border-white/40 shadow-sm text-center">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Punch In</p>
              <p className="font-bold text-lg text-gray-900">{formatTime(data?.attendance?.check_in_time)}</p>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 border border-white/40 shadow-sm text-center">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Punch Out</p>
              <p className="font-bold text-lg text-gray-900">{formatTime(data?.attendance?.check_out_time)}</p>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 border border-white/40 shadow-sm text-center">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Break</p>
              <p className="font-bold text-lg text-gray-900">{breakDurationStr}</p>
            </div>
            <div className="bg-white/50 rounded-2xl p-4 border border-white/40 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-xs text-cyan-700 uppercase font-bold mb-1 relative z-10">Worked Time</p>
              <p className="font-black text-xl text-cyan-800 font-mono tracking-tight relative z-10">{formatDuration(elapsedSeconds)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[180px]">
          {(!data || data.status === 'Not Checked In') && (
            <button 
              onClick={() => handleAction('check-in')}
              disabled={actionLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 border border-green-400/50"
            >
              <Play className="w-5 h-5 fill-current" />
              Clock In
            </button>
          )}

          {data?.status === 'Checked In' && (
            <>
              <button 
                onClick={() => handleAction('break-start')}
                disabled={actionLoading}
                className="w-full flex-1 py-3 px-6 bg-gradient-to-r from-amber-300 to-orange-400 hover:from-amber-400 hover:to-orange-500 text-amber-950 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 border border-amber-300/50"
              >
                <Coffee className="w-5 h-5" />
                Take Break
              </button>
              <button 
                onClick={() => handleAction('check-out')}
                disabled={actionLoading}
                className="w-full flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 border border-red-400/50"
              >
                <Square className="w-5 h-5 fill-current" />
                Clock Out
              </button>
            </>
          )}

          {data?.status === 'On Break' && (
            <button 
              onClick={() => handleAction('break-end')}
              disabled={actionLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 border border-cyan-400/50"
            >
              <CheckCircle className="w-5 h-5" />
              Resume Work
            </button>
          )}

          {data?.status === 'Checked Out' && (
            <div className="w-full py-4 px-6 bg-gray-100/80 text-gray-500 rounded-2xl font-bold flex items-center justify-center text-center border border-gray-200 shadow-sm">
              Shift Completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
