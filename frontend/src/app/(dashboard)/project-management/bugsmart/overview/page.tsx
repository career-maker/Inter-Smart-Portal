"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bug,
  AlertOctagon,
  CheckCircle2,
  Clock,
  UserX,
  RotateCcw,
  Archive,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  RefreshCw,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { bugzillaApi } from "@/services/bugzilla";
import { BugzillaReportData } from "@/types/bugzilla";
import { BugzillaStatusBadge } from "@/components/bugzilla/BugzillaStatusBadge";
import { BugzillaSeverityBadge } from "@/components/bugzilla/BugzillaSeverityBadge";
import { BugzillaPriorityBadge } from "@/components/bugzilla/BugzillaPriorityBadge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";

const STATUS_COLORS: Record<string, string> = {
  NEW: "#0284c7",
  ASSIGNED: "#6366f1",
  "IN PROGRESS": "#f59e0b",
  RESOLVED: "#10b981",
  VERIFIED: "#14b8a6",
  CLOSED: "#64748b",
  REOPENED: "#f43f5e",
};

const SEVERITY_COLORS: Record<string, string> = {
  BLOCKER: "#e11d48",
  CRITICAL: "#ef4444",
  MAJOR: "#f97316",
  NORMAL: "#64748b",
  MINOR: "#10b981",
  TRIVIAL: "#a1a1aa",
};

export default function BugzillaOverviewPage() {
  const { canReport } = useBugzillaAuth();
  const [data, setData] = useState<BugzillaReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await bugzillaApi.getReports();
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load Bugzilla overview data", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load Bugzilla overview data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return <PageLoader />;
  }

  const s = data?.summary || {
    total: 0,
    open: 0,
    unassigned: 0,
    critical_blocker: 0,
    resolved: 0,
    closed: 0,
    reopened: 0,
  };

  const statusChartData = Object.entries(data?.by_status || {}).map(([key, value]) => ({
    name: key,
    value,
    color: STATUS_COLORS[key] || "#6366f1",
  }));

  const severityChartData = Object.entries(data?.by_severity || {}).map(([key, value]) => ({
    name: key,
    value,
    color: SEVERITY_COLORS[key] || "#f97316",
  }));

  const priorityChartData = Object.entries(data?.by_priority || {}).map(([key, value]) => ({
    name: key,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* ── Action bar / status notice ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Triage & Health Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time breakdown of open defects, severity distribution, and project activities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {canReport && (
            <Link
              href="/project-management/bugsmart/bugs/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Bug
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total */}
        <Link
          href="/project-management/bugsmart/bugs"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Bugs</span>
            <Bug className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">{s.total}</div>
          <span className="text-[10px] text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 flex items-center gap-0.5 mt-1 font-medium">
            View all <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        {/* Open */}
        <Link
          href="/project-management/bugsmart/bugs?quick_filter=open"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Open</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">{s.open}</div>
          <span className="text-[10px] text-slate-400 group-hover:text-amber-600 flex items-center gap-0.5 mt-1 font-medium">
            In triage <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        {/* Critical & Blocker */}
        <Link
          href="/project-management/bugsmart/bugs?quick_filter=critical_blocker"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Critical / Blocker</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {s.critical_blocker}
          </div>
          <span className="text-[10px] text-slate-400 group-hover:text-rose-600 flex items-center gap-0.5 mt-1 font-medium">
            Urgent attention <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        {/* Unassigned */}
        <Link
          href="/project-management/bugsmart/bugs?quick_filter=unassigned"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unassigned</span>
            <UserX className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">{s.unassigned}</div>
          <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5 mt-1 font-medium">
            Needs owner <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        {/* Resolved */}
        <Link
          href="/project-management/bugsmart/bugs?quick_filter=resolved"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{s.resolved}</div>
          <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 flex items-center gap-0.5 mt-1 font-medium">
            Pending verification <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        {/* Reopened */}
        <Link
          href="/project-management/bugsmart/bugs?quick_filter=reopened"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reopened</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{s.reopened}</div>
          <span className="text-[10px] text-slate-400 group-hover:text-rose-600 flex items-center gap-0.5 mt-1 font-medium">
            Regressions <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        {/* Closed */}
        <Link
          href="/project-management/bugsmart/bugs?quick_filter=closed"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-xs transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Closed</span>
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-300 font-mono">{s.closed}</div>
          <span className="text-[10px] text-slate-400 group-hover:text-slate-600 flex items-center gap-0.5 mt-1 font-medium">
            Archived <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>
      </div>

      {/* ── Distribution Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Bugs by Status
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">{s.total} total</span>
          </div>
          {statusChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {statusChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {statusChartData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span>{d.name}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No bugs recorded yet</div>
          )}
        </div>

        {/* Severity Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Bugs by Severity
            </h3>
          </div>
          {severityChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityChartData.map((entry, idx) => (
                      <Cell key={`sev-cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No severity metrics</div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Bugs by Priority
            </h3>
          </div>
          {priorityChartData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No priority metrics</div>
          )}
        </div>
      </div>

      {/* ── Recent Activity / Bugs Feed ── */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Bug Reports & Triage</h3>
          </div>
          <Link
            href="/project-management/bugsmart/bugs"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
          >
            Open Bugs Tracker <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.recent_bugs && data.recent_bugs.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recent_bugs.map((bug) => (
              <div key={bug.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/project-management/bugsmart/bugs/${bug.id}`}
                      className="font-mono text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 underline decoration-dotted"
                    >
                      {bug.bug_number}
                    </Link>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">{bug.summary}</span>
                    <BugzillaStatusBadge status={bug.status} size="sm" />
                    <BugzillaSeverityBadge severity={bug.severity} showIcon={false} />
                    <BugzillaPriorityBadge priority={bug.priority} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Project: <strong className="text-slate-700 dark:text-slate-300">{bug.project?.name}</strong></span>
                    {bug.component && (
                      <>
                        <span>•</span>
                        <span>Component: <strong className="text-slate-700 dark:text-slate-300">{bug.component.name}</strong></span>
                      </>
                    )}
                    <span>•</span>
                    <span>Reporter: {bug.reporter?.first_name} {bug.reporter?.last_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {bug.assignee ? `${bug.assignee.first_name} ${bug.assignee.last_name}` : <span className="text-slate-400 italic">Unassigned</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(bug.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href={`/project-management/bugsmart/bugs/${bug.id}`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="View details"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No bugs found in your authorized scope.
          </div>
        )}
      </div>
    </div>
  );
}
