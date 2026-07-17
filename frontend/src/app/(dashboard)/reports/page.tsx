"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { FileText, Users, CalendarDays, BarChart3, Download, Printer, Search, ChevronUp, ChevronDown, Loader2, AlertCircle, Activity } from "lucide-react";
import api, { apiCache } from "@/services/api";
import { format } from "date-fns";

type ReportType = "employees" | "leaves" | "leave-balances" | "attendance-summary";

function exportCSV(data: any[], filename: string, reportType?: string) {
  if (!data.length) return;

  // Define which columns to export based on report type
  let exportData = data;
  if (reportType === 'attendance-summary') {
    // Export summary data: P = total present (including late), L = late subset
    exportData = data.map(emp => ({
      employee_code: emp.employee_code,
      name: emp.name,
      team: emp.team,
      p: emp.p_count || 0,
      l: emp.l_count || 0,
      casual_leave: emp.cl_count || 0,
      sick_leave: emp.sl_count || 0,
      lop: emp.lop_count || 0,
      wfh: emp.wfh_count || 0,
      total_leaves: emp.total_leaves || 0,
    }));
  }

  if (!exportData.length) return;

  // Get headers and filter out nested objects
  const allHeaders = Object.keys(exportData[0]);
  const headers = allHeaders.filter(h =>
    typeof exportData[0][h] !== 'object' || exportData[0][h] === null
  );

  const rows = exportData.map(row => headers.map(h => {
    const val = row[h] ?? "";
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function SortableHeader({ label, col, sort, onSort }: { label: string; col: string; sort: { col: string; dir: "asc" | "desc" }; onSort: (c: string) => void }) {
  const active = sort.col === col;
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap" onClick={() => onSort(col)}>
      <span className="flex items-center gap-1">{label} {active ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronDown className="w-3 h-3 opacity-20" />}</span>
    </th>
  );
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState<ReportType>("employees");
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [userLoaded, setUserLoaded] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [generated, setGenerated] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "", dir: "asc" });
  const perPage = 15;

  useEffect(() => {
    // Mark user as loaded when store has user data
    if (user) setUserLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!userLoaded) return;
    api.get("/reports/employee-list").then(res => setEmployeeList(res.data.data || [])).catch((e) => {
      console.error("Failed to fetch employee list:", e);
    });
  }, [userLoaded]);

  useEffect(() => {
    setReportData([]); setGenerated(false); setPage(1); setSearch(""); setGenError(null);
  }, [reportType, selectedUserId]);

  const handleSort = (col: string) => setSort(prev => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }));

  const handleGenerate = async () => {
    setLoading(true); setGenerated(false); setGenError(null);
    try {
      // Clear report cache before generating fresh data
      apiCache.clearPattern(/\/reports\//);

      const params: any = {};
      if (selectedUserId !== "all") params.user_id = selectedUserId;
      if (reportType === "leaves" || reportType === "attendance-summary") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const res = await api.get(`/reports/${reportType}`, { params });
      const data = res.data.data || [];

      // Validate data structure
      if (!Array.isArray(data)) {
        console.error("Invalid report data structure:", data);
        setGenError("Invalid report data received from server.");
        return;
      }

      setReportData(data);
      setGenerated(true);
      setPage(1);
    } catch (e: any) {
      console.error("Report generation error:", e);
      setGenError(e.response?.data?.message || e.message || "Failed to generate report. Please try again.");
    }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let d = reportData;
    if (search) { const q = search.toLowerCase(); d = d.filter(row => Object.values(row).some(v => String(v ?? "").toLowerCase().includes(q))); }
    if (sort.col) d = [...d].sort((a, b) => { const av = a[sort.col] ?? ""; const bv = b[sort.col] ?? ""; return sort.dir === "asc" ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : String(bv).localeCompare(String(av), undefined, { numeric: true }); });
    return d;
  }, [reportData, search, sort]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  const isSingle = selectedUserId !== "all" && generated && reportData.length === 1;
  const emp = isSingle ? reportData[0] : null;

  // Generate all date headers for attendance-summary (union of all dates from all employees)
  const allDates = useMemo(() => {
    if (reportType !== "attendance-summary" || reportData.length === 0) return [];
    const dateSet = new Set<string>();
    reportData.forEach((emp: any) => {
      emp.daily_status?.forEach((day: any) => {
        dateSet.add(day.date);
      });
    });
    return Array.from(dateSet).sort();
  }, [reportData, reportType]);

  // Show loader while user is being loaded
  if (!userLoaded) {
    return <PageLoader />;
  }

  if (user?.role !== "Super Admin" && user?.role !== "HR") {
    return <div className="flex items-center justify-center h-full text-muted-foreground">You do not have permission to view reports.</div>;
  }

  const tabs: { key: ReportType; label: string; icon: any }[] = [
    { key: "employees", label: "Employee Report", icon: Users },
    { key: "leave-balances", label: "Leave Balance Report", icon: BarChart3 },
    { key: "attendance-summary", label: "Attendance Summary", icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><FileText className="w-7 h-7 text-amber-400" /> Reports</h1>
        <p className="text-muted-foreground mt-1">Generate, filter, and export HR reports.</p>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => { const Icon = t.icon; return (
          <button key={t.key} onClick={() => setReportType(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${reportType === t.key ? "border-amber-400 text-amber-300 bg-amber-500/10" : "border-transparent text-muted-foreground hover:text-white"}`}>
            <Icon className="w-4 h-4" />{t.label}
          </button>
        ); })}
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-border rounded-2xl p-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Employee</label>
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
            className="w-full bg-slate-700 border border-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500">
            <option value="all">All Employees</option>
            {employeeList.map(e => <option key={e.id} value={String(e.id)}>{e.name} ({e.code})</option>)}
          </select>
        </div>
        {(reportType === "leaves" || reportType === "attendance-summary") && <>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">From Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-slate-700 border border-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">To Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-slate-700 border border-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500" />
          </div>
        </>}
        <button onClick={handleGenerate} disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Generating..." : "Generate Report"}
        </button>
        {generated && filtered.length > 0 && <>
          <button onClick={() => exportCSV(filtered, `${reportType}-${format(new Date(), "yyyy-MM-dd")}.csv`, reportType)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-lg transition">
            <Printer className="w-4 h-4" /> Print
          </button>
        </>}
      </div>

      {!generated && !loading && !genError && <div className="text-center py-16 text-slate-500">Select filters and click <strong className="text-muted-foreground">Generate Report</strong> to view data.</div>}
      {genError && <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"><AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm">{genError}</span></div>}
      {generated && reportData.length === 0 && <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3"><AlertCircle className="w-10 h-10 text-slate-500" />No records found.</div>}

      {/* Single employee detailed view */}
      {isSingle && reportType === "employees" && emp && (
        <ErrorBoundary fallback={<div className="text-red-400 p-4 bg-red-500/10 rounded-xl">Error rendering employee report</div>}>
          <SingleEmployeeReport emp={emp} />
        </ErrorBoundary>
      )}
      {isSingle && reportType === "leave-balances" && emp && (
        <ErrorBoundary fallback={<div className="text-red-400 p-4 bg-red-500/10 rounded-xl">Error rendering leave balance report</div>}>
          <SingleLeaveBalanceReport emp={emp} />
        </ErrorBoundary>
      )}

      {/* Table view */}
      {generated && filtered.length > 0 && (!isSingle || reportType === "leaves") && (
        <div className="bg-white/5 border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-border text-white text-sm rounded-lg outline-none focus:border-amber-500 placeholder:text-slate-500" />
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  {reportType === "employees" && <>
                    <SortableHeader label="Code" col="employee_code" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Name" col="full_name" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Department" col="team" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Designation" col="designation" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Team Lead" col="team_lead" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Joining Date" col="joining_date" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Probation End" col="probation_end_date" sort={sort} onSort={handleSort} />
                    <SortableHeader label="CL Balance" col="casual_leave_balance" sort={sort} onSort={handleSort} />
                    <SortableHeader label="SL Balance" col="sick_leave_balance" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Leaves/Mo" col="leaves_taken_this_month" sort={sort} onSort={handleSort} />
                    <SortableHeader label="WFH/Mo" col="wfh_this_month" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Status" col="status" sort={sort} onSort={handleSort} />
                  </>}
                  {reportType === "attendance-summary" && <>
                    <SortableHeader label="Code" col="employee_code" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Name" col="name" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Team" col="team" sort={sort} onSort={handleSort} />
                    {allDates.map((date: string) => (
                      <SortableHeader key={date} label={format(new Date(date + 'T00:00:00'), "MMM dd")} col={date} sort={sort} onSort={handleSort} />
                    ))}
                    <SortableHeader label="P" col="p_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="L" col="l_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="CL" col="cl_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="SL" col="sl_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="LOP" col="lop_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="WFH" col="wfh_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Total" col="total_leaves" sort={sort} onSort={handleSort} />
                  </>}
                  {reportType === "leave-balances" && <>
                    <SortableHeader label="Code" col="employee_code" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Name" col="full_name" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Department" col="team" sort={sort} onSort={handleSort} />
                    <SortableHeader label="CL Balance" col="cl_balance" sort={sort} onSort={handleSort} />
                    <SortableHeader label="SL Balance" col="sl_balance" sort={sort} onSort={handleSort} />
                    <SortableHeader label="CF (CL)" col="cl_carry_forward" sort={sort} onSort={handleSort} />
                    <SortableHeader label="CL Used" col="cl_used" sort={sort} onSort={handleSort} />
                    <SortableHeader label="SL Used" col="sl_used" sort={sort} onSort={handleSort} />
                    <SortableHeader label="LOP" col="lop_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="WFH" col="wfh_count" sort={sort} onSort={handleSort} />
                    <SortableHeader label="Probation" col="is_in_probation" sort={sort} onSort={handleSort} />
                  </>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    {reportType === "employees" && <>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.employee_code}</td>
                      <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{row.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.team || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.designation || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.team_lead || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.joining_date ? format(new Date(row.joining_date), "dd MMM yyyy") : "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.is_in_probation ? <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{row.probation_end_date ? format(new Date(row.probation_end_date), "dd MMM yy") : "In Probation"}</span> : <span className="text-xs text-emerald-400">Done</span>}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">{row.casual_leave_balance}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-400">{row.sick_leave_balance}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.leaves_taken_this_month}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.wfh_this_month}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </>}
                    {reportType === "attendance-summary" && <>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.employee_code}</td>
                      <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{typeof row.name === 'string' ? row.name : (row.first_name + ' ' + row.last_name) || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{typeof row.team === 'object' && row.team?.name ? row.team.name : (typeof row.team === 'string' ? row.team : '—')}</td>
                      {allDates.map((date: string) => {
                        try {
                          const day = Array.isArray(row.daily_status) ? row.daily_status.find((d: any) => d && d.date === date) : null;
                          let textColor = "text-muted-foreground";
                          let displayText = "";

                          if (day && typeof day === 'object') {
                            const status = String(day.status || '').trim();
                            if (status === 'P') {
                              textColor = day.is_late ? "text-amber-400 font-bold" : "text-emerald-400 font-bold";
                              displayText = day.is_late ? "L" : "P";
                            }
                            else if (status === 'A') {
                              textColor = "";
                              displayText = "";
                            }
                            else if (status === 'W') {
                              textColor = "text-blue-400 font-bold";
                              displayText = "WFH";
                            }
                            else if (status === 'H') {
                              textColor = "text-amber-400 font-bold";
                              displayText = day.leave_type || "H";
                            }
                            else if (status === 'L') {
                              textColor = "text-purple-400 font-bold";
                              displayText = day.leave_type || "LV";
                            }
                          }

                          return displayText ? <td key={date} className={`px-1.5 py-2 text-center text-xs ${textColor} whitespace-nowrap`}>{displayText}</td> : <td key={date} className="px-1.5 py-2 text-center text-xs"></td>;
                        } catch (e) {
                          console.error('Error rendering attendance day cell:', e);
                          return <td key={date} className="px-1.5 py-2 text-center text-xs">-</td>;
                        }
                      })}
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">{row.p_count || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-400">{row.l_count || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">{row.cl_count || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-400">{row.sl_count || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-500">{row.lop_count || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-400">{row.wfh_count || 0}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-400">{row.total_leaves || 0}</td>
                    </>}
                    {reportType === "leave-balances" && <>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.employee_code}</td>
                      <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{row.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.team || "—"}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">{row.cl_balance}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-400">{row.sl_balance}</td>
                      <td className="px-4 py-3 text-center text-indigo-400">{row.cl_carry_forward}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.cl_used}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{row.sl_used}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-400">{row.lop_count}</td>
                      <td className="px-4 py-3 text-center text-cyan-400">{row.wfh_count}</td>
                      <td className="px-4 py-3">{row.is_in_probation ? <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">In Probation</span> : <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Confirmed</span>}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-white/5 rounded-lg disabled:opacity-40 hover:bg-white/10 transition">Previous</button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-white/5 rounded-lg disabled:opacity-40 hover:bg-white/10 transition">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const statusStr = String(status || "Unknown").trim();
  const m: Record<string, string> = {
    Active: "bg-emerald-500/20 text-emerald-400",
    Approved: "bg-emerald-500/20 text-emerald-400",
    Pending: "bg-amber-500/20 text-amber-400",
    Rejected: "bg-red-500/20 text-red-400",
    Disabled: "bg-slate-500/20 text-muted-foreground",
    Resigned: "bg-rose-500/20 text-rose-400"
  };
  const classes = m[statusStr] || "bg-white/10 text-muted-foreground";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${classes}`}>{statusStr}</span>;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  const displayValue = typeof value === 'string' || typeof value === 'number' || value === null || value === undefined
    ? (value ?? "—")
    : value;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 border-b border-border py-2.5">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:w-52 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{displayValue}</span>
    </div>
  );
}

function StatBox({ label, value, color = "text-white" }: { label: string; value: any; color?: string }) {
  const displayValue = typeof value === 'number' ? value : (value ?? 0);
  return (
    <div className="bg-white/5 border border-border rounded-xl p-4 text-center">
      <p className={`text-2xl font-black ${color}`}>{isNaN(displayValue) ? 0 : displayValue}</p>
      <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wider leading-tight">{label}</p>
    </div>
  );
}

function SingleEmployeeReport({ emp }: { emp: any }) {
  const fmtDate = (v: any) => v ? format(new Date(v), "dd MMM yyyy") : "—";
  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Employee Profile — {emp.full_name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
          <div>
            <InfoRow label="Employee Code" value={emp.employee_code} />
            <InfoRow label="First Name" value={emp.first_name} />
            <InfoRow label="Last Name" value={emp.last_name} />
            <InfoRow label="Gender" value={emp.gender} />
            <InfoRow label="Date of Birth" value={fmtDate(emp.dob)} />
            <InfoRow label="Age" value={emp.age ? `${emp.age} years` : "—"} />
            <InfoRow label="Marital Status" value={emp.marital_status} />
            <InfoRow label="Blood Group" value={emp.blood_group} />
            <InfoRow label="Department / Team" value={emp.team} />
            <InfoRow label="Designation" value={emp.designation} />
            <InfoRow label="Reporting Team Lead" value={emp.team_lead} />
          </div>
          <div>
            <InfoRow label="Joining Date" value={fmtDate(emp.joining_date)} />
            <InfoRow label="Probation End Date" value={fmtDate(emp.probation_end_date)} />
            <InfoRow label="Probation Status" value={emp.is_in_probation ? <span className="text-amber-400 font-bold">In Probation</span> : <span className="text-emerald-400 font-bold">Completed</span>} />
            <InfoRow label="Years with Company" value={`${emp.service_years} yr(s) • ${emp.service_days} days`} />
            <InfoRow label="Official Email" value={emp.email} />
            <InfoRow label="Personal Email" value={emp.personal_email} />
            <InfoRow label="Contact Number" value={emp.contact_number} />
            <InfoRow label="Emergency Contact" value={emp.alternate_contact_number} />
            <InfoRow label="Current Address" value={emp.current_address} />
            <InfoRow label="Permanent Address" value={emp.permanent_address} />
            <InfoRow label="Employment Status" value={<StatusBadge status={emp.status} />} />
          </div>
        </div>
      </div>
      <div className="bg-white/5 border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-emerald-400" /> Leave Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatBox label="CL Balance" value={emp.casual_leave_balance} color="text-emerald-400" />
          <StatBox label="SL Balance" value={emp.sick_leave_balance} color="text-rose-400" />
          <StatBox label="CF (CL)" value={emp.cl_carry_forward} color="text-indigo-400" />
          <StatBox label="Total CL Avail." value={emp.total_cl_available} color="text-emerald-300" />
          <StatBox label="Total SL Avail." value={emp.total_sl_available} color="text-rose-300" />
          <StatBox label="Taken This Month" value={emp.leaves_taken_this_month} color="text-amber-400" />
          <StatBox label="Taken This Year" value={emp.leaves_taken_this_year} color="text-amber-300" />
          <StatBox label="Pending" value={emp.pending_leaves} color="text-yellow-400" />
          <StatBox label="Approved" value={emp.approved_leaves} color="text-emerald-400" />
          <StatBox label="Rejected" value={emp.rejected_leaves} color="text-red-400" />
          <StatBox label="WFH / Month" value={emp.wfh_this_month} color="text-cyan-400" />
          <StatBox label="WFH / Year" value={emp.wfh_this_year} color="text-cyan-300" />
          <StatBox label="LOP Count" value={emp.lop_count} color="text-red-500" />
        </div>
      </div>
    </div>
  );
}

function SingleLeaveBalanceReport({ emp }: { emp: any }) {
  const fmtDate = (v: any) => v ? format(new Date(v), "dd MMM yyyy") : "—";
  return (
    <div className="bg-white/5 border border-border rounded-2xl p-6">
      <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-400" /> Leave Balance — {emp.full_name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 mb-6">
        <InfoRow label="Probation Status" value={emp.is_in_probation ? <span className="text-amber-400 font-bold">In Probation</span> : <span className="text-emerald-400 font-bold">Completed</span>} />
        <InfoRow label="Probation End Date" value={fmtDate(emp.probation_end_date)} />
        <InfoRow label="Employment Status" value={<StatusBadge status={emp.status} />} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <StatBox label="CL Balance" value={emp.cl_balance} color="text-emerald-400" />
        <StatBox label="SL Balance" value={emp.sl_balance} color="text-rose-400" />
        <StatBox label="CF Casual Leave" value={emp.cl_carry_forward} color="text-indigo-400" />
        <StatBox label="Total CL Available" value={emp.total_cl} color="text-emerald-300" />
        <StatBox label="Total SL Available" value={emp.total_sl} color="text-rose-300" />
        <StatBox label="CL Used (Year)" value={emp.cl_used} color="text-amber-400" />
        <StatBox label="SL Used (Year)" value={emp.sl_used} color="text-amber-300" />
        <StatBox label="LOP Count" value={emp.lop_count} color="text-red-400" />
        <StatBox label="WFH Count" value={emp.wfh_count} color="text-cyan-400" />
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("Report component error:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
