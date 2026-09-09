"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bug,
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookmarkPlus,
  Download,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import {
  BugzillaBug,
  BugzillaStatus,
  BugzillaSeverity,
  BugzillaPriority,
  BugzillaProject,
} from "@/types/bugzilla";
import { BugzillaStatusBadge } from "@/components/bugzilla/BugzillaStatusBadge";
import { BugzillaSeverityBadge } from "@/components/bugzilla/BugzillaSeverityBadge";
import { BugzillaPriorityBadge } from "@/components/bugzilla/BugzillaPriorityBadge";
import { PageLoader } from "@/components/ui/PageLoader";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";
import { useAuthStore } from "@/store/auth";
import { openReportBugDrawer } from "@/components/bugzilla/ReportBugDrawer";

const QUICK_FILTERS = [
  { id: "all", label: "All Bugs" },
  { id: "my_assigned", label: "Assigned to Me" },
  { id: "my_reported", label: "Reported by Me" },
  { id: "open", label: "Open" },
  { id: "critical_blocker", label: "Critical & Blocker" },
  { id: "unassigned", label: "Unassigned" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
  { id: "reopened", label: "Reopened" },
];

export default function BugzillaBugsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { canDevelop, canReport } = useBugzillaAuth();

  // State
  const [bugs, setBugs] = useState<BugzillaBug[]>([]);
  const [projects, setProjects] = useState<BugzillaProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & meta
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Query filters
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState(searchParams.get("quick_filter") || "all");
  const [selectedProject, setSelectedProject] = useState(searchParams.get("portal_project_id") || "all");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "all");
  const [selectedSeverity, setSelectedSeverity] = useState(searchParams.get("severity") || "all");
  const [selectedPriority, setSelectedPriority] = useState(searchParams.get("priority") || "all");
  const [sortField, setSortField] = useState(searchParams.get("sort") || "created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("dir") as "asc" | "desc") || "desc");

  // Selection for bulk actions
  const [selectedBugIds, setSelectedBugIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");

  // Save Search Modal state
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);

  // Load projects list for filter dropdown
  useEffect(() => {
    bugzillaApi
      .getProjects({ per_page: 100 })
      .then((res) => {
        setProjects(res.data || []);
      })
      .catch((e) => console.warn("Failed to load projects", e));
  }, []);

  // Fetch bugs
  const fetchBugs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const params: any = {
      page,
      per_page: 25,
      sort: sortField,
      dir: sortDir,
    };

    if (search.trim()) params.search = search.trim();
    if (selectedProject !== "all") params.portal_project_id = Number(selectedProject);
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (selectedSeverity !== "all") params.severity = selectedSeverity;
    if (selectedPriority !== "all") params.priority = selectedPriority;

    if (quickFilter === "my_assigned" && user?.id) {
      params.assignee_id = user.id;
    } else if (quickFilter === "my_reported" && user?.id) {
      params.reporter_id = user.id;
    } else if (quickFilter !== "all") {
      params.quick_filter = quickFilter;
    }

    try {
      const res = await bugzillaApi.getBugs(params);
      setBugs(res.data || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.last_page || 1);
    } catch (err: any) {
      console.error("Failed to fetch Bugzilla bugs", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load bugs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, selectedProject, selectedStatus, selectedSeverity, selectedPriority, quickFilter, sortField, sortDir, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBugs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchBugs]);

  // Handle select all
  const handleToggleSelectAll = () => {
    if (selectedBugIds.length === bugs.length) {
      setSelectedBugIds([]);
    } else {
      setSelectedBugIds(bugs.map((b) => b.id));
    }
  };

  const handleToggleSelectBug = (id: number) => {
    setSelectedBugIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk update handler
  const handleApplyBulkUpdate = async () => {
    if (selectedBugIds.length === 0) return;
    if (!bulkStatus && !bulkPriority) return;

    setBulkActionLoading(true);
    setError(null);

    try {
      const payload: any = {
        bug_ids: selectedBugIds,
      };
      if (bulkStatus) payload.status = bulkStatus;
      if (bulkPriority) payload.priority = bulkPriority;

      await bugzillaApi.bulkUpdateBugs(payload);
      setSelectedBugIds([]);
      setBulkStatus("");
      setBulkPriority("");
      fetchBugs(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to perform bulk update.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Save current search
  const handleSaveSearch = async () => {
    if (!savedSearchName.trim()) return;
    setSavingSearch(true);
    setError(null);

    try {
      const criteria = {
        search,
        quick_filter: quickFilter,
        portal_project_id: selectedProject !== "all" ? selectedProject : null,
        status: selectedStatus !== "all" ? selectedStatus : null,
        severity: selectedSeverity !== "all" ? selectedSeverity : null,
        priority: selectedPriority !== "all" ? selectedPriority : null,
      };

      await bugzillaApi.createSavedSearch({
        name: savedSearchName.trim(),
        criteria,
      });

      setSearchSuccess("Search query saved successfully!");
      setSavedSearchName("");
      setTimeout(() => {
        setSaveSearchModalOpen(false);
        setSearchSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save search.");
    } finally {
      setSavingSearch(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (bugs.length === 0) return;

    const headers = [
      "Bug Number",
      "Summary",
      "Project",
      "Component",
      "Status",
      "Resolution",
      "Severity",
      "Priority",
      "Reporter",
      "Assignee",
      "Created At",
      "Updated At",
    ];

    const rows = bugs.map((b) => [
      `"${b.bug_number}"`,
      `"${(b.summary || "").replace(/"/g, '""')}"`,
      `"${b.project?.name || ""}"`,
      `"${b.component?.name || ""}"`,
      `"${b.status}"`,
      `"${b.resolution || ""}"`,
      `"${b.severity}"`,
      `"${b.priority}"`,
      `"${b.reporter ? `${b.reporter.first_name} ${b.reporter.last_name}` : ""}"`,
      `"${b.assignee ? `${b.assignee.first_name} ${b.assignee.last_name}` : "Unassigned"}"`,
      `"${new Date(b.created_at).toISOString()}"`,
      `"${new Date(b.updated_at).toISOString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bugzilla_bugs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Bug Reports & Defect Registry</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {totalCount} defects
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSaveSearchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save Search
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={bugs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => fetchBugs(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {canReport && (
            <button
              type="button"
              onClick={() => openReportBugDrawer()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Report Bug
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Quick Filter Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {QUICK_FILTERS.map((qf) => {
          const isActive = quickFilter === qf.id;
          return (
            <button
              key={qf.id}
              type="button"
              onClick={() => {
                setQuickFilter(qf.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                isActive
                  ? "bg-rose-600 text-white border-rose-600 font-semibold shadow-2xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {qf.label}
            </button>
          );
        })}
      </div>

      {/* ── Search & Advanced Filters Bar ── */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bug number (e.g. BZ-000001) or summary..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.portal_project_id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REOPENED">REOPENED</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="BLOCKER">BLOCKER</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="MAJOR">MAJOR</option>
            <option value="NORMAL">NORMAL</option>
            <option value="MINOR">MINOR</option>
            <option value="TRIVIAL">TRIVIAL</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="P1">P1 (Highest)</option>
            <option value="P2">P2 (High)</option>
            <option value="P3">P3 (Medium)</option>
            <option value="P4">P4 (Low)</option>
            <option value="P5">P5 (Lowest)</option>
          </select>

          {(search || selectedProject !== "all" || selectedStatus !== "all" || selectedSeverity !== "all" || selectedPriority !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedProject("all");
                setSelectedStatus("all");
                setSelectedSeverity("all");
                setSelectedPriority("all");
                setPage(1);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Reset Filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk Actions Floating Toolbar (When items selected) ── */}
      {selectedBugIds.length > 0 && canDevelop && (
        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {selectedBugIds.length} bug{selectedBugIds.length === 1 ? "" : "s"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedBugIds([])}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 underline cursor-pointer"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">Set Status…</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="REOPENED">REOPENED</option>
            </select>

            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">Set Priority…</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
              <option value="P5">P5</option>
            </select>

            <button
              type="button"
              onClick={handleApplyBulkUpdate}
              disabled={bulkActionLoading || (!bulkStatus && !bulkPriority)}
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {bulkActionLoading ? "Updating…" : "Apply Bulk Update"}
            </button>
          </div>
        </div>
      )}

      {/* ── Bugs Data Table ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
                {canDevelop && (
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {selectedBugIds.length > 0 && selectedBugIds.length === bugs.length ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-3 font-semibold">Bug #</th>
                <th className="py-3 px-3 font-semibold">Summary</th>
                <th className="py-3 px-3 font-semibold">Project / Component</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Resolution</th>
                <th className="py-3 px-3 font-semibold">Severity</th>
                <th className="py-3 px-3 font-semibold">Priority</th>
                <th className="py-3 px-3 font-semibold">Assignee</th>
                <th className="py-3 px-3 font-semibold">Reporter</th>
                <th className="py-3 px-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Loading defect registry…</span>
                    </div>
                  </td>
                </tr>
              ) : bugs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Bug className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <div className="font-semibold text-slate-700 dark:text-slate-300">No defects found</div>
                      <p className="text-[11px] text-slate-400">
                        Try modifying your search or filters to see more results.
                      </p>
                      {canReport && (
                        <button
                          type="button"
                          onClick={() => openReportBugDrawer()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs mt-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Report Defect
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                bugs.map((bug) => {
                  const isSelected = selectedBugIds.includes(bug.id);
                  return (
                    <tr
                      key={bug.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      {canDevelop && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectBug(bug.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Link
                          href={`/project-management/bugsmart/bugs/${bug.id}`}
                          className="font-mono font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 underline decoration-dotted"
                        >
                          {bug.bug_number}
                        </Link>
                      </td>
                      <td className="py-3 px-3 max-w-sm truncate">
                        <Link
                          href={`/project-management/bugsmart/bugs/${bug.id}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400"
                          title={bug.summary}
                        >
                          {bug.summary}
                        </Link>
                        {bug.labels && bug.labels.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {bug.labels.map((l) => (
                              <span
                                key={l.id}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                              >
                                #{l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {bug.project?.name}
                        </div>
                        {bug.component ? (
                          <div className="text-[11px] text-slate-400">{bug.component.name}</div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">No component</div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <BugzillaStatusBadge status={bug.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {bug.resolution ? (
                          <span className="font-mono text-[11px] uppercase font-semibold text-slate-700 dark:text-slate-300">
                            {bug.resolution}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <BugzillaSeverityBadge severity={bug.severity} showIcon={false} />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <BugzillaPriorityBadge priority={bug.priority} />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {bug.assignee ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {bug.assignee.first_name} {bug.assignee.last_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {bug.reporter ? `${bug.reporter.first_name} ${bug.reporter.last_name}` : "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {new Date(bug.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{" "}
            <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalCount} total defects)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Save Search Modal ── */}
      {saveSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Save Current Search Query</h3>
              <button
                type="button"
                onClick={() => setSaveSearchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save these active filters to quickly run or share them later under the Saved Searches tab.
            </p>

            {searchSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
                {searchSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Search Name
              </label>
              <input
                type="text"
                placeholder="e.g. My Critical Open Bugs"
                value={savedSearchName}
                onChange={(e) => setSavedSearchName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaveSearchModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSearch}
                disabled={savingSearch || !savedSearchName.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {savingSearch ? "Saving…" : "Save Search"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
