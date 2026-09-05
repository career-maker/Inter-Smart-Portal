"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Copy,
  Check,
  Search,
  Users,
  FileSpreadsheet,
  AlertCircle,
  FileText,
} from "lucide-react";
import api from "@/services/api";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { generateEmployeeReportText } from "@/components/employees/MonthlyReportModal";

interface AllEmployeesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllEmployeesReportModal({
  isOpen,
  onClose,
}: AllEmployeesReportModalProps) {
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [employeesData, setEmployeesData] = useState<any[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [error, setError] = useState("");

  const handleMonthChange = (val: string) => {
    setReportMonth(val);
    if (val) {
      const d = new Date(val + "-01");
      if (!isNaN(d.getTime())) {
        setStartDate(format(startOfMonth(d), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(d), "yyyy-MM-dd"));
      }
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError("");
      setCopiedId(null);
      setCopiedAll(false);

      const res = await api.get(
        `/reports/attendance-summary?start_date=${startDate}&end_date=${endDate}`,
        { timeout: 60000 }
      );

      const data = res.data;
      if (!data || !data.data || data.data.length === 0) {
        throw new Error("No employee attendance data found for the selected period.");
      }

      setEmployeesData(data.data);
      setHasGenerated(true);
    } catch (err: any) {
      console.error("Generate all reports error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to generate report";
      setError(
        errMsg === "Network Error"
          ? "Network Error: Server request timed out or was interrupted. Please ensure the latest backend changes are pulled on the server."
          : errMsg
      );
      setEmployeesData([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReport = async (emp: any) => {
    try {
      const text = generateEmployeeReportText(emp, reportMonth);
      await navigator.clipboard.writeText(text);
      setCopiedId(emp.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === emp.id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy report", err);
    }
  };

  const handleCopyAllReports = async () => {
    try {
      if (filteredEmployees.length === 0) return;
      const combined = filteredEmployees
        .map((emp) => generateEmployeeReportText(emp, reportMonth))
        .join("\n\n==============================\n\n");
      await navigator.clipboard.writeText(combined);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error("Failed to copy all reports", err);
    }
  };

  const filteredEmployees = employeesData.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
    const code = (emp.employee_code || "").toLowerCase();
    const desig = (emp.designation || "").toLowerCase();
    const team = (emp.team?.name || "").toLowerCase();
    return (
      name.includes(q) ||
      code.includes(q) ||
      desig.includes(q) ||
      team.includes(q)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden font-sans">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50/50 via-white to-transparent dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#56348f]/10 dark:bg-purple-950/50 flex items-center justify-center text-[#56348f] dark:text-purple-300 border border-[#56348f]/20 dark:border-purple-800/40 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                All Employees Attendance Report
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate monthly attendance text reports for all active employees in one click.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Date Controls & Action Bar */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Report Month
              </Label>
              <Input
                type="month"
                value={reportMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                From Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !startDate || !endDate}
              className="w-full sm:w-auto bg-[#56348f] hover:bg-[#462a75] text-white font-semibold text-sm shadow-sm gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Reports for All Employees...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate All Reports
                </>
              )}
            </Button>

            {hasGenerated && employeesData.length > 0 && (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total: <strong className="text-slate-800 dark:text-slate-200">{employeesData.length}</strong> employees
                </span>
                <Button
                  onClick={handleCopyAllReports}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      All Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      Copy All Reports
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Content Area: Table with 2 Columns (1. Employee Name 2. Report) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!hasGenerated ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center text-[#56348f] dark:text-purple-300 mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Ready to Generate All Employee Reports
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Select the report month and date range above, then click &quot;Generate All Reports&quot; to view and copy individual attendance reports.
              </p>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#56348f] dark:text-purple-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Calculating attendance, holidays, leaves, and biometric logs for all employees...
              </p>
            </div>
          ) : employeesData.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No employee attendance records found
              </p>
            </div>
          ) : (
            <>
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee by name, code, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#56348f]/40 dark:focus:ring-purple-400/40 transition-all"
                />
              </div>

              {/* 2-Column Table */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-5">1. Employee Name</th>
                      <th className="py-3 px-5 text-right">2. Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-8 text-center text-xs text-slate-400">
                          No employees match &quot;{searchQuery}&quot;
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors"
                        >
                          {/* Column 1: Employee Name */}
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
                                <div className="flex items-center gap-2">
                                  <RoyalName
                                    name={`${emp.first_name} ${emp.last_name}`}
                                    userId={emp.id}
                                    employeeCode={emp.employee_code}
                                    className="font-semibold text-slate-900 dark:text-white text-sm truncate"
                                  />
                                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                    ID: {emp.employee_code || "—"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {emp.designation || "Team Member"} {emp.team?.name ? `• ${emp.team.name}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Report (Copy button) */}
                          <td className="py-3.5 px-5 text-right">
                            <Button
                              size="sm"
                              variant={copiedId === emp.id ? "default" : "outline"}
                              onClick={() => handleCopyReport(emp)}
                              className={`gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                copiedId === emp.id
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                                  : "text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-[#56348f] dark:hover:text-purple-300"
                              }`}
                            >
                              {copiedId === emp.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
