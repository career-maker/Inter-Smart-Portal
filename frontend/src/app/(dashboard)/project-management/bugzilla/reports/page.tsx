"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Layers,
  PieChart as PieIcon,
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
import { BugzillaProject, BugzillaReportData } from "@/types/bugzilla";
import { PageLoader } from "@/components/ui/PageLoader";

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

const PALETTE = ["#6366f1", "#0284c7", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6"];

export default function BugzillaReportsPage() {
  const [projects, setProjects] = useState<BugzillaProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [data, setData] = useState<BugzillaReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project options
  useEffect(() => {
    bugzillaApi
      .getProjects({ per_page: 100 })
      .then((res) => setProjects(res.data || []))
      .catch((e) => console.warn("Failed to load projects", e));
  }, []);

  // Fetch report metrics
  const fetchReportData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = selectedProjectId ? { portal_project_id: Number(selectedProjectId) } : undefined;
      const res = await bugzillaApi.getReports(params);
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load reports", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

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

  const statusChartData = Object.entries(data?.by_status || {}).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || "#6366f1",
  }));

  const severityChartData = Object.entries(data?.by_severity || {}).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] || "#f97316",
  }));

  const priorityChartData = Object.entries(data?.by_priority || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const resolutionChartData = Object.entries(data?.by_resolution || {}).map(([name, value], idx) => ({
    name,
    value,
    color: PALETTE[idx % PALETTE.length],
  }));

  const assigneeChartData = Object.entries(data?.by_assignee || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-600" />
            <span>Defect Analytics & Reports</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive breakdown of defects by status, severity, priority, and team distribution.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Projects Scope</option>
            {projects.map((p) => (
              <option key={p.id} value={p.portal_project_id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fetchReportData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Summary Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Recorded</span>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white font-mono">{s.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Active Open Defect Pool</span>
          <div className="mt-1 text-2xl font-bold text-amber-600 font-mono">{s.open}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Critical / Blocker</span>
          <div className="mt-1 text-2xl font-bold text-rose-600 font-mono">{s.critical_blocker}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Resolved & Closed</span>
          <div className="mt-1 text-2xl font-bold text-emerald-600 font-mono">{s.resolved + s.closed}</div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Defects by Status
          </h3>
          {statusChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
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
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">No data</div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Defects by Severity
          </h3>
          {severityChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData}>
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
                      <Cell key={`sev-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">No data</div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Defects by Priority
          </h3>
          {priorityChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData}>
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
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">No data</div>
          )}
        </div>

        {/* Resolution Codes Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Resolution Distribution (FIXED, INVALID, etc.)
          </h3>
          {resolutionChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resolutionChartData}>
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
                    {resolutionChartData.map((entry, idx) => (
                      <Cell key={`res-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No resolutions recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
