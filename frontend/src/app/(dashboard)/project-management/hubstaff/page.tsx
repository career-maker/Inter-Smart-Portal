"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { format, parseISO, subDays, addDays, startOfMonth } from "date-fns";
import {
  Clock,
  Activity,
  Users,
  FolderKanban,
  Calendar,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  Layers,
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  UserCheck,
  CheckCircle2,
  PieChart,
  Filter
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { TeamFilterSelector } from "@/components/project-management/TeamFilterSelector";

type TabType = "users" | "projects" | "trends";
type ActivityLevelFilter = "all" | "high" | "moderate" | "low";
type SortField = "tracked_seconds" | "activity_percentage" | "name";
type SortOrder = "asc" | "desc";

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function normalizeActivityPct(val: any): number {
  const num = Number(val) || 0;
  if (num > 100) return Math.min(100, Math.round(num / 100));
  if (num > 0 && num <= 1.0) return Math.min(100, Math.round(num * 100));
  return Math.min(100, Math.max(0, Math.round(num)));
}

function getActivityBadge(activity: number) {
  const pct = normalizeActivityPct(activity);
  if (pct >= 70) {
    return {
      percent: pct,
      label: `${pct}% High`,
      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      bar: "bg-emerald-500",
    };
  }
  if (pct >= 50) {
    return {
      percent: pct,
      label: `${pct}% Moderate`,
      bg: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      bar: "bg-amber-500",
    };
  }
  return {
    percent: pct,
    label: `${pct}% Low`,
    bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
  };
}

export default function HubstaffAnalyticsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isAdmin = user?.role === "Admin";
  const isTeamLead = user?.role === "Team Lead";

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<TabType>("users");

  // Date selection state
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState<string>(() => format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

  // Team selection state
  const [selectedTeamId, setSelectedTeamId] = useState<number | "all">("all");

  // Loading & Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityLevelFilter>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("tracked_seconds");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Detail Drawers / Modals
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<any | null>(null);

  // Fetch Analytics Data from backend
  const fetchAnalytics = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params: any = {
          date_mode: dateMode,
          date: selectedDate,
          start_date: startDate,
          end_date: endDate,
          refresh: isManual ? 1 : 0,
        };

        if (selectedTeamId && selectedTeamId !== "all") {
          params.team_id = selectedTeamId;
        }

        if (isSuperAdmin) {
          // Surfaces raw upstream Hubstaff request/response diagnostics
          // (status + body per fallback strategy) in the response JSON,
          // visible in DevTools Network → this request → Response tab.
          params.date_debug = 1;
        }

        const res = await api.get("/hubstaff/analytics", { params });
        setAnalyticsData(res.data);
        setLastRefreshed(new Date());

        // For Team Lead, auto sync selectedTeamId if provided by backend
        if (isTeamLead && !isAdmin && !isSuperAdmin && res.data?.selected_team_id) {
          setSelectedTeamId(res.data.selected_team_id);
        }
      } catch (err: any) {
        console.error("Failed to load Hubstaff analytics", err);
        setError(err?.response?.data?.message || err?.message || "Failed to load Hubstaff analytics data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateMode, selectedDate, startDate, endDate, selectedTeamId, isTeamLead, isAdmin, isSuperAdmin]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Quick Date Navigation Handlers
  const handlePrevDay = () => {
    try {
      const current = parseISO(selectedDate);
      setSelectedDate(format(subDays(current, 1), "yyyy-MM-dd"));
    } catch {
      setSelectedDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
    }
  };

  const handleNextDay = () => {
    try {
      const current = parseISO(selectedDate);
      setSelectedDate(format(addDays(current, 1), "yyyy-MM-dd"));
    } catch {
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    }
  };

  const handlePresetToday = () => {
    setDateMode("single");
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handlePresetYesterday = () => {
    setDateMode("single");
    setSelectedDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  };

  const handlePresetLast7Days = () => {
    setDateMode("range");
    setStartDate(format(subDays(new Date(), 6), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handlePresetThisMonth = () => {
    setDateMode("range");
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    const list = analyticsData?.users || [];
    return list
      .filter((u: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const nameMatch = u.name?.toLowerCase().includes(q);
          const emailMatch = u.email?.toLowerCase().includes(q);
          const codeMatch = u.employee_code?.toLowerCase().includes(q);
          if (!nameMatch && !emailMatch && !codeMatch) return false;
        }
        if (activityFilter !== "all" && u.activity_level !== activityFilter) {
          return false;
        }
        if (projectFilter !== "all") {
          const hasProj = u.projects?.some((p: any) => p.hubstaff_project_id === projectFilter || String(p.project_id) === projectFilter);
          if (!hasProj) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (sortField === "name") {
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
  }, [analyticsData?.users, searchTerm, activityFilter, projectFilter, sortField, sortOrder]);

  // Filtered and Sorted Projects
  const filteredProjects = useMemo(() => {
    const list = analyticsData?.projects || [];
    return list
      .filter((p: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return p.name?.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField === "name" ? "name" : sortField];
        let valB = b[sortField === "name" ? "name" : sortField];
        if (sortField === "name") {
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [analyticsData?.projects, searchTerm, sortField, sortOrder]);

  // Export to CSV
  const exportToCSV = () => {
    if (!analyticsData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    const dateLabel = dateMode === "single" ? selectedDate : `${startDate}_to_${endDate}`;

    if (activeTab === "projects") {
      csvContent += "Project Name,Tracked Time (Hours),Tracked Time,Avg Activity %,Members Count\n";
      filteredProjects.forEach((p: any) => {
        const hours = (p.tracked_seconds / 3600).toFixed(2);
        csvContent += `"${p.name.replace(/"/g, '""')}",${hours},"${p.tracked_formatted}",${p.activity_percentage}%,${p.members_count}\n`;
      });
    } else {
      csvContent += "Employee Name,Employee Code,Team,Tracked Time (Hours),Tracked Time,Activity %,Activity Level,Projects Count\n";
      filteredUsers.forEach((u: any) => {
        const hours = (u.tracked_seconds / 3600).toFixed(2);
        csvContent += `"${u.name.replace(/"/g, '""')}","${u.employee_code || ""}","${u.team_name || ""}",${hours},"${u.tracked_formatted}",${u.activity_percentage}%,${u.activity_level},${u.projects_count}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hubstaff_${activeTab}_report_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analyticsData?.summary || {};
  const trends = analyticsData?.trends || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-bold">Hubstaff Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Hubstaff Analytics</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Computer Work Time & Activity
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor computer-tracked productivity, work hours, and project time. Separate from Biometric physical attendance.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Team Switcher for Super Admin / Team Lead */}
          {(isSuperAdmin || isAdmin || (isTeamLead && analyticsData?.available_teams?.length > 1)) && (
            <TeamFilterSelector
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
              availableTeams={analyticsData?.available_teams}
            />
          )}

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            aria-label="Refresh Hubstaff Data"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh latest Hubstaff data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-purple-600" : ""}`} />
          </button>

          <button
            onClick={exportToCSV}
            disabled={loading || !analyticsData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Date Controls Ribbon ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Mode Switcher & Date Pickers */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setDateMode("single");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateMode === "single"
                    ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setDateMode("range");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateMode === "range"
                    ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Date Range
              </button>
            </div>

            {/* Date Pickers with Prev/Next Controls */}
            {dateMode === "single" ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    handlePrevDay();
                  }}
                  title="Previous Day"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      // Native date-picker popup selections don't always fire a
                      // React-visible "change" reliably across browsers — onInput
                      // below is a fallback for that; both funnel into the same
                      // dedup'd setter so a double-fire is harmless.
                      if (e.target.value && e.target.value !== selectedDate) {
                        setLoading(true);
                        setSelectedDate(e.target.value);
                      }
                    }}
                    onInput={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      if (val && val !== selectedDate) {
                        setLoading(true);
                        setSelectedDate(val);
                      }
                    }}
                    className="bg-transparent text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-0 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    handleNextDay();
                  }}
                  title="Next Day"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      handlePresetToday();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 text-[11px] font-semibold transition cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      handlePresetYesterday();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 text-[11px] font-semibold transition cursor-pointer"
                  >
                    Yesterday
                  </button>
                </div>

                {loading && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 text-[11px] font-bold text-purple-800 dark:text-purple-200 animate-pulse shadow-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== startDate) {
                      setLoading(true);
                      setStartDate(e.target.value);
                    }
                  }}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (val && val !== startDate) {
                      setLoading(true);
                      setStartDate(val);
                    }
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                />
                <span className="text-xs text-slate-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== endDate) {
                      setLoading(true);
                      setEndDate(e.target.value);
                    }
                  }}
                  onInput={(e) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (val && val !== endDate) {
                      setLoading(true);
                      setEndDate(val);
                    }
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                />
                
                {/* Range Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      handlePresetLast7Days();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 text-[11px] font-semibold transition cursor-pointer"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      handlePresetThisMonth();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 text-[11px] font-semibold transition cursor-pointer"
                  >
                    This Month
                  </button>
                </div>

                {loading && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 text-[11px] font-bold text-purple-800 dark:text-purple-200 animate-pulse shadow-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-[#56348f] text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Employee</span>
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "projects"
                  ? "bg-[#56348f] text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>By Project</span>
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "trends"
                  ? "bg-[#56348f] text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trends & Charts</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Tracked Time */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Tracked Work Time</span>
            <Clock className={`w-4 h-4 text-purple-600 dark:text-purple-400 ${loading ? "animate-spin" : ""}`} />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-purple-100/70 dark:bg-purple-950/50 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {summary.total_tracked_formatted || "0h 00m"}
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Total computer time</p>
        </div>

        {/* Average Activity */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Avg Activity</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-emerald-100/70 dark:bg-emerald-950/50 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{normalizeActivityPct(summary.avg_activity_percentage)}%</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                  getActivityBadge(summary.avg_activity_percentage ?? 0).bg
                }`}
              >
                {normalizeActivityPct(summary.avg_activity_percentage) >= 70 ? "High" : normalizeActivityPct(summary.avg_activity_percentage) >= 50 ? "Moderate" : "Low"}
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Keystrokes & mouse activity</p>
        </div>

        {/* Active Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Users</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-blue-100/70 dark:bg-blue-950/50 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {summary.active_users_count ?? 0}
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Logged work in Hubstaff</p>
        </div>

        {/* Active Projects */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Projects</span>
            <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-amber-100/70 dark:bg-amber-950/50 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {summary.active_projects_count ?? 0}
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Projects with logged time</p>
        </div>

        {/* Average Time / User */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Avg Time / User</span>
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-indigo-100/70 dark:bg-indigo-950/50 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {summary.avg_time_per_user_formatted || "0h 00m"}
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Average per active member</p>
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-950/70 animate-ping absolute opacity-40" />
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 flex items-center justify-center shadow-sm">
              <Loader2 className="w-6 h-6 text-[#56348f] dark:text-purple-400 animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Loading Hubstaff Activity for {dateMode === "single" ? selectedDate : `${startDate} → ${endDate}`}...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregating tracked work hours, activity scores, and project time from Hubstaff
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-800 dark:text-rose-300">{error}</p>
          <button
            onClick={() => fetchAnalytics(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : activeTab === "users" ? (
        /* ── Tab 1: By Employee Table ── */
        <div className="space-y-4">
          {/* Table Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none"
              >
                <option value="all">All Projects</option>
                {analyticsData?.projects?.map((p: any) => (
                  <option key={p.hubstaff_project_id || p.project_id} value={p.hubstaff_project_id || p.project_id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Activity Level Filter */}
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as ActivityLevelFilter)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none"
              >
                <option value="all">All Activity Levels</option>
                <option value="high">High (70–100%)</option>
                <option value="moderate">Moderate (50–69%)</option>
                <option value="low">Low (&lt;50%)</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px] leading-[16px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Employee</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200/80 dark:border-slate-800">Team</th>
                    <th className="py-3 px-3 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer" onClick={() => handleSort("tracked_seconds")}>
                      <div className="flex items-center gap-1.5">
                        <span>Tracked Time</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer" onClick={() => handleSort("activity_percentage")}>
                      <div className="flex items-center gap-1.5">
                        <span>Activity %</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800">Projects Worked On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto px-4">
                          <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            No Hubstaff activity recorded for {dateMode === "single" ? selectedDate : `${startDate} to ${endDate}`}.
                          </p>
                          {analyticsData?.hubstaff_status?.message && (
                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              {analyticsData.hubstaff_status.message}
                            </p>
                          )}
                          <button
                            onClick={() => fetchAnalytics(true)}
                            disabled={refreshing || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            <span>Refresh Hubstaff Data</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => {
                      const actBadge = getActivityBadge(u.activity_percentage);
                      return (
                        <tr
                          key={u.hubstaff_user_id || u.user_id}
                          onClick={() => setSelectedUserDetail(u)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          {/* Employee */}
                          <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-3">
                              <RoyalAvatar
                                src={u.avatar}
                                name={u.name}
                                userId={u.user_id}
                                employeeCode={u.employee_code}
                                className="w-8 h-8 rounded-full text-xs font-bold bg-purple-600 text-white shrink-0"
                              />
                              <div className="min-w-0">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                                  <RoyalName
                                    name={u.name}
                                    userId={u.user_id}
                                    employeeCode={u.employee_code}
                                  />
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {u.designation} {u.employee_code && `• ${u.employee_code}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Team */}
                          <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-slate-700 dark:text-slate-300 font-semibold text-xs">
                            {u.team_name}
                          </td>

                          {/* Tracked Time */}
                          <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {u.tracked_formatted}
                            </span>
                          </td>

                          {/* Activity % */}
                          <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                            <div className="space-y-1.5 min-w-[130px]">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 dark:text-white">{actBadge.percent}%</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${actBadge.bg}`}>
                                  {actBadge.percent >= 70 ? "HIGH" : actBadge.percent >= 50 ? "MODERATE" : "LOW"}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${actBadge.bar}`}
                                  style={{ width: `${Math.min(100, Math.max(0, actBadge.percent))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Projects */}
                          <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-1.5 flex-wrap max-w-[260px]">
                              {u.projects && u.projects.length > 0 ? (
                                u.projects.slice(0, 2).map((p: any) => (
                                  <span
                                    key={p.hubstaff_project_id || p.project_name}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[10px] font-bold text-purple-700 dark:text-purple-300 truncate max-w-[120px]"
                                    title={`${p.project_name} (${p.tracked_formatted})`}
                                  >
                                    {p.project_name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              )}
                              {u.projects && u.projects.length > 2 && (
                                <span className="text-[10px] font-bold text-slate-500">+{u.projects.length - 2} more</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserDetail(u);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "projects" ? (
        /* ── Tab 2: By Project Table ── */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>

          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px] leading-[16px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-5 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1.5">
                        <span>Project</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer" onClick={() => handleSort("tracked_seconds")}>
                      <div className="flex items-center gap-1.5">
                        <span>Total Tracked Time</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer" onClick={() => handleSort("activity_percentage")}>
                      <div className="flex items-center gap-1.5">
                        <span>Avg Activity %</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800">Active Members</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto px-4">
                          <FolderKanban className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            No project activity recorded for {dateMode === "single" ? selectedDate : `${startDate} to ${endDate}`}.
                          </p>
                          {analyticsData?.hubstaff_status?.message && (
                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              {analyticsData.hubstaff_status.message}
                            </p>
                          )}
                          <button
                            onClick={() => fetchAnalytics(true)}
                            disabled={refreshing || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            <span>Refresh Hubstaff Data</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p: any) => {
                      const actBadge = getActivityBadge(p.activity_percentage);
                      return (
                        <tr
                          key={p.hubstaff_project_id || p.name}
                          onClick={() => setSelectedProjectDetail(p)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-5 border-r border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                                {p.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {p.tracked_formatted}
                            </span>
                          </td>

                          <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{actBadge.percent}%</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${actBadge.bg}`}>
                                {actBadge.percent >= 70 ? "High" : actBadge.percent >= 50 ? "Moderate" : "Low"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                              {p.members_count} Members
                            </span>
                          </td>

                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectDetail(p);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                            >
                              Member Breakdown
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ── Tab 3: Trends & Visualizations ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Tracked Time Trend */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Tracked Work Hours by Date</span>
              </h3>
            </div>

            {trends.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-10 text-center">No trend data available for this range.</p>
            ) : (
              <div className="space-y-2">
                {trends.map((t: any) => {
                  const maxHours = Math.max(...trends.map((x: any) => x.tracked_hours || 1), 8);
                  const pct = Math.min(100, Math.round((t.tracked_hours / maxHours) * 100));
                  return (
                    <div key={t.date} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-600 dark:text-slate-400">{t.date_formatted} ({t.date})</span>
                        <span className="text-slate-900 dark:text-white font-bold">{t.tracked_formatted} ({t.tracked_hours}h)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Activity Percentage Trend */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Average Activity % Trend</span>
              </h3>
            </div>

            {trends.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-10 text-center">No activity trend data available.</p>
            ) : (
              <div className="space-y-2">
                {trends.map((t: any) => {
                  const actBadge = getActivityBadge(t.activity_percentage);
                  return (
                    <div key={t.date} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-600 dark:text-slate-400">{t.date_formatted}</span>
                        <span className="text-slate-900 dark:text-white font-bold">{t.activity_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${actBadge.bar}`} style={{ width: `${t.activity_percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Distribution */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              <span>Project Work Time Distribution</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProjects.slice(0, 6).map((p: any) => {
                const totalSec = summary.total_tracked_seconds || 1;
                const pct = Math.min(100, Math.round((p.tracked_seconds / totalSec) * 100));
                return (
                  <div key={p.name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="truncate max-w-[150px] text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-purple-600 dark:text-purple-400">{pct}%</span>
                    </div>
                    <div className="text-slate-500">{p.tracked_formatted} • {p.members_count} Members</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden mt-1">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── User Detail Drawer / Modal ── */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedUserDetail(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RoyalAvatar
                  src={selectedUserDetail.avatar}
                  name={selectedUserDetail.name}
                  userId={selectedUserDetail.user_id}
                  employeeCode={selectedUserDetail.employee_code}
                  className="w-11 h-11 rounded-full text-sm font-bold bg-purple-600 text-white"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    <RoyalName
                      name={selectedUserDetail.name}
                      userId={selectedUserDetail.user_id}
                      employeeCode={selectedUserDetail.employee_code}
                    />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedUserDetail.team_name} • {selectedUserDetail.designation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Tracked Work Time</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{selectedUserDetail.tracked_formatted}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Overall Activity</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{selectedUserDetail.activity_percentage}%</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getActivityBadge(selectedUserDetail.activity_percentage).bg}`}>
                    {selectedUserDetail.activity_level.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Project Breakdown List */}
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Project Activity Breakdown
              </h4>
              {selectedUserDetail.projects?.map((p: any) => {
                const pBadge = getActivityBadge(p.activity_percentage);
                return (
                  <div
                    key={p.project_name}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-bold text-slate-900 dark:text-white truncate">{p.project_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{p.tracked_formatted}</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${pBadge.bg}`}>
                        {p.activity_percentage}% Act
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Project Detail Modal ── */}
      {selectedProjectDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedProjectDetail(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedProjectDetail.name}</h3>
                  <p className="text-xs text-slate-500">Hubstaff Tracked Project</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Tracked Time</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{selectedProjectDetail.tracked_formatted}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Average Activity</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{selectedProjectDetail.activity_percentage}%</p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Team Member Contributions ({selectedProjectDetail.members_count})
              </h4>
              {selectedProjectDetail.members?.map((m: any) => (
                <div
                  key={m.name}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                    <p className="text-[10px] text-slate-500">{m.designation}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900 dark:text-white">{m.tracked_formatted}</span>
                    <span className="text-slate-500 font-semibold">{m.activity_percentage}% Act</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedProjectDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
