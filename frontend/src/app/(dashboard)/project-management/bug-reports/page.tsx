"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bug,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  TrendingUp,
  ShieldCheck,
  User,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import { ProjectTask, BugReportSummary } from "@/types/pm";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { TaskExecutionModal } from "@/components/project-management/TaskExecutionModal";

export default function BugReportsPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  const [summary, setSummary] = useState<BugReportSummary | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [hasBugsOnly, setHasBugsOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Edit modal
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  const fetchBugReports = useCallback(
    async (currentPage = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await pmApi.getBugReports({
          page: currentPage,
          per_page: 20,
          search: search.trim() || undefined,
          has_bugs: hasBugsOnly ? true : undefined,
        });

        setSummary(res.summary);
        setTasks(res.tasks?.data || []);
        setPage(res.tasks?.current_page || 1);
        setTotalPages(res.tasks?.last_page || 1);
        setTotalRecords(res.tasks?.total || 0);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load bug reports.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, hasBugsOnly]
  );

  useEffect(() => {
    fetchBugReports(1);
  }, [fetchBugReports]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBugReports(1);
  };

  const handleTaskUpdated = (updatedTask: ProjectTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    // Re-fetch summary in background
    fetchBugReports(page);
  };

  const handleTaskDeleted = (taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    fetchBugReports(page);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">QA Bug Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bug className="w-6 h-6 text-[#56348f]" />
            <span>Bug Reports & QA Metrics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive audit of HTML bugs, Functional bugs, and tracker tickets across projects
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchBugReports(page, true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* ── Summary KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Bugs
            </span>
            <div className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">
              {summary.total_bugs}
            </div>
            <span className="text-[11px] text-slate-400">All recorded QA issues</span>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              HTML Bugs
            </span>
            <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
              {summary.html_bugs}
            </div>
            <span className="text-[11px] text-slate-400">UI / Markup defects</span>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Functional Bugs
            </span>
            <div className="mt-1 text-2xl font-black text-purple-600 dark:text-purple-400">
              {summary.functional_bugs}
            </div>
            <span className="text-[11px] text-slate-400">Logic & workflow bugs</span>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tasks with Bugs
            </span>
            <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {summary.tasks_with_bugs}
            </div>
            <span className="text-[11px] text-slate-400">
              {summary.avg_bugs_per_task} avg bugs / task
            </span>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task title, sprint, or project name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </form>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setHasBugsOnly(!hasBugsOnly)}
            style={{
              backgroundColor: hasBugsOnly ? "#56348f" : undefined,
              color: hasBugsOnly ? "#ffffff" : undefined,
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "12px",
            }}
            className={`px-3 py-2 rounded-xl text-xs font-normal border transition-colors cursor-pointer ${
              hasBugsOnly
                ? "bg-[#56348f] !text-white border-[#56348f]"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {hasBugsOnly ? "Showing Tasks With Bugs" : "Showing All Tasks"}
          </button>
        </div>
      </div>

      {/* ── Bug Reports Table ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Task & Project</th>
                <th className="py-3 px-4">Sprint</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-3 text-center">HTML Bugs</th>
                <th className="py-3 px-3 text-center">Functional Bugs</th>
                <th className="py-3 px-3 text-center">Total Bugs</th>
                <th className="py-3 px-4">Bug Tracker Link</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500 animate-pulse">
                    <Bug className="w-8 h-8 mx-auto text-slate-400 opacity-60 mb-2" />
                    <span>Loading Bug Reports…</span>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No bugs found!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No tasks matched your current filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const htmlBugs = Number(task.html_bugs || 0);
                  const funcBugs = Number(task.functional_bugs || 0);
                  const totalBugs = (Number(task.total_bugs || 0) > 0 ? Number(task.total_bugs) : (htmlBugs + funcBugs));

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Task & Project */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <Link
                          href={`/project-management/tasks/${task.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 line-clamp-1"
                        >
                          {task.title}
                        </Link>
                        {task.project && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {task.project.name}
                          </div>
                        )}
                      </td>

                      {/* Sprint */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.sprint ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {task.sprint}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.assignees && task.assignees.length > 0 ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {task.assignees[0].first_name} {task.assignees[0].last_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* HTML Bugs */}
                      <td className="py-3.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {htmlBugs > 0 ? htmlBugs : <span className="text-slate-300 font-normal">0</span>}
                      </td>

                      {/* Functional Bugs */}
                      <td className="py-3.5 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                        {funcBugs > 0 ? funcBugs : <span className="text-slate-300 font-normal">0</span>}
                      </td>

                      {/* Total Bugs */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                            totalBugs > 0
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {totalBugs}
                        </span>
                      </td>

                      {/* Bug Tracker Link */}
                      <td className="py-3.5 px-4">
                        {task.bug_tracker_link ? (
                          <a
                            href={task.bug_tracker_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline max-w-[150px] truncate"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">View Ticket</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <TaskStatusBadge status={task.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingTask(task)}
                          style={{
                            fontFamily: '"Proxima Nova", sans-serif',
                            fontSize: "12px",
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-normal border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Bugs</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
            <span>
              Showing {tasks.length} of {totalRecords} bug report items
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => fetchBugReports(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 font-medium text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => fetchBugReports(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Task Execution & Bugs Modal ── */}
      {editingTask && (
        <TaskExecutionModal
          isOpen={true}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={handleTaskUpdated}
          onDelete={handleTaskDeleted}
        />
      )}
    </div>
  );
}
