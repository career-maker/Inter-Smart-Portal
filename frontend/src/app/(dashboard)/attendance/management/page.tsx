"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  ChevronDown,
  Loader2,
  Users,
  Plus,
  Download,
} from "lucide-react";
import Link from "next/link";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { DailySummaryCard, DailyActivityTimeline, AdminLeaveWfhModal } from "@/components/attendance";

type ViewMode = "selector" | "dateWise" | "monthWise" | "dateAllEmployees";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  designation?: string;
  team?: { name: string };
}

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

interface MonthlyAttendanceRecord {
  id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_working_minutes: number | null;
  status: string;
  breaks?: Array<{
    total_break_minutes: number;
  }>;
}

export default function AttendanceManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Check if user is Super Admin
  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.push("/attendance");
    }
  }, [user, router]);

  const [viewMode, setViewMode] = useState<ViewMode>("selector");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [dailyDetails, setDailyDetails] = useState<AttendanceDetails | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceRecord[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLeaveWfhModalOpen, setIsLeaveWfhModalOpen] = useState(false);
  const [allEmployeesDateData, setAllEmployeesDateData] = useState<any[]>([]);

  // Fetch employees with pagination
  useEffect(() => {
    const fetchAllEmployees = async () => {
      setIsLoadingEmployees(true);
      setError(null);
      try {
        let allEmployees: Employee[] = [];
        let page = 1;
        let lastPage = 1;

        // Fetch all pages of employees
        do {
          const res = await api.get(`/employees?page=${page}`);
          const pageData = res.data.data || [];

          if (pageData.length === 0) {
            break;
          }

          allEmployees = [...allEmployees, ...pageData];
          lastPage = res.data.meta?.last_page || page;
          page++;
        } while (page <= lastPage);

        console.log("Loaded employees:", allEmployees.length);
        setEmployees(allEmployees);
      } catch (err: any) {
        console.error("Failed to load employees:", err);
        setError(err.response?.data?.message || "Failed to load employees");
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchAllEmployees();
  }, []);

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(query) ||
      emp.last_name.toLowerCase().includes(query) ||
      emp.employee_code.toLowerCase().includes(query)
    );
  });

  // Fetch daily details
  const handleDateSelection = async (date: string) => {
    if (!selectedEmployee) return;
    setIsLoadingDetails(true);
    setError(null);
    try {
      const res = await api.get(`/attendance/details?date=${date}&user_id=${selectedEmployee.id}`);
      setDailyDetails(res.data);
      setSelectedDate(date);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load attendance details");
      setDailyDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Fetch monthly data
  const handleMonthSelection = async (month: string) => {
    if (!selectedEmployee) return;
    setIsLoadingDetails(true);
    setError(null);
    try {
      const res = await api.get(`/attendance?month=${month}&user_id=${selectedEmployee.id}`);
      setMonthlyData(res.data.data || []);
      setSelectedMonth(month);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load monthly data");
      setMonthlyData([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Fetch attendance data for all employees on a specific date
  const handleAllEmployeesDateSelection = async (date: string) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      // Fetch all employees first
      let allEmployees: Employee[] = [];
      let page = 1;
      let lastPage = 1;

      do {
        const empRes = await api.get(`/employees?page=${page}`);
        const pageData = empRes.data.data || [];

        if (pageData.length === 0) {
          break;
        }

        allEmployees = [...allEmployees, ...pageData];
        lastPage = empRes.data.meta?.last_page || page;
        page++;
      } while (page <= lastPage);

      // Fetch attendance for each employee on the selected date
      const attendanceDataPromises = allEmployees.map((emp) =>
        api.get(`/attendance/details?date=${date}&user_id=${emp.id}`)
          .then((res) => ({
            ...emp,
            attendance: res.data,
          }))
          .catch(() => ({
            ...emp,
            attendance: null,
          }))
      );

      const attendanceResults = await Promise.all(attendanceDataPromises);
      setAllEmployeesDateData(attendanceResults);
      setSelectedDate(date);
      setViewMode("dateAllEmployees");
    } catch (err: any) {
      console.error("Failed to load attendance data:", err);
      setError(err.response?.data?.message || "Failed to load attendance data");
      setAllEmployeesDateData([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (allEmployeesDateData.length === 0) return;

    const headers = ["Employee Name", "Employee Code", "Designation", "Team", "Check-In", "Check-Out", "Total Hours", "Status"];
    const rows = allEmployeesDateData.map((emp) => [
      `${emp.first_name} ${emp.last_name}`,
      emp.employee_code || "",
      emp.designation || "",
      emp.team?.name || "",
      emp.attendance?.first_in ? formatTime(emp.attendance.first_in) : "--:--",
      emp.attendance?.last_out ? formatTime(emp.attendance.last_out) : "--:--",
      emp.attendance?.total_working_minutes ? formatMinutesToHours(emp.attendance.total_working_minutes) : "--",
      emp.attendance?.status_label || "Absent",
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedDate || "report"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatMinutesToHours = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "--";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTotalBreakMinutes = (record: MonthlyAttendanceRecord) => {
    return record.breaks?.reduce((sum, b) => sum + (b.total_break_minutes || 0), 0) || 0;
  };

  if (!user || user.role !== "Super Admin") {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/attendance">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Attendance
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white">Attendance Management</h1>
        <p className="text-slate-300">Super Admin: View and manage employee attendance records</p>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-6 flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Selector */}
      {viewMode === "selector" && (
        <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
          <CardHeader>
            <CardTitle>Select Employee</CardTitle>
            <CardDescription className="text-slate-400">
              Choose an employee to view their attendance records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or employee code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Employee List */}
            {isLoadingEmployees ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">No employees found</p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        // Scroll to mode selection section
                        setTimeout(() => {
                          const modeSection = document.querySelector('[data-attendance-mode-selector]');
                          modeSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className="w-full text-left p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {emp.employee_code}
                            {emp.designation && ` • ${emp.designation}`}
                            {emp.team && ` • ${emp.team.name}`}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Employees on Date View */}
      {!selectedEmployee && viewMode === "selector" && (
        <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
          <CardHeader>
            <CardTitle>View All Employees on a Date</CardTitle>
            <CardDescription className="text-slate-400">
              View attendance records for all employees on a specific date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-300">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleAllEmployeesDateSelection(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
              />
              {selectedDate && (
                <button
                  onClick={handleExportCSV}
                  disabled={allEmployeesDateData.length === 0}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-semibold transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Employees on Date - Table View */}
      {viewMode === "dateAllEmployees" && (
        <>
          <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Report - {selectedDate}</CardTitle>
                  <CardDescription className="text-slate-400">All employees attendance</CardDescription>
                </div>
                <button
                  onClick={() => {
                    setViewMode("selector");
                    setAllEmployeesDateData([]);
                    setSelectedDate("");
                  }}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  ← Back
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : allEmployeesDateData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Employee</th>
                        <th className="text-left py-3 px-4 font-semibold">Code</th>
                        <th className="text-left py-3 px-4 font-semibold">Designation</th>
                        <th className="text-left py-3 px-4 font-semibold">Team</th>
                        <th className="text-center py-3 px-4 font-semibold">Check-In</th>
                        <th className="text-center py-3 px-4 font-semibold">Check-Out</th>
                        <th className="text-center py-3 px-4 font-semibold">Hours</th>
                        <th className="text-center py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEmployeesDateData.map((emp) => (
                        <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-white">{emp.first_name} {emp.last_name}</td>
                          <td className="py-3 px-4 text-slate-300">{emp.employee_code}</td>
                          <td className="py-3 px-4 text-slate-300">{emp.designation || "N/A"}</td>
                          <td className="py-3 px-4 text-slate-300">{emp.team?.name || "Unassigned"}</td>
                          <td className="py-3 px-4 text-center text-emerald-400">
                            {emp.attendance?.first_in ? formatTime(emp.attendance.first_in) : "--:--"}
                          </td>
                          <td className="py-3 px-4 text-center text-rose-400">
                            {emp.attendance?.last_out ? formatTime(emp.attendance.last_out) : "--:--"}
                          </td>
                          <td className="py-3 px-4 text-center text-blue-400">
                            {emp.attendance?.total_working_minutes ? formatMinutesToHours(emp.attendance.total_working_minutes) : "--"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              emp.attendance?.status_label === "Present" ? "bg-emerald-500/20 text-emerald-400" :
                              emp.attendance?.status_label === "Absent" ? "bg-rose-500/20 text-rose-400" :
                              "bg-slate-500/20 text-slate-400"
                            }`}>
                              {emp.attendance?.status_label || "Absent"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-semibold transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Export as CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  No attendance data found for this date.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Mode Selection */}
      {selectedEmployee && viewMode === "selector" && (
        <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white" data-attendance-mode-selector>
          <CardHeader>
            <CardTitle>
              {selectedEmployee.first_name} {selectedEmployee.last_name}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Employee Code: {selectedEmployee.employee_code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300 mb-4">Select how you want to view attendance:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setSelectedDate("");
                  setViewMode("dateWise");
                }}
                className="p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all text-left"
              >
                <Calendar className="h-8 w-8 text-amber-400 mb-2" />
                <p className="font-semibold text-white">Date Wise</p>
                <p className="text-sm text-slate-400 mt-1">
                  View detailed timeline for a specific date
                </p>
              </button>
              <button
                onClick={() => {
                  setSelectedMonth("");
                  setViewMode("monthWise");
                }}
                className="p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all text-left"
              >
                <Clock className="h-8 w-8 text-blue-400 mb-2" />
                <p className="font-semibold text-white">Month Wise</p>
                <p className="text-sm text-slate-400 mt-1">View summary for an entire month</p>
              </button>
            </div>
            <button
              onClick={() => setIsLeaveWfhModalOpen(true)}
              className="w-full p-4 bg-amber-600/20 hover:bg-amber-600/30 rounded-lg border border-amber-500/30 hover:border-amber-500/50 transition-all text-left"
            >
              <Plus className="h-5 w-5 text-amber-400 mb-2" />
              <p className="font-semibold text-white">Add Leave / WFH</p>
              <p className="text-sm text-slate-400 mt-1">Create leave or work-from-home for this employee</p>
            </button>
            <button
              onClick={() => {
                setSelectedEmployee(null);
                setSearchQuery("");
              }}
              className="w-full p-2 text-center text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Change Employee
            </button>
          </CardContent>
        </Card>
      )}

      {/* Date Wise Mode */}
      {selectedEmployee && viewMode === "dateWise" && (
        <>
          {/* Header with back button and date picker */}
          <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">Date Wise View</CardDescription>
                </div>
                <button
                  onClick={() => {
                    setViewMode("selector");
                    setSelectedDate("");
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ← Change
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300">Select Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelection(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daily Details */}
          {selectedDate && (
            <>
              {isLoadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : dailyDetails ? (
                <>
                  <DailySummaryCard
                    attendance={dailyDetails}
                    totalBreaks={dailyDetails.completed_breaks?.length || 0}
                    isCurrentlyWorking={dailyDetails.is_currently_working}
                  />

                  <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
                    <CardHeader className="pb-4 border-b border-white/5">
                      <CardTitle>Daily Activity Timeline</CardTitle>
                      <CardDescription className="text-slate-400">
                        Chronological record of all punch events
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <DailyActivityTimeline
                        rawPunches={dailyDetails.raw_punches || []}
                        isCurrentlyWorking={dailyDetails.is_currently_working}
                        firstIn={dailyDetails.first_in}
                        lastOut={dailyDetails.last_out}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-slate-600 bg-slate-900/50">
                  <CardContent className="pt-6 text-center text-slate-300">
                    No attendance data found for this date.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Month Wise Mode */}
      {selectedEmployee && viewMode === "monthWise" && (
        <>
          {/* Header with back button and month picker */}
          <Card className="shadow-sm border-white/10 bg-slate-800/50 backdrop-blur-sm text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">Month Wise View</CardDescription>
                </div>
                <button
                  onClick={() => {
                    setViewMode("selector");
                    setSelectedMonth("");
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ← Change
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300">Select Month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthSelection(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Monthly Data */}
          {selectedMonth && (
            <>
              {isLoadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : monthlyData.length > 0 ? (
                <div className="space-y-3">
                  {monthlyData.map((record) => (
                    <div key={record.id}>
                      {/* Day Row */}
                      <button
                        onClick={() =>
                          setExpandedDay(expandedDay === record.date ? null : record.date)
                        }
                        className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-white/10 rounded-lg transition-all text-left"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-center">
                          <div>
                            <p className="font-semibold text-white">{formatDate(record.date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Check-In</p>
                            <p className="font-mono text-emerald-400">
                              {formatTime(record.check_in_time)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Check-Out</p>
                            <p className="font-mono text-rose-400">
                              {record.check_out_time ? formatTime(record.check_out_time) : "Working"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Hours</p>
                            <p className="font-semibold text-blue-400">
                              {formatMinutesToHours(record.total_working_minutes)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Breaks</p>
                            <p className="text-sm text-slate-300">{record.breaks?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Status</p>
                            <Badge
                              variant="outline"
                              className="text-xs bg-slate-700/30 text-slate-300"
                            >
                              {record.status || "Present"}
                            </Badge>
                          </div>
                          <div className="flex justify-end">
                            <ChevronDown
                              className={`h-5 w-5 text-slate-400 transition-transform ${
                                expandedDay === record.date ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Expanded Daily Detail */}
                      {expandedDay === record.date && (
                        <div className="mt-2 p-4 bg-slate-900/50 border border-white/10 rounded-lg space-y-4">
                          {isLoadingDetails ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                          ) : dailyDetails && dailyDetails.date === record.date ? (
                            <>
                              <div className="text-sm text-slate-300 mb-4">
                                <p className="font-semibold mb-2">Full Daily Timeline</p>
                                <DailyActivityTimeline
                                  rawPunches={dailyDetails.raw_punches || []}
                                  isCurrentlyWorking={dailyDetails.is_currently_working}
                                  firstIn={dailyDetails.first_in}
                                  lastOut={dailyDetails.last_out}
                                />
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDateSelection(record.date)}
                              className="w-full p-3 bg-slate-800 hover:bg-slate-800/80 border border-white/10 rounded text-sm text-center text-slate-300 hover:text-white transition-colors"
                            >
                              Load Full Timeline
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="border-slate-600 bg-slate-900/50">
                  <CardContent className="pt-6 text-center text-slate-300">
                    No attendance records found for this month.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Admin Leave/WFH Modal */}
      <AdminLeaveWfhModal
        isOpen={isLeaveWfhModalOpen}
        onClose={() => setIsLeaveWfhModalOpen(false)}
        onSuccess={() => {
          // Refresh data if needed
          if (selectedDate) handleDateSelection(selectedDate);
          if (selectedMonth) handleMonthSelection(selectedMonth);
        }}
        selectedEmployeeId={selectedEmployee?.id}
      />
    </div>
  );
}
