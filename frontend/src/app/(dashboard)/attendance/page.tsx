"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { Clock, Play, Square, Coffee, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AttendancePage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Attendance</h1>
        <p className="text-slate-300">Track your daily working hours and breaks.</p>
      </div>

      {/* Time Clock Widget - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white lg:col-span-1">
          <CardHeader className="bg-primary/10 pb-3 border-b border-white/10 text-center rounded-t-xl">
            <CardTitle className="text-lg">Time Clock</CardTitle>
            <div className="text-3xl font-light tracking-tight mt-2 text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-300 mt-1">
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

                {statusData?.status === 'Not Checked In' && (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('check-in')}
                    disabled={actionLoading}
                  >
                    <Play className="mr-1 h-3 w-3" /> Clock In
                  </Button>
                )}

                {statusData?.status === 'Checked In' && (
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-400/10 bg-transparent"
                      onClick={() => handleAction('break-start')}
                      disabled={actionLoading}
                    >
                      <Coffee className="mr-1 h-3 w-3" /> Break
                    </Button>
                    <Button
                      size="xs"
                      className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleAction('check-out')}
                      disabled={actionLoading}
                    >
                      <Square className="mr-1 h-3 w-3" /> Out
                    </Button>
                  </div>
                )}

                {statusData?.status === 'On Break' && (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-amber-600 hover:bg-amber-700"
                    onClick={() => handleAction('break-end')}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" /> End Break
                  </Button>
                )}

                {statusData?.status === 'Checked Out' && (
                  <div className="text-center p-2 bg-slate-700/50 rounded border border-white/10 text-xs text-slate-300">
                    Shift completed
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats - Optional */}
        {history.length > 0 && history[0] && (
          <>
            <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Today's Check-in</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatTime(history[0]?.check_in_time)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Today's Check-out</p>
                  <p className="text-2xl font-bold text-rose-400">{formatTime(history[0]?.check_out_time)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Hours Worked</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatMinutesToHours(history[0]?.total_working_minutes || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Primary Day-wise Table */}
      <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div>
            <CardTitle className="text-2xl">Attendance Records</CardTitle>
            <CardDescription className="text-slate-400">Day-wise breakdown of your attendance history</CardDescription>
          </div>
          <div>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-slate-900 border-white/10 text-white outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-4 text-center text-slate-400">Loading...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-white/10 rounded bg-slate-900/50">No attendance records found for this month.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-white/10">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-300 uppercase bg-slate-900/80 border-b border-white/10">
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
                <tbody className="text-slate-200">
                  {history.map((record) => {
                    const totalBreakMins = record.breaks?.reduce((acc: number, b: any) => acc + (b.total_break_minutes || 0), 0) || 0;
                    const recordDate = new Date(record.date);
                    const dayName = recordDate.toLocaleDateString([], { weekday: 'short' });
                    return (
                      <tr key={record.id} className="border-b border-white/5 hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-4 font-medium text-white">{recordDate.toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-slate-300 text-xs">{dayName}</td>
                        <td className="px-4 py-4 text-emerald-400 font-medium">{formatTime(record.check_in_time)}</td>
                        <td className="px-4 py-4 text-rose-400 font-medium">{formatTime(record.check_out_time)}</td>
                        <td className="px-4 py-4 text-slate-300">{formatMinutesToHours(totalBreakMins)}</td>
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
