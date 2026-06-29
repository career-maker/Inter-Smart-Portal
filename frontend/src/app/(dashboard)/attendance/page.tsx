"use client";

import { useState, useEffect } from "react";
import { Clock, Play, Square, Coffee, CheckCircle } from "lucide-react";
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        api.get("/attendance/status"),
        api.get("/attendance")
      ]);
      setStatusData(statusRes.data);
      setHistory(historyRes.data.data.data);
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
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Track your daily working hours and breaks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Widget */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 pb-4 border-b text-center">
              <CardTitle className="text-xl">Time Clock</CardTitle>
              <div className="text-4xl font-light tracking-tight mt-4 mb-1 text-primary">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-4">Loading status...</div>
              ) : (
                <div className="flex flex-col gap-4">
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Status:</span>
                    <Badge variant={statusData?.status === 'Checked In' ? 'default' : statusData?.status === 'On Break' ? 'secondary' : 'outline'}>
                      {statusData?.status}
                    </Badge>
                  </div>

                  {statusData?.status === 'Not Checked In' && (
                    <Button 
                      size="lg" 
                      className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction('check-in')}
                      disabled={actionLoading}
                    >
                      <Play className="mr-2 h-6 w-6" /> Clock In
                    </Button>
                  )}

                  {statusData?.status === 'Checked In' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="h-16 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => handleAction('break-start')}
                        disabled={actionLoading}
                      >
                        <Coffee className="mr-2 h-5 w-5" /> Start Break
                      </Button>
                      <Button 
                        size="lg" 
                        className="h-16 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleAction('check-out')}
                        disabled={actionLoading}
                      >
                        <Square className="mr-2 h-5 w-5" /> Clock Out
                      </Button>
                    </div>
                  )}

                  {statusData?.status === 'On Break' && (
                    <Button 
                      size="lg" 
                      className="w-full h-16 text-lg bg-amber-600 hover:bg-amber-700"
                      onClick={() => handleAction('break-end')}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="mr-2 h-6 w-6" /> End Break
                    </Button>
                  )}

                  {statusData?.status === 'Checked Out' && (
                    <div className="text-center p-4 bg-gray-50 rounded border text-muted-foreground">
                      You have completed your shift for today. Great job!
                    </div>
                  )}

                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timesheet */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm h-full">
            <CardHeader>
              <CardTitle>Timesheet History</CardTitle>
              <CardDescription>Your recent attendance records and calculated working hours.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center">Loading...</div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border rounded bg-gray-50/50">No attendance records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Clock In</th>
                        <th className="px-4 py-3">Clock Out</th>
                        <th className="px-4 py-3">Break Time</th>
                        <th className="px-4 py-3 text-right">Effective Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => {
                        const totalBreakMins = record.breaks?.reduce((acc: number, b: any) => acc + (b.total_break_minutes || 0), 0) || 0;
                        return (
                          <tr key={record.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-4 font-medium">{new Date(record.date).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-green-700 font-medium">{formatTime(record.check_in_time)}</td>
                            <td className="px-4 py-4 text-red-700 font-medium">{formatTime(record.check_out_time)}</td>
                            <td className="px-4 py-4">{formatMinutesToHours(totalBreakMins)}</td>
                            <td className="px-4 py-4 text-right font-bold text-primary">
                              {record.total_working_minutes !== null ? formatMinutesToHours(record.total_working_minutes) : '--'}
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

      </div>
    </div>
  );
}
