"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { DailyActivityTimeline, DailySummaryCard } from "@/components/attendance";

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
  current_sequence_state: string;
  is_currently_working: boolean;
  has_missing_punch_out: boolean;
  requires_review: boolean;
  total_working_minutes: number | null;
  total_completed_break_minutes: number;
  open_break_start: string | null;
  working_sessions: Array<{
    start: string;
    end: string | null;
    minutes: number | null;
  }>;
  completed_breaks: Array<{
    start: string;
    end: string;
    minutes: number;
  }>;
  raw_punches: Array<{
    type: string;
    time: string;
    event_id: number;
  }>;
  orphan_event_ids: number[];
}

interface PageProps {
  params: { date: string };
}

export default function AttendanceDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AttendanceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateParam = params.date;
  const userIdParam = searchParams.get("user_id");

  useEffect(() => {
    fetchDetails();
  }, [dateParam, userIdParam]);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        date: dateParam,
      });
      if (userIdParam) {
        queryParams.append("user_id", userIdParam);
      }

      const response = await api.get(`/attendance/details?${queryParams.toString()}`);
      setData(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("You do not have permission to view this attendance record.");
      } else {
        setError(err.response?.data?.message || "Failed to load attendance details.");
      }
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatMinutesToHours = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "--";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const newUrl = `/attendance/details/${newDate}${
      userIdParam ? `?user_id=${userIdParam}` : ""
    }`;
    router.push(newUrl);
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status.includes("Complete")) return "default";
    if (status.includes("Checked In") || status.includes("Open")) return "secondary";
    if (status.includes("Missing") || status.includes("Review")) return "destructive";
    return "outline";
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/attendance">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Attendance
          </Button>
        </Link>
        <Card className="border-red-500/50 bg-red-50 text-red-900">
          <CardContent className="pt-6 flex gap-4">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <h2 className="font-semibold mb-2">Access Denied</h2>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href="/attendance">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Attendance
          </Button>
        </Link>
        <Card className="border-slate-600 bg-slate-100/50 dark:bg-slate-900/50">
          <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-300">
            <p>No attendance or biometric data found for this date.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/attendance" className="inline-block mb-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Attendance
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Details</h1>
        <p className="text-slate-600 dark:text-slate-300">
          {data.employee && `${data.employee.first_name} ${data.employee.last_name} — `}
          {new Date(data.date).toLocaleDateString([], {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-500 dark:text-slate-400">Select Date:</label>
        <input
          type="date"
          value={data.date}
          onChange={handleDateChange}
          className="px-3 py-2 border rounded-md text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
        />
      </div>

      {/* Daily Summary Card */}
      <DailySummaryCard
        attendance={data}
        totalBreaks={data.completed_breaks?.length || 0}
        isCurrentlyWorking={data.is_currently_working}
      />

      {/* Daily Activity Timeline */}
      <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-white/5">
          <CardTitle>Daily Activity Timeline</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Chronological record of all punch events throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <DailyActivityTimeline
            rawPunches={data.raw_punches || []}
            isCurrentlyWorking={data.is_currently_working}
            firstIn={data.first_in}
            lastOut={data.last_out}
          />
        </CardContent>
      </Card>

      {/* Date Navigation & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
            <CardHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Daily Summary</CardTitle>
                <div className="flex items-center gap-4">
                  <input
                    type="date"
                    value={data.date}
                    onChange={handleDateChange}
                    className="px-3 py-2 border rounded-md text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Status & Missing Punch Warning */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={getStatusBadgeVariant(data.status_label)}>
                    {data.status_label}
                  </Badge>
                </div>

                {data.has_missing_punch_out && (
                  <div className="p-4 border border-orange-500/30 bg-orange-500/10 rounded-lg flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-200">Missing Punch Out</p>
                      <p className="text-sm text-orange-100">
                        This record requires review. The employee did not punch out on this date.
                      </p>
                    </div>
                  </div>
                )}

                {data.is_currently_working && (
                  <div className="p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-200">Currently Working</p>
                      <p className="text-sm text-blue-100">
                        Employee is still checked in (no punch out yet).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">First Punch In</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatTime(data.first_in)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Last Punch Out</p>
                  <p className="text-xl font-bold text-rose-400">
                    {formatTime(data.last_out)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Total Break</p>
                  <p className="text-xl font-bold text-amber-400">
                    {formatMinutesToHours(data.total_completed_break_minutes)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Effective Worked Time</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatMinutesToHours(data.total_working_minutes)}
                  </p>
                </div>
              </div>

              {/* Active Break */}
              {data.open_break_start && (
                <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
                  <p className="text-sm text-amber-200">
                    <strong>Active Break:</strong> Started at {formatTime(data.open_break_start)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sequence State Info */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white h-full">
            <CardHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
              <CardTitle className="text-lg">Sequence State</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 bg-slate-700/50 rounded border border-slate-200 dark:border-white/5">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current State</p>
                <p className="font-mono text-sm text-amber-400">{data.current_sequence_state}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Currently Working:</span>
                  <span className={data.is_currently_working ? "text-green-400 font-semibold" : "text-slate-400"}>
                    {data.is_currently_working ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Missing Punch Out:</span>
                  <span className={data.has_missing_punch_out ? "text-orange-400 font-semibold" : "text-slate-400"}>
                    {data.has_missing_punch_out ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Requires Review:</span>
                  <span className={data.requires_review ? "text-red-400 font-semibold" : "text-slate-400"}>
                    {data.requires_review ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Raw Punches */}
      <Card className="border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
        <CardHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
          <CardTitle>Raw Biometric Punches</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Chronological sequence of all punch events recorded for this date
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.raw_punches.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No biometric events recorded.</p>
          ) : (
            <div className="space-y-2">
              {data.raw_punches.map((punch, idx) => (
                <div
                  key={`${punch.event_id}-${idx}`}
                  className="p-3 bg-slate-700/50 rounded border border-slate-200 dark:border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 font-mono">#{punch.event_id}</span>
                    <Badge
                      variant={punch.type === "in" ? "default" : "destructive"}
                      className="w-12 justify-center"
                    >
                      {punch.type.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="font-mono text-sm text-amber-300">{formatTime(punch.time)}</span>
                </div>
              ))}
            </div>
          )}
          {data.orphan_event_ids.length > 0 && (
            <div className="mt-6 p-3 bg-slate-700/30 rounded border border-slate-200 dark:border-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                <strong>Orphan Events (ignored leading OUT punches):</strong>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-mono">{data.orphan_event_ids.join(", ")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Working Sessions */}
      <Card className="border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
        <CardHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
          <CardTitle>Working Sessions</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Interpreted work periods from IN to OUT punches
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.working_sessions.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No working sessions recorded.</p>
          ) : (
            <div className="space-y-3">
              {data.working_sessions.map((session, idx) => (
                <div key={idx} className="p-4 bg-slate-700/50 rounded border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-300">Session {idx + 1}</span>
                    <span className="font-mono text-sm font-bold text-blue-400">
                      {formatMinutesToHours(session.minutes)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Start</p>
                      <p className="text-emerald-300 font-mono">{formatTime(session.start)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {session.end ? "End" : "In Progress"}
                      </p>
                      <p className={`font-mono ${session.end ? "text-rose-300" : "text-amber-300"}`}>
                        {formatTime(session.end) || "Ongoing"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breaks */}
      <Card className="border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
        <CardHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
          <CardTitle>Completed Breaks</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Break periods between OUT and next IN
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.completed_breaks.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No breaks recorded.</p>
          ) : (
            <div className="space-y-3">
              {data.completed_breaks.map((breakItem, idx) => (
                <div key={idx} className="p-4 bg-slate-700/50 rounded border border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-300">Break {idx + 1}</span>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {formatMinutesToHours(breakItem.minutes)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Start</p>
                      <p className="text-emerald-300 font-mono">{formatTime(breakItem.start)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">End</p>
                      <p className="text-rose-300 font-mono">{formatTime(breakItem.end)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
