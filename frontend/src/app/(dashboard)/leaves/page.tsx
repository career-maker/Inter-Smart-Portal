"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Calendar, Clock, CheckCircle, XCircle, 
  Info, Sparkles, FileText, ChevronRight, X
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { FavoriteButton } from "@/components/layout/FavoriteButton";
import { useRefreshKey } from "@/hooks/useRefreshKey";

/* ─── Semi-Circular Arc Meter Gauge ──────────────────────────────── */
function SemiCircleGauge({
  value,
  max = 24,
  color = "#7c3aed",
  label = "Available",
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
}) {
  const safeMax = max > 0 ? max : 24;
  const ratio = Math.min(Math.max(value / safeMax, 0), 1);
  const radius = 68;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // 213.6
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center justify-center relative my-2">
      <svg width="180" height="105" viewBox="0 0 180 105" className="overflow-visible">
        {/* Background track */}
        <path
          d="M 22 90 A 68 68 0 0 1 158 90"
          fill="none"
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Active progress arc */}
        <path
          d="M 22 90 A 68 68 0 0 1 158 90"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center Value */}
      <div className="absolute top-[48px] flex flex-col items-center">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
          {value} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Days</span>
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function LeavesPage() {
  const router = useRouter();
  const refreshKey = useRefreshKey();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";

  const [rawBalances, setRawBalances] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [allUserRequests, setAllUserRequests] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filteredTotals, setFilteredTotals] = useState<any>(null);

  // Detail Modal state
  const [selectedBalanceDetail, setSelectedBalanceDetail] = useState<{
    title: string;
    available: number;
    consumed: number;
    carryForward: number;
    regularBalance: number;
    monthlyQuota: number;
    color: string;
    description: string;
  } | null>(null);

  const handleCancelLeave = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this pending leave request?")) return;
    setCancellingId(id);
    try {
      await api.post(`/leave-requests/${id}/cancel`);
      fetchData(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to cancel leave request.");
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, filterType, filterFromDate, filterToDate, refreshKey]);

  const clearFilters = () => {
    setFilterType("");
    setFilterFromDate("");
    setFilterToDate("");
    setCurrentPage(1);
  };

  const fetchData = async (page = 1) => {
    setIsLoading(true);
    try {
      let queryParams = `page=${page}`;
      if (filterType) queryParams += `&type=${filterType}`;
      if (filterFromDate) queryParams += `&from_date=${filterFromDate}`;
      if (filterToDate) queryParams += `&to_date=${filterToDate}`;

      const [balRes, reqRes, allReqRes] = await Promise.all([
        api.get("/leave-balances"),
        api.get(`/leave-requests?${queryParams}`),
        api.get("/leave-requests?per_page=200"),
      ]);

      const filtered = reqRes.data.filtered_totals;
      setFilteredTotals(filtered || null);

      const balanceData = balRes.data.data;
      setRawBalances(balanceData || null);

      if (balanceData && !isSuperAdmin) {
        const regCL = Number(balanceData.casual_leave_balance) || 0;
        const cfCL = Number(balanceData.cl_carry_forward) || 0;
        const clBalance = regCL + cfCL;
        const slBalance = Number(balanceData.sick_leave_balance) || 0;
        const monthlyCL = Number(balanceData.monthly_casual_leaves) || 1;
        const monthlySL = Number(balanceData.monthly_sick_leaves) || 1;

        setBalances([
          {
            id: 1,
            leave_type: { name: "Casual Leave" },
            color: "#7c3aed", // Royal purple
            remaining: clBalance,
            regular_balance: regCL,
            cl_carry_forward: cfCL,
            total_taken: filtered?.casual ?? 0,
            monthly_quota: monthlyCL,
            desc: "Standard casual time-off for personal commitments, travel, or family affairs. Refills monthly.",
          },
          {
            id: 2,
            leave_type: { name: "Sick Leaves" },
            color: "#f87171", // Coral red
            remaining: slBalance,
            regular_balance: slBalance,
            cl_carry_forward: 0,
            total_taken: filtered?.sick ?? 0,
            monthly_quota: monthlySL,
            desc: "Allocated for medical reasons, illness recovery, and healthcare visits. Refills monthly.",
          },
        ]);
      }

      const paginatedRes = reqRes.data.data;
      const allRequests = paginatedRes?.data || [];
      const cleanList = allRequests.filter((r: any) => {
        const name = r.leave_type?.name?.toLowerCase() || "";
        return !name.includes("wfh") && !name.includes("work from home");
      });
      setRequests(cleanList);

      const fullList = (allReqRes.data.data?.data || allReqRes.data.data || []).filter((r: any) => {
        const name = r.leave_type?.name?.toLowerCase() || "";
        return !name.includes("wfh") && !name.includes("work from home");
      });
      setAllUserRequests(fullList);

      if (paginatedRes) {
        setPagination({
          current_page: paginatedRes.current_page,
          last_page: paginatedRes.last_page,
          total: paginatedRes.total,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Compute Statistics from Approved Requests ────────────────── */
  const stats = useMemo(() => {
    const approved = allUserRequests.filter((r) => r.status === "Approved");
    const currentYear = new Date().getFullYear();

    // 1. Weekly Pattern (Mon .. Sun)
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekCounts: Record<string, number> = {
      Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
    };

    // 2. Monthly Stats (Jan .. Dec)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthCounts: Record<string, number> = {};
    monthNames.forEach((m) => { monthCounts[m] = 0; });

    // 3. Consumed Types Breakdown
    const typeCounts: Record<string, number> = {};

    approved.forEach((req) => {
      const days = Number(req.days_taken ?? req.actual_leave_days ?? 1);
      const typeName = req.leave_type?.name || "Other";
      typeCounts[typeName] = (typeCounts[typeName] || 0) + days;

      if (req.start_date) {
        const d = new Date(req.start_date);
        if (!isNaN(d.getTime())) {
          // Weekday (0=Sun, 1=Mon, ..., 6=Sat)
          const dayIdx = d.getDay();
          const dayKey = dayIdx === 0 ? "Sun" : weekDays[dayIdx - 1];
          if (dayKey && weekCounts[dayKey] !== undefined) {
            weekCounts[dayKey] += days;
          }

          // Month (if matching current year)
          if (d.getFullYear() === currentYear) {
            const mKey = monthNames[d.getMonth()];
            if (mKey && monthCounts[mKey] !== undefined) {
              monthCounts[mKey] += days;
            }
          }
        }
      }
    });

    const maxWeekly = Math.max(...Object.values(weekCounts), 1);
    const maxMonthly = Math.max(...Object.values(monthCounts), 1);
    const totalConsumed = Object.values(typeCounts).reduce((a, b) => a + b, 0);

    return {
      weekDays,
      weekCounts,
      maxWeekly,
      monthNames,
      monthCounts,
      maxMonthly,
      typeCounts,
      totalConsumed,
    };
  }, [allUserRequests]);

  const pendingRequestsCount = useMemo(() => {
    return allUserRequests.filter(
      (r) => r.status === "Pending" || r.tl_status === "Pending" || r.admin_status === "Pending"
    ).length;
  }, [allUserRequests]);

  const getStatusBadge = (req: any) => {
    if (req.status === "Cancelled")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          <XCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    if (req.status === "Approved")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    if (req.status === "Rejected")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );

    let pendingText = "Pending";
    if (req.tl_status === "Pending") pendingText = "Pending TL";
    else if (req.admin_status === "Pending") pendingText = "Pending Admin";

    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> {pendingText}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="p-5 rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-3 animate-pulse border border-slate-700/50">
          <img
            src="/preloader.gif"
            alt="Loading..."
            className="w-12 h-12 object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-6xl mx-auto">

      {/* ── Top Header Banner (Keka Style) ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 border border-purple-200 dark:border-purple-800/60">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
              {pendingRequestsCount === 0 ? (
                isSuperAdmin ? "No pending leave requests" : "Hurray! No pending leave requests"
              ) : isSuperAdmin ? (
                <>There are <span className="text-amber-600 dark:text-amber-400 font-extrabold mx-1">{pendingRequestsCount}</span> pending leave request{pendingRequestsCount !== 1 ? "s" : ""} across the company</>
              ) : user?.role === "Team Lead" ? (
                <>You have <span className="text-amber-600 dark:text-amber-400 font-extrabold mx-1">{pendingRequestsCount}</span> pending leave request{pendingRequestsCount !== 1 ? "s" : ""} in your team</>
              ) : (
                <>You have <span className="text-amber-600 dark:text-amber-400 font-extrabold mx-1">{pendingRequestsCount}</span> pending leave request{pendingRequestsCount !== 1 ? "s" : ""}</>
              )}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {pendingRequestsCount === 0 ? (
                isSuperAdmin ? (
                  "All leave requests have been resolved."
                ) : (
                  <>
                    <span className="hidden sm:inline">Request leave on the right!</span>
                    <span className="inline sm:hidden">Request leave below!</span>
                  </>
                )
              ) : isSuperAdmin ? (
                "Review and manage them in the Attendance Management tab."
              ) : user?.role === "Team Lead" ? (
                "Review team requests or track your own pending leaves."
              ) : (
                "Your request is currently awaiting manager or administrative approval."
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {!isSuperAdmin && (
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => router.push("/leaves/apply")}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#56348f] hover:bg-[#452875] active:bg-[#382061] text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer text-center"
              >
                Request Leave
              </button>
              <button
                onClick={() => router.push("/policies")}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer text-center sm:text-right"
              >
                Leave Policy Explanation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── My Leave Stats Section (Weekly, Consumed Types, Monthly) ── */}
      {!isSuperAdmin && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            My Leave Stats
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* 1. Weekly Pattern Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[210px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Weekly Pattern
                </span>
                <div title="Frequency of leaves taken by weekday" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help">
                  <Info className="w-4 h-4" />
                </div>
              </div>

              {/* Weekly Bar Graph */}
              <div className="flex items-end justify-between gap-1.5 h-28 pt-4 pb-1 px-1">
                {stats.weekDays.map((day) => {
                  const count = stats.weekCounts[day] || 0;
                  const barHeightPct = count > 0 ? Math.max((count / stats.maxWeekly) * 75, 14) : 4;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center justify-end h-full group">
                      {/* Tooltip on hover */}
                      <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {count}d
                      </div>
                      {/* Bar */}
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${
                          count > 0
                            ? "bg-[#56348f] dark:bg-purple-500 group-hover:bg-purple-600"
                            : "bg-slate-200 dark:bg-slate-800 h-[3px]"
                        }`}
                      />
                      {/* X-Axis Day label */}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Consumed Leave Types Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[210px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Consumed Leave Types
                </span>
                <div title="Breakdown of leave types consumed" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help">
                  <Info className="w-4 h-4" />
                </div>
              </div>

              {/* Content */}
              {stats.totalConsumed === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No data to display.
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center gap-2.5 px-2">
                  {Object.entries(stats.typeCounts).map(([type, days], i) => {
                    const colors = ["bg-[#7c3aed]", "bg-rose-500", "bg-amber-500", "bg-sky-500"];
                    const barColor = colors[i % colors.length];
                    const pct = Math.round((days / stats.totalConsumed) * 100);
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${barColor}`} />
                            {type}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {days} Day{days !== 1 ? "s" : ""} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Monthly Stats Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[210px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Monthly Stats
                </span>
                <div title="Leaves consumed month-by-month for current year" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help">
                  <Info className="w-4 h-4" />
                </div>
              </div>

              {/* Monthly Bar Graph */}
              <div className="flex items-end justify-between gap-1 h-28 pt-4 pb-1 px-1">
                {stats.monthNames.map((month) => {
                  const count = stats.monthCounts[month] || 0;
                  const barHeightPct = count > 0 ? Math.max((count / stats.maxMonthly) * 75, 14) : 4;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center justify-end h-full group">
                      {/* Tooltip on hover */}
                      <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {count > 0 ? `${count}d` : ""}
                      </div>
                      {/* Bar */}
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full max-w-[12px] rounded-t-xs transition-all duration-500 ${
                          count > 0
                            ? "bg-[#56348f] dark:bg-purple-500 group-hover:bg-purple-600"
                            : "bg-slate-200 dark:bg-slate-800 h-[2px]"
                        }`}
                      />
                      {/* X-Axis Month label */}
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                        {month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Leave Balances Section (Arc Meter Gauges) ─────────────── */}
      {!isSuperAdmin && balances.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Leave Balances
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {balances.map((balance) => (
              <div
                key={balance.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between"
              >
                {/* Top Row: Title & View Details link */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {balance.leave_type.name}
                  </h3>
                  <button
                    onClick={() =>
                      setSelectedBalanceDetail({
                        title: balance.leave_type.name,
                        available: balance.remaining,
                        consumed: balance.total_taken,
                        carryForward: balance.cl_carry_forward,
                        regularBalance: balance.regular_balance,
                        monthlyQuota: balance.monthly_quota,
                        color: balance.color,
                        description: balance.desc,
                      })
                    }
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    View details
                  </button>
                </div>

                {/* Center: Semi-Circular Donut Gauge */}
                <div className="py-2 flex justify-center">
                  <SemiCircleGauge
                    value={balance.remaining}
                    max={Math.max(balance.remaining + balance.total_taken, balance.monthly_quota * 12, 12)}
                    color={balance.color}
                    label="Available"
                  />
                </div>

                {/* Bottom Details Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>
                      Consumed: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{balance.total_taken} Days</strong>
                    </span>
                    <span>
                      Monthly Refill: <strong className="text-purple-600 dark:text-purple-400 font-semibold">+{balance.monthly_quota} Day/mo</strong>
                    </span>
                  </div>
                  {balance.cl_carry_forward > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-dashed border-slate-100 dark:border-slate-800">
                      <span>Regular: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{balance.regular_balance} Days</strong></span>
                      <span>Carry-Fwd: <strong className="text-purple-600 dark:text-purple-400 font-semibold">+{balance.cl_carry_forward} Days</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail Modal for Leave Balances ───────────────────────── */}
      {selectedBalanceDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedBalanceDetail.title} Details
              </h3>
              <button
                onClick={() => setSelectedBalanceDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedBalanceDetail.description}
              </p>

              <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-4 space-y-2.5 border border-slate-200 dark:border-slate-800 text-sm">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Monthly Refill Policy</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">+{selectedBalanceDetail.monthlyQuota} Day / Month</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Current Regular Balance</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedBalanceDetail.regularBalance} Days</span>
                </div>
                {selectedBalanceDetail.carryForward > 0 && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Carry Forward Balance</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">+{selectedBalanceDetail.carryForward} Days</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Approved Leaves Consumed</span>
                  <span className="font-bold text-rose-500">-{selectedBalanceDetail.consumed} Days</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-base font-bold text-slate-900 dark:text-white">
                  <span>Net Available Balance</span>
                  <span style={{ color: selectedBalanceDetail.color }}>{selectedBalanceDetail.available} Days</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBalanceDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Leave Requests Table & Filters ─────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-850">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Leave Requests</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Your history of time-off requests and approval status.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Leave Category</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="casual">Casual Leaves</option>
                <option value="sick">Sick Leaves</option>
                <option value="lop">Loss of Pay (LOP)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => { setFilterFromDate(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => { setFilterToDate(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
              />
            </div>
            
            {(filterType || filterFromDate || filterToDate) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-[11px] uppercase font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">No leave requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed text-sm text-left">
              <colgroup>
                {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                  <col className="w-[18%]" />
                )}
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
                <col className="" /> {/* Reason absorbs remaining */}
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                    <th className="px-3 py-3 font-semibold">Employee</th>
                  )}
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Duration</th>
                  <th className="px-3 py-3 font-semibold">Days</th>
                  <th className="px-3 py-3 font-semibold">Reason</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                      <td className="px-3 py-3 text-slate-800 dark:text-slate-200 font-medium break-words whitespace-normal leading-tight">
                        {req.user?.first_name} {req.user?.last_name}
                      </td>
                    )}
                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white break-words whitespace-normal leading-tight">
                      {req.leave_type?.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 break-words whitespace-normal leading-tight">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                      {req.days_taken ?? req.actual_leave_days ?? "—"} Day(s)
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400 break-words whitespace-normal leading-tight">{req.reason}</td>
                    <td className="px-3 py-3">{getStatusBadge(req)}</td>
                    <td className="px-3 py-3 text-left break-words whitespace-normal leading-tight">
                      {req.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => handleCancelLeave(req.id)}
                          disabled={cancellingId === req.id}
                          title={cancellingId === req.id ? "Cancelling..." : "Cancel"}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-850">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {pagination.current_page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} request{pagination.total !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page === 1}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
