"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Play, Square, Coffee, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Restrict to Super Admin only
  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const [statusData, setStatusData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterDay, setFilterDay] = useState<string>(''); // Empty = show all days in month

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.get("/attendance/status"),
        api.get(`/attendance?month=${filterMonth}`)
      ]);
      setStatusData(statusRes.data);
      setHistory(historyRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (endpoint: string) => {
    setActionLoading(true);
    try {
      await api.post(`/attendance/${endpoint}`);
      fetchData(); // Refresh state and history
    } catch (e: any) {
      alert(e.response?.data?.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutesToHours = (minutes: number) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getFilteredHistory = () => {
    if (!filterDay) return history;
    return history.filter(record => record.date === filterDay);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="text-muted-foreground">Track your daily working hours and breaks.</p>
      </div>

      {/* Time Clock Widget - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm text-white lg:col-span-1">
          <CardHeader className="bg-primary/10 pb-3 border-b border-border text-center rounded-t-xl">
            <CardTitle className="text-lg">Time Clock</CardTitle>
            <div className="text-3xl font-light tracking-tight mt-2 text-foreground">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="text-center py-3 text-sm">Loading...</div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Status:</span>
                  <Badge variant={statusData?.status === 'Checked In' ? 'default' : statusData?.status === 'On Break' ? 'secondary' : 'outline'} className="text-xs">
                    {statusData?.status}
                  </Badge>
                </div>

                {/* Attendance is managed by biometric device - manual entries disabled */}
                <div className="text-center p-3 bg-blue-500/10 rounded border border-blue-500/30">
                  <p className="text-xs text-blue-300">
                    <span className="font-semibold">Biometric Entry</span> — Attendance is automatically recorded via biometric device.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats - Optional */}
        {history.length > 0 && getFilteredHistory().length > 0 && getFilteredHistory()[0] && (
          <>
            <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm text-white">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{filterDay ? 'Check-in' : "Today's Check-in"}</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatTime(getFilteredHistory()[0]?.check_in_time)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm text-white">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{filterDay ? 'Check-out' : "Today's Check-out"}</p>
                  <p className="text-2xl font-bold text-rose-400">{formatTime(getFilteredHistory()[0]?.check_out_time)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm text-white">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Hours Worked</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatMinutesToHours(getFilteredHistory()[0]?.total_working_minutes || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Primary Day-wise Table */}
      <Card className="shadow-sm border-border bg-card/50 backdrop-blur-sm text-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <CardTitle className="text-2xl">Attendance Records</CardTitle>
            <CardDescription className="text-muted-foreground">Day-wise breakdown of your attendance history</CardDescription>
          </div>
          <div className="flex gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Month</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setFilterDay(''); // Reset day filter when month changes
                }}
                className="px-3 py-2 border rounded-md text-sm bg-background border-border text-white outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Day (Optional)</label>
              <input
                type="date"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                min={filterMonth ? `${filterMonth}-01` : undefined}
                max={filterMonth ? `${filterMonth}-31` : undefined}
                className="px-3 py-2 border rounded-md text-sm bg-background border-border text-white outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
              />
            </div>
            {filterDay && (
              <button
                onClick={() => setFilterDay('')}
                className="px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-md border border-border text-muted-foreground hover:text-white transition-colors self-end"
              >
                Clear Day
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-border rounded bg-background/50">No attendance records found for this month.</div>
          ) : getFilteredHistory().length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-border rounded bg-background/50">No attendance records found for the selected day.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-background/80 border-b border-border">
                  <tr>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Day</th>
                    <th className="px-4 py-4">Clock In</th>
                    <th className="px-4 py-4">Clock Out</th>
                    <th className="px-4 py-4">Break Time</th>
                    <th className="px-4 py-4 text-right">Effective Hours</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {getFilteredHistory().map((record) => {
                    const totalBreakMins = record.breaks?.reduce((acc: number, b: any) => acc + (b.total_break_minutes || 0), 0) || 0;
                    const recordDate = new Date(record.date);
                    const dayName = recordDate.toLocaleDateString([], { weekday: 'short' });
                    return (
                      <tr key={record.id} className="border-b border-border hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-4 font-medium text-white">{recordDate.toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-muted-foreground text-xs">{dayName}</td>
                        <td className="px-4 py-4 text-emerald-400 font-medium">{formatTime(record.check_in_time)}</td>
                        <td className="px-4 py-4 text-rose-400 font-medium">{formatTime(record.check_out_time)}</td>
                        <td className="px-4 py-4 text-muted-foreground">{formatMinutesToHours(totalBreakMins)}</td>
                        <td className="px-4 py-4 text-right font-bold text-blue-400">
                          {record.total_working_minutes !== null ? formatMinutesToHours(record.total_working_minutes) : '--'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="text-xs">
                            {record.status || 'Present'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Link href={`/attendance/details/${record.date}${record.user?.id ? `?user_id=${record.user.id}` : ''}`}>
                            <Button variant="outline" size="sm" className="text-xs h-8 text-amber-400 border-amber-400/50 hover:bg-amber-400/10 bg-transparent">
                              View <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
