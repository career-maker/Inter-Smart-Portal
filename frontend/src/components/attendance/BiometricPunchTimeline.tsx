"use client";

import { CheckCircle, LogIn, LogOut, Coffee, AlertCircle } from "lucide-react";

interface RawPunch {
  type: string;
  time: string;
  event_id: number;
}

interface BiometricPunchTimelineProps {
  punches: RawPunch[];
  isCurrentlyWorking: boolean;
}

export function BiometricPunchTimeline({
  punches,
  isCurrentlyWorking,
}: BiometricPunchTimelineProps) {
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  const getPunchIcon = (type: string) => {
    const typeUpper = type.toUpperCase();
    if (typeUpper === "IN") return <LogIn className="w-4 h-4" />;
    if (typeUpper === "OUT") return <LogOut className="w-4 h-4" />;
    if (typeUpper === "BREAK_START") return <Coffee className="w-4 h-4" />;
    if (typeUpper === "BREAK_END") return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPunchColor = (type: string) => {
    const typeUpper = type.toUpperCase();
    if (typeUpper === "IN") return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    if (typeUpper === "OUT") return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
    if (typeUpper === "BREAK_START" || typeUpper === "BREAK_END") return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
    return "bg-slate-500/20 text-slate-600 dark:text-slate-400";
  };

  const getStatusEmoji = (type: string) => {
    const typeUpper = type.toUpperCase();
    if (typeUpper === "IN") return "🟢";
    if (typeUpper === "OUT") return "🟡";
    if (typeUpper === "BREAK_START") return "☕";
    if (typeUpper === "BREAK_END") return "🔄";
    return "❓";
  };

  const getTypeLabel = (type: string) => {
    const typeUpper = type.toUpperCase();
    if (typeUpper === "IN") return "IN";
    if (typeUpper === "OUT") return "OUT";
    if (typeUpper === "BREAK_START") return "BREAK";
    if (typeUpper === "BREAK_END") return "BACK";
    return type;
  };

  if (punches.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 dark:text-slate-400">
        No punch records
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {punches.map((punch, idx) => (
          <div key={punch.event_id} className="flex items-center gap-2 whitespace-nowrap">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${getPunchColor(punch.type)}`}>
              {getPunchIcon(punch.type)}
              <span className="text-xs font-bold">{getTypeLabel(punch.type)}</span>
              <span className="text-xs font-semibold">{formatTime(punch.time)}</span>
              <span className="text-sm">{getStatusEmoji(punch.type)}</span>
            </div>
            {idx < punches.length - 1 && (
              <div className="text-slate-400 dark:text-slate-600">→</div>
            )}
            {idx === punches.length - 1 && isCurrentlyWorking && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold">Working</span>
                <span className="text-sm">💼</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary row for better readability on small screens */}
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2">
        {punches.length > 0 && (
          <>
            <div>
              First punch: <span className="font-semibold text-slate-900 dark:text-white">{getTypeLabel(punches[0].type)} at {formatTime(punches[0].time)}</span>
            </div>
            {punches.length > 1 && (
              <div>
                Last punch: <span className="font-semibold text-slate-900 dark:text-white">{getTypeLabel(punches[punches.length - 1].type)} at {formatTime(punches[punches.length - 1].time)}</span>
              </div>
            )}
            <div>
              Total punches: <span className="font-semibold text-slate-900 dark:text-white">{punches.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
