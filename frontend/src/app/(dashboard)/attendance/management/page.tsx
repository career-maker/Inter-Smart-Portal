"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Calendar,
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

type ViewMode = "selector" | "dateWise" | "dateAllEmployees";

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [dailyDetails, setDailyDetails] = useState<AttendanceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLeaveWfhModalOpen, setIsLeaveWfhModalOpen] = useState(false);
  const [allEmployeesDateData, setAllEmployeesDateData] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  // Fetch attendance data for all employees on a specific date
  const handleAllEmployeesDateSelection = async (date: string) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      // Use attendance summary report endpoint which fetches all employees' attendance in one call
      // This is much more efficient than fetching each employee individually (N+1 problem)
      const res = await api.get(`/reports/attendance-summary`, {
        params: {
          start_date: date,
          end_date: date, // Same date for single day report
        }
      });

      const reportData = res.data.data || [];

      // Transform attendance-summary data to match expected format
      const transformedData = reportData.map((emp: any) => {
        // Get the attendance data for the selected date
        const dayData = emp.daily_status?.[0]; // First day (since we only query 1 day)

        return {
          id: emp.id,
          first_name: emp.first_name || emp.name?.split(' ')[0] || '',
          last_name: emp.last_name || emp.name?.split(' ')[1] || '',
          employee_code: emp.employee_code || '',
          designation: emp.designation || emp.employee?.designation || '',
          team: emp.team || emp.employee?.team || null,
          profile_photo_path: emp.profile_photo_path || emp.employee?.profile_photo_path,
          attendance: dayData ? {
            first_in: dayData.check_in,
            last_out: dayData.check_out,
            status_label: dayData.status === 'P' ? (dayData.is_late ? 'Late' : 'Present') :
                         dayData.status === 'A' ? 'Absent' :
                         dayData.status === 'W' ? 'WFH' : 'Leave',
            total_working_minutes: dayData.total_working_minutes,
          } : null,
        };
      });

      setAllEmployeesDateData(transformedData);
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
    const rows = allEmployeesDateData.map((emp) => {
      const attendance = emp.attendance || {};
      return [
        `${emp.first_name} ${emp.last_name}`,
        emp.employee_code || "",
        emp.designation || "",
        emp.team?.name || "",
        attendance.first_in ? formatTime(attendance.first_in) : "--:--",
        attendance.last_out ? formatTime(attendance.last_out) : "--:--",
        attendance.total_working_minutes ? formatMinutesToHours(attendance.total_working_minutes) : "--",
        attendance.status_label || "Absent",
      ];
    });

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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedEmployeesData = () => {
    if (!sortColumn) return allEmployeesDateData;

    const sorted = [...allEmployeesDateData].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortColumn === "name") {
        aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
        bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (sortColumn === "code") {
        aVal = a.employee_code || "";
        bVal = b.employee_code || "";
      } else if (sortColumn === "designation") {
        aVal = (a.designation || "").toLowerCase();
        bVal = (b.designation || "").toLowerCase();
      } else if (sortColumn === "team") {
        aVal = (a.team?.name || "").toLowerCase();
        bVal = (b.team?.name || "").toLowerCase();
      } else if (sortColumn === "check_in") {
        aVal = a.attendance?.first_in || "";
        bVal = b.attendance?.first_in || "";
      } else if (sortColumn === "check_out") {
        aVal = a.attendance?.last_out || "";
        bVal = b.attendance?.last_out || "";
      } else if (sortColumn === "hours") {
        aVal = a.attendance?.total_working_minutes || 0;
        bVal = b.attendance?.total_working_minutes || 0;
      } else if (sortColumn === "status") {
        aVal = (a.attendance?.status_label || "").toLowerCase();
        bVal = (b.attendance?.status_label || "").toLowerCase();
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });

    return sorted;
  };

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      onClick={() => handleSort(column)}
      className="text-left py-3 px-4 font-semibold cursor-pointer hover:text-amber-400 transition-colors select-none"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortColumn === column && (
          <span className="text-xs text-amber-400">
            {sortDirection === "asc" ? "▲" : "▼"}
          </span>
        )}
      </div>
    </th>
  );

  if (!user || user.role !== "Super Admin") {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Management</h1>
        <p className="text-slate-600 dark:text-slate-300">Super Admin: View and manage employee attendance records</p>
      </div>

      {error && viewMode !== "dateAllEmployees" && (
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
        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
          <CardHeader>
            <CardTitle>Select Employee</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Choose an employee to view their attendance records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or employee code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Employee List */}
            {isLoadingEmployees ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-4">No employees found</p>
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
                      className="w-full text-left p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.employee_code}
                            {emp.designation && ` • ${emp.designation}`}
                            {emp.team && ` • ${emp.team.name}`}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
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
        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white relative">
          {isLoadingDetails && (
            <div className="absolute inset-0 bg-black/40 rounded-lg backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Loading attendance data...</p>
              </div>
            </div>
          )}
          <CardHeader>
            <CardTitle>View All Employees on a Date</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              View attendance records for all employees on a specific date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-300">Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleAllEmployeesDateSelection(e.target.value)}
                disabled={isLoadingDetails}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {selectedDate && !isLoadingDetails && (
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
          <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white relative">
            {isLoadingDetails && (
              <div className="absolute inset-0 bg-black/40 rounded-lg backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Loading attendance data...</p>
                </div>
              </div>
            )}
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle>Attendance Report - {selectedDate}</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">All employees attendance</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-300">Change Date:</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAllEmployeesDateSelection(e.target.value);
                        }
                      }}
                      disabled={isLoadingDetails}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <button
                    onClick={handleExportCSV}
                    disabled={allEmployeesDateData.length === 0 || isLoadingDetails}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("selector");
                      setAllEmployeesDateData([]);
                      setSelectedDate("");
                    }}
                    disabled={isLoadingDetails}
                    className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-semibold"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {allEmployeesDateData.length > 0 ? (
                <>
                  {/* Summary Stats */}
                  <div className="mb-4 grid grid-cols-4 gap-3">
                    <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Employees</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{allEmployeesDateData.length}</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-400 uppercase tracking-wider">Punched In</p>
                      <p className="text-xl font-bold text-emerald-300 mt-1">
                        {allEmployeesDateData.filter(emp => emp.attendance?.first_in).length}
                      </p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-rose-400 uppercase tracking-wider">Absent</p>
                      <p className="text-xl font-bold text-rose-300 mt-1">
                        {allEmployeesDateData.filter(emp => !emp.attendance?.first_in).length}
                      </p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-400 uppercase tracking-wider">Punch-In Rate</p>
                      <p className="text-xl font-bold text-blue-300 mt-1">
                        {allEmployeesDateData.length > 0
                          ? Math.round((allEmployeesDateData.filter(emp => emp.attendance?.first_in).length / allEmployeesDateData.length) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200 dark:border-white/10">
                        <tr>
                          <SortHeader column="name" label="Employee" />
                          <SortHeader column="code" label="Code" />
                          <SortHeader column="designation" label="Designation" />
                          <SortHeader column="team" label="Team" />
                          <SortHeader column="check_in" label="Check-In" />
                          <SortHeader column="check_out" label="Check-Out" />
                          <SortHeader column="hours" label="Hours" />
                          <SortHeader column="status" label="Status" />
                        </tr>
                      </thead>
                    <tbody>
                      {sortedEmployeesData().map((emp) => {
                        const attendance = emp.attendance || {};
                        return (
                          <tr key={emp.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-slate-900 dark:text-white">{emp.first_name} {emp.last_name}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.employee_code}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.designation || "N/A"}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.team?.name || "Unassigned"}</td>
                            <td className="py-3 px-4 text-center text-emerald-400">
                              {attendance.first_in ? formatTime(attendance.first_in) : "--:--"}
                            </td>
                            <td className="py-3 px-4 text-center text-rose-400">
                              {attendance.last_out ? formatTime(attendance.last_out) : "--:--"}
                            </td>
                            <td className="py-3 px-4 text-center text-blue-400">
                              {attendance.total_working_minutes ? formatMinutesToHours(attendance.total_working_minutes) : "--"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                attendance.status_label === "Present" ? "bg-emerald-500/20 text-emerald-400" :
                                attendance.status_label === "Absent" ? "bg-rose-500/20 text-rose-400" :
                                "bg-slate-500/20 text-slate-400"
                              }`}>
                                {attendance.status_label || "Absent"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No attendance data found for this date.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Mode Selection */}
      {selectedEmployee && viewMode === "selector" && (
        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white" data-attendance-mode-selector>
          <CardHeader>
            <CardTitle>
              {selectedEmployee.first_name} {selectedEmployee.last_name}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Employee Code: {selectedEmployee.employee_code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Select how you want to view attendance:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setSelectedDate("");
                  setViewMode("dateWise");
                }}
                className="p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-white/10 hover:border-white/20 transition-all text-left"
              >
                <Calendar className="h-8 w-8 text-amber-400 mb-2" />
                <p className="font-semibold text-slate-900 dark:text-white">Date Wise</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  View detailed timeline for a specific date
                </p>
              </button>
            </div>
            <button
              onClick={() => setIsLeaveWfhModalOpen(true)}
              className="w-full p-4 bg-amber-600/20 hover:bg-amber-600/30 rounded-lg border border-amber-500/30 hover:border-amber-500/50 transition-all text-left"
            >
              <Plus className="h-5 w-5 text-amber-400 mb-2" />
              <p className="font-semibold text-slate-900 dark:text-white">Add Leave / WFH</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create leave or work-from-home for this employee</p>
            </button>
            <button
              onClick={() => {
                setSelectedEmployee(null);
                setSearchQuery("");
              }}
              className="w-full p-2 text-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
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
          <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white relative">
            {isLoadingDetails && (
              <div className="absolute inset-0 bg-black/40 rounded-lg backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Loading attendance details...</p>
                </div>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">Date Wise View</CardDescription>
                </div>
                <button
                  onClick={() => {
                    setViewMode("selector");
                    setSelectedDate("");
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  ← Change
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-600 dark:text-slate-300">Select Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelection(e.target.value)}
                  disabled={isLoadingDetails}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daily Details */}
          {selectedDate && (
            <>
              {isLoadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
                </div>
              ) : dailyDetails ? (
                <>
                  <DailySummaryCard
                    attendance={dailyDetails}
                    totalBreaks={dailyDetails.completed_breaks?.length || 0}
                    isCurrentlyWorking={dailyDetails.is_currently_working}
                  />

                  <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white">
                    <CardHeader className="pb-4 border-b border-slate-200 dark:border-white/5">
                      <CardTitle>Daily Activity Timeline</CardTitle>
                      <CardDescription className="text-slate-500 dark:text-slate-400">
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
                  <CardContent className="pt-6 text-center text-slate-600 dark:text-slate-300">
                    No attendance data found for this date.
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
        }}
        selectedEmployeeId={selectedEmployee?.id}
      />
    </div>
  );
}
