"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Calendar,
  AlertCircle,
  Loader2,
  Users,
  Plus,
  Download,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Filter,
  Palmtree,
  CalendarDays,
  CalendarRange,
  X,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import Link from "next/link";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { BiometricPunchTimeline } from "@/components/attendance/BiometricPunchTimeline";
import {
  DailySummaryCard,
  AdminLeaveWfhModal,
  AllEmployeesReportModal,
  EmployeeDateRangeView,
} from "@/components/attendance";
import { MonthlyReportModal } from "@/components/employees/MonthlyReportModal";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth } from "date-fns";

type ViewMode = "directory" | "dateWise" | "dateAllEmployees";

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  designation?: string;
  profile_photo_path?: string;
  team?: { id?: number; name: string };
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

  const [viewMode, setViewMode] = useState<ViewMode>("directory");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });
  const [dateWiseSelectedDate, setDateWiseSelectedDate] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [dailyDetails, setDailyDetails] = useState<AttendanceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLeaveWfhModalOpen, setIsLeaveWfhModalOpen] = useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [isAllEmployeesReportOpen, setIsAllEmployeesReportOpen] = useState(false);
  const [employeeViewTab, setEmployeeViewTab] = useState<"single" | "range">("single");
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => {
    return format(startOfMonth(new Date()), "yyyy-MM-dd");
  });
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => {
    return format(endOfMonth(new Date()), "yyyy-MM-dd");
  });
  const [rangeData, setRangeData] = useState<any | null>(null);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [allEmployeesDateData, setAllEmployeesDateData] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fast single-request employee loading
  useEffect(() => {
    const fetchAllEmployees = async () => {
      setIsLoadingEmployees(true);
      setError(null);
      try {
        const res = await api.get(`/employees?per_page=all`);
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setEmployees(list);
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
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
    const code = (emp.employee_code || "").toLowerCase();
    const designation = (emp.designation || "").toLowerCase();
    const teamName = (emp.team?.name || "").toLowerCase();
    return (
      fullName.includes(query) ||
      code.includes(query) ||
      designation.includes(query) ||
      teamName.includes(query)
    );
  });

  // Handle clicking an employee row in the directory table
  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDrawerOpen(true);
  };

  // Fetch daily details for a specific employee and date
  const handleDateSelection = async (date: string, empId?: number) => {
    const targetId = empId ?? selectedEmployee?.id;
    if (!targetId) return;
    setIsLoadingDetails(true);
    setError(null);
    try {
      const res = await api.get(`/attendance/details?date=${date}&user_id=${targetId}`);
      setDailyDetails(res.data);
      setDateWiseSelectedDate(date);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load attendance details");
      setDailyDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Switch to Date Wise view for selected employee
  const handleOpenDateWise = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDrawerOpen(false);
    setViewMode("dateWise");
    setEmployeeViewTab("single");
    const targetDate = dateWiseSelectedDate || format(new Date(), "yyyy-MM-dd");
    handleDateSelection(targetDate, emp.id);
  };

  // Fetch date range data for selected employee
  const fetchEmployeeDateRange = async (start: string, end: string, empId?: number) => {
    const targetId = empId ?? selectedEmployee?.id;
    if (!targetId) return;
    setIsLoadingRange(true);
    setError(null);
    try {
      const res = await api.get(
        `/reports/attendance-summary?start_date=${start}&end_date=${end}&user_id=${targetId}`
      );
      if (res.data?.data && res.data.data.length > 0) {
        setRangeData(res.data.data[0]);
      } else {
        setRangeData(null);
      }
    } catch (err: any) {
      console.error("Failed to load date range data:", err);
      setError(err.response?.data?.message || "Failed to load date range attendance data");
      setRangeData(null);
    } finally {
      setIsLoadingRange(false);
    }
  };

  // Switch to Date Range view for selected employee
  const handleOpenDateRange = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDrawerOpen(false);
    setViewMode("dateWise");
    setEmployeeViewTab("range");
    fetchEmployeeDateRange(rangeStartDate, rangeEndDate, emp.id);
  };

  // Fetch attendance data for all employees on a specific date
  const handleAllEmployeesDateSelection = async (date: string) => {
    if (!date) return;
    setIsLoadingDetails(true);
    setError(null);
    setSortColumn(null);
    setSortDirection("asc");
    try {
      const res = await api.get(`/reports/attendance-summary`, {
        params: {
          start_date: date,
          end_date: date,
        },
      });

      const reportData = res.data.data || [];

      const transformedData = reportData.map((emp: any) => {
        const dayData = emp.daily_status?.[0];
        return {
          id: emp.id,
          first_name: emp.first_name || emp.name?.split(" ")[0] || "",
          last_name: emp.last_name || emp.name?.split(" ")[1] || "",
          employee_code: emp.employee_code || "",
          designation: emp.designation || emp.employee?.designation || "",
          team: emp.team || emp.employee?.team || null,
          profile_photo_path: emp.profile_photo_path || emp.employee?.profile_photo_path,
          attendance: dayData
            ? {
                first_in: dayData.check_in,
                last_out: dayData.check_out,
                status_label:
                  dayData.status === "P"
                    ? dayData.is_late
                      ? "Late"
                      : "Present"
                    : dayData.status === "A"
                    ? "Absent"
                    : dayData.status === "W"
                    ? "WFH"
                    : "Leave",
                total_working_minutes: dayData.total_working_minutes,
              }
            : null,
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

    const headers = [
      "Employee Name",
      "Employee Code",
      "Designation",
      "Team",
      "Check-In",
      "Check-Out",
      "Total Hours",
      "Status",
    ];
    const rows = allEmployeesDateData.map((emp) => {
      const attendance = emp.attendance || {};
      return [
        `${emp.first_name} ${emp.last_name}`,
        emp.employee_code || "",
        emp.designation || "",
        emp.team?.name || "",
        attendance.first_in ? formatTime(attendance.first_in) : "--:--",
        attendance.last_out ? formatTime(attendance.last_out) : "--:--",
        attendance.total_working_minutes
          ? formatMinutesToHours(attendance.total_working_minutes)
          : "--",
        attendance.status_label || "Absent",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
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
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "--:--";
      return date
        .toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        })
        .toLowerCase();
    } catch {
      return "--:--";
    }
  };

  const formatMinutesToHours = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "--";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
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
      className="text-left py-3.5 px-4 font-semibold cursor-pointer hover:text-[#56348f] dark:hover:text-purple-400 transition-colors select-none text-slate-700 dark:text-slate-200"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortColumn === column && (
          <span className="text-xs text-[#56348f] dark:text-purple-400">
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Super Admin: View daily biometric punches, timeline records, and manage employee attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAllEmployeesReportOpen(true)}
            className="bg-[#56348f] hover:bg-[#462a75] text-white gap-2 font-semibold shadow-sm text-xs sm:text-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            All Employees Report
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30">
          <CardContent className="pt-6 flex gap-4">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────
          MODE 1: DIRECTORY VIEW (DEFAULT)
          ──────────────────────────────────────────────────────── */}
      {viewMode === "directory" && (
        <>
          {/* Card 1: View All Employees on a Date (TOP OPTION) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 sm:p-6 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3
                  style={{
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 500,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white flex items-center gap-2 box-title"
                >
                  <CalendarDays className="w-5 h-5 text-[#56348f] dark:text-purple-400" />
                  View All Employees on a Date
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: "20px",
                    color: "rgb(94, 105, 120)",
                  }}
                  className="dark:text-slate-400 font-normal mt-0.5"
                >
                  Inspect full company attendance logs, check-in times & status for any specific date
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={isLoadingDetails}
                    className="bg-transparent border-0 text-slate-900 dark:text-white text-sm font-medium focus:outline-none cursor-pointer"
                  />
                </div>

                <Button
                  onClick={() => handleAllEmployeesDateSelection(selectedDate)}
                  disabled={!selectedDate || isLoadingDetails}
                  className="bg-[#56348f] hover:bg-[#482b7b] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm gap-2"
                >
                  {isLoadingDetails ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  View Report
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Employees Directory Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200/90 dark:border-slate-700/60">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3
                    style={{
                      fontFamily: '"Proxima Nova", sans-serif',
                      fontSize: "13px",
                      lineHeight: "20px",
                      fontWeight: 500,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white flex items-center gap-2 box-title"
                  >
                    <Clock className="w-5 h-5 text-emerald-500" />
                    Select Employee for Attendance Details
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      color: "rgb(94, 105, 120)",
                    }}
                    className="dark:text-slate-400 font-normal mt-0.5"
                  >
                    Click any employee to view date-wise punch timeline or create Leave / WFH
                  </p>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {filteredEmployees.length} Employee{filteredEmployees.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Search input */}
              <div className="mt-4 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, employee code, designation, or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#56348f]/40 dark:focus:ring-purple-400/40 transition-all"
                />
              </div>
            </div>

            {/* Employee Table */}
            {isLoadingEmployees ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#56348f] dark:text-purple-400" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Loading employee directory...
                </p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No employees found
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search keyword
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60">
                    <tr>
                      <th className="text-left py-3.5 px-5 font-semibold text-slate-600 dark:text-slate-300">
                        Employee
                      </th>
                      <th className="text-left py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        Code
                      </th>
                      <th className="text-left py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        Designation
                      </th>
                      <th className="text-left py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        Team
                      </th>
                      <th className="text-right py-3.5 px-5 font-semibold text-slate-600 dark:text-slate-300">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => handleEmployeeClick(emp)}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <RoyalAvatar
                              src={emp.profile_photo_path}
                              name={`${emp.first_name} ${emp.last_name}`}
                              userId={emp.id}
                              employeeCode={emp.employee_code}
                              className="w-9 h-9 rounded-full shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                            <div className="min-w-0">
                              <RoyalName
                                name={`${emp.first_name} ${emp.last_name}`}
                                userId={emp.id}
                                employeeCode={emp.employee_code}
                                className="font-semibold text-slate-900 dark:text-white truncate block text-sm"
                              />
                              <p className="text-xs text-slate-400 truncate">
                                {emp.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {emp.employee_code || "—"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium">
                          {emp.designation || "Team Member"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                            {emp.team?.name || "General"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#56348f] dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                            View Attendance <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────
          EMPLOYEE ACTION SIDE DRAWER (POPUP MODAL ON RIGHT SIDE)
          ──────────────────────────────────────────────────────── */}
      {isDrawerOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 via-purple-50/30 to-white dark:from-slate-800 dark:to-slate-900">
              {/* Close Button */}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 pr-8">
                <RoyalAvatar
                  src={selectedEmployee.profile_photo_path}
                  name={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                  userId={selectedEmployee.id}
                  employeeCode={selectedEmployee.employee_code}
                  className="w-14 h-14 rounded-full shrink-0 border-2 border-white dark:border-slate-700 shadow-sm text-base"
                />
                <div className="min-w-0">
                  <h2
                    style={{
                      fontSize: "18px",
                      lineHeight: "26px",
                      fontWeight: 600,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white truncate"
                  >
                    <RoyalName
                      name={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                      userId={selectedEmployee.id}
                      employeeCode={selectedEmployee.employee_code}
                    />
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                    Employee Code: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedEmployee.employee_code || "N/A"}</span>
                  </p>
                  <p className="text-xs text-[#56348f] dark:text-purple-400 mt-0.5 font-medium truncate">
                    {selectedEmployee.designation || "Team Member"} {selectedEmployee.team?.name ? `• ${selectedEmployee.team.name}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Select how you want to view attendance:
              </span>

              {/* Option 1: Date Wise */}
              <button
                onClick={() => {
                  handleOpenDateWise(selectedEmployee);
                }}
                className="w-full p-4.5 bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 border border-slate-200/90 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-xl text-left transition-all group flex items-start gap-4 shadow-xs cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center text-[#56348f] dark:text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-[15px]">
                      Date Wise
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    View detailed timeline for a specific date
                  </p>
                </div>
              </button>

              {/* Option 2: Date Range */}
              <button
                onClick={() => {
                  handleOpenDateRange(selectedEmployee);
                }}
                className="w-full p-4.5 bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 border border-slate-200/90 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-xl text-left transition-all group flex items-start gap-4 shadow-xs cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center text-[#56348f] dark:text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-[15px]">
                      Date Range
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    View eSSL usage, leaves, WFH, late days &amp; floor time
                  </p>
                </div>
              </button>

              {/* Option 2: Add Leave / WFH */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsLeaveWfhModalOpen(true);
                }}
                className="w-full p-4.5 bg-white dark:bg-slate-800/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 border border-slate-200/90 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-700/60 rounded-xl text-left transition-all group flex items-start gap-4 shadow-xs cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-[15px]">
                      Add Leave / WFH
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Create leave or work-from-home for this employee
                  </p>
                </div>
              </button>

              {/* Option 3: Monthly Report */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsMonthlyReportOpen(true);
                }}
                className="w-full p-4.5 bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 border border-slate-200/90 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-xl text-left transition-all group flex items-start gap-4 shadow-xs cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center text-[#56348f] dark:text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white text-[15px]">
                      Monthly Report
                    </p>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Generate monthly attendance & leave text report
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                ← Change Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODE 2: DATE WISE VIEW (SINGLE EMPLOYEE TIMELINE)
          ──────────────────────────────────────────────────────── */}
      {viewMode === "dateWise" && selectedEmployee && (
        <div className="space-y-6">
          {/* Top Bar with back button and employee header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewMode("directory");
                    setDailyDetails(null);
                  }}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="Back to Directory"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <RoyalAvatar
                  src={selectedEmployee.profile_photo_path}
                  name={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                  userId={selectedEmployee.id}
                  employeeCode={selectedEmployee.employee_code}
                  className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
                />

                <div>
                  <div className="flex items-center gap-2">
                    <RoyalName
                      name={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                      userId={selectedEmployee.id}
                      employeeCode={selectedEmployee.employee_code}
                      className="font-bold text-slate-900 dark:text-white text-base"
                    />
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      Code: {selectedEmployee.employee_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedEmployee.designation || "Team Member"} • {selectedEmployee.team?.name || "General"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* View Switcher: Single Date vs Date Range */}
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    onClick={() => {
                      setEmployeeViewTab("single");
                      if (!dailyDetails) {
                        handleDateSelection(dateWiseSelectedDate, selectedEmployee.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      employeeViewTab === "single"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Specific Date
                  </button>
                  <button
                    onClick={() => {
                      setEmployeeViewTab("range");
                      if (!rangeData) {
                        fetchEmployeeDateRange(rangeStartDate, rangeEndDate, selectedEmployee.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      employeeViewTab === "range"
                        ? "bg-[#56348f] text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Date Range
                  </button>
                </div>

                {employeeViewTab === "single" && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Date:
                    </label>
                    <input
                      type="date"
                      value={dateWiseSelectedDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setDateWiseSelectedDate(newDate);
                        if (newDate) handleDateSelection(newDate, selectedEmployee.id);
                      }}
                      disabled={isLoadingDetails}
                      className="bg-transparent border-0 text-slate-900 dark:text-white text-sm font-medium focus:outline-none cursor-pointer"
                    />
                  </div>
                )}

                <Button
                  onClick={() => setIsLeaveWfhModalOpen(true)}
                  variant="outline"
                  className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Leave / WFH
                </Button>

                <Button
                  onClick={() => setIsMonthlyReportOpen(true)}
                  variant="outline"
                  className="border-purple-300 dark:border-purple-700 text-[#56348f] dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Monthly Report
                </Button>

                <Button
                  onClick={() => {
                    setViewMode("directory");
                    setDailyDetails(null);
                    setRangeData(null);
                  }}
                  variant="ghost"
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Change Employee
                </Button>
              </div>
            </div>
          </div>

          {/* Render Tab: Date Range or Specific Date */}
          {employeeViewTab === "range" ? (
            <EmployeeDateRangeView
              employee={selectedEmployee}
              startDate={rangeStartDate}
              endDate={rangeEndDate}
              data={rangeData}
              isLoading={isLoadingRange}
              onRangeChange={(start, end) => {
                setRangeStartDate(start);
                setRangeEndDate(end);
                fetchEmployeeDateRange(start, end, selectedEmployee.id);
              }}
            />
          ) : (
            <>
              {/* Daily Details Content */}
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#56348f] dark:text-purple-400" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Loading attendance details for {dateWiseSelectedDate}...
                  </p>
                </div>
              ) : dailyDetails ? (
                <div className="space-y-6">
                  <DailySummaryCard
                    attendance={dailyDetails}
                    totalBreaks={dailyDetails.completed_breaks?.length || 0}
                    isCurrentlyWorking={dailyDetails.is_currently_working}
                  />

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-6">
                    <div className="pb-4 border-b border-slate-200 dark:border-slate-700/60 mb-5">
                      <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                        Biometric Punch Timeline
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Complete record of all biometric punch events in chronological order
                      </p>
                    </div>
                    <BiometricPunchTimeline
                      punches={dailyDetails.raw_punches || []}
                      isCurrentlyWorking={dailyDetails.is_currently_working}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-12 text-center">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No attendance data found for {dateWiseSelectedDate}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    The employee might not have punched in on this date or it is a holiday/weekend
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODE 3: ALL EMPLOYEES ON DATE VIEW
          ──────────────────────────────────────────────────────── */}
      {viewMode === "dateAllEmployees" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewMode("directory");
                      setAllEmployeesDateData([]);
                    }}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors mr-1"
                    title="Back to Directory"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Attendance Report — {selectedDate}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 ml-9">
                  Showing full company attendance status for all registered employees
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3 py-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Change Date:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setSelectedDate(newDate);
                      if (newDate) {
                        handleAllEmployeesDateSelection(newDate);
                      }
                    }}
                    disabled={isLoadingDetails}
                    className="bg-transparent border-0 text-slate-900 dark:text-white text-sm font-medium focus:outline-none cursor-pointer"
                  />
                </div>

                <Button
                  onClick={handleExportCSV}
                  disabled={allEmployeesDateData.length === 0 || isLoadingDetails}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>

                <Button
                  onClick={() => {
                    setViewMode("directory");
                    setAllEmployeesDateData([]);
                  }}
                  variant="outline"
                  className="text-xs"
                >
                  ← Back
                </Button>
              </div>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#56348f] dark:text-purple-400" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Loading attendance records...
              </p>
            </div>
          ) : allEmployeesDateData.length > 0 ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Employees
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {allEmployeesDateData.length}
                  </p>
                </div>
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Punched In
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {allEmployeesDateData.filter((emp) => emp.attendance?.first_in).length}
                  </p>
                </div>
                <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Absent
                  </p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                    {allEmployeesDateData.filter((emp) => !emp.attendance?.first_in).length}
                  </p>
                </div>
                <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Punch-In Rate
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                    {allEmployeesDateData.length > 0
                      ? Math.round(
                          (allEmployeesDateData.filter((emp) => emp.attendance?.first_in).length /
                            allEmployeesDateData.length) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 sticky top-0 backdrop-blur-sm">
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sortedEmployeesData().map((emp) => {
                        const attendance = emp.attendance || {};
                        return (
                          <tr
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmployee({
                                id: emp.id,
                                employee_code: emp.employee_code,
                                first_name: emp.first_name,
                                last_name: emp.last_name,
                                designation: emp.designation,
                                team: emp.team,
                                profile_photo_path: emp.profile_photo_path,
                              });
                              setIsDrawerOpen(true);
                            }}
                            className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 font-medium">
                              <div className="flex items-center gap-2.5">
                                <RoyalAvatar
                                  src={emp.profile_photo_path}
                                  name={`${emp.first_name} ${emp.last_name}`}
                                  userId={emp.id}
                                  employeeCode={emp.employee_code}
                                  className="w-8 h-8 rounded-full shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                                <RoyalName
                                  name={`${emp.first_name} ${emp.last_name}`}
                                  userId={emp.id}
                                  employeeCode={emp.employee_code}
                                  className="text-slate-900 dark:text-white font-semibold text-sm"
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                              {emp.employee_code}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                              {emp.designation || "N/A"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                              {emp.team?.name || "General"}
                            </td>
                            <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                              {attendance.first_in ? formatTime(attendance.first_in) : "--:--"}
                            </td>
                            <td className="py-3.5 px-4 text-center text-rose-600 dark:text-rose-400 font-semibold text-xs">
                              {attendance.last_out ? formatTime(attendance.last_out) : "--:--"}
                            </td>
                            <td className="py-3.5 px-4 text-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
                              {attendance.total_working_minutes
                                ? formatMinutesToHours(attendance.total_working_minutes)
                                : "--"}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  attendance.status_label === "Present"
                                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                    : attendance.status_label === "Late"
                                    ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                                    : attendance.status_label === "WFH"
                                    ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                    : "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                                }`}
                              >
                                {attendance.status_label || "Absent"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/60 p-12 text-center shadow-sm">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No attendance data found for {selectedDate}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Please pick another date to view the attendance report
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin Leave/WFH Modal */}
      <AdminLeaveWfhModal
        isOpen={isLeaveWfhModalOpen}
        onClose={() => setIsLeaveWfhModalOpen(false)}
        onSuccess={() => {
          if (viewMode === "dateWise" && selectedDate) {
            handleDateSelection(dateWiseSelectedDate, selectedEmployee?.id);
          }
        }}
        selectedEmployeeId={selectedEmployee?.id}
      />

      {/* Single Employee Monthly Report Modal */}
      {selectedEmployee && (
        <MonthlyReportModal
          employee={selectedEmployee}
          isOpen={isMonthlyReportOpen}
          onClose={() => setIsMonthlyReportOpen(false)}
        />
      )}

      {/* All Employees Attendance Report Modal */}
      <AllEmployeesReportModal
        isOpen={isAllEmployeesReportOpen}
        onClose={() => setIsAllEmployeesReportOpen(false)}
      />
    </div>
  );
}

