"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Calendar, AlertCircle } from "lucide-react";

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
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          Currently Working / Punched In
        </Badge>
      );
    }
    if (attendance.status_label?.includes("Complete")) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          Shift Complete
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
        {attendance.status_label || "No Activity"}
      </Badge>
    );
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white mb-6">
      <CardHeader className="pb-4 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl mb-2">Daily Summary</CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4" />
              {formatDate(attendance.date)}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Employee Info */}
        {attendance.employee && (
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-white/5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Employee</p>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-semibold">
                {attendance.employee.first_name} {attendance.employee.last_name}
              </span>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* First Check-In */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">First Check-In</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              {formatTime(attendance.first_in)}
            </p>
          </div>

          {/* Last Check-Out */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {isCurrentlyWorking ? "Latest Activity" : "Final Check-Out"}
            </p>
            <p className="text-lg font-bold text-rose-400 font-mono">
              {isCurrentlyWorking ? "Still Working" : formatTime(attendance.last_out)}
            </p>
          </div>

          {/* Total Working Hours */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Worked</p>
            <p className="text-lg font-bold text-blue-400">
              {formatMinutesToHours(attendance.total_working_minutes)}
            </p>
          </div>

          {/* Breaks */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Breaks</p>
            <p className="text-lg font-bold text-amber-400">
              {totalBreaks} {totalBreaks === 1 ? "break" : "breaks"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ({formatMinutesToHours(attendance.total_completed_break_minutes)})
            </p>
          </div>
        </div>

        {/* Warnings */}
        {attendance.status_label?.includes("Missing") && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-semibold">Requires Review</p>
              <p className="text-red-200 text-xs mt-1">
                This attendance record may be incomplete and requires manual review.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
