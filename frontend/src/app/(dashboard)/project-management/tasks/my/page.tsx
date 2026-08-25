"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  CheckSquare,
  Search,
  Calendar,
  Building2,
  User,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import {
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TASK_STATUSES,
  TASK_PRIORITIES,
  PaginatedResponse,
} from "@/types/pm";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/project-management/TaskPriorityBadge";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function isTaskOverdue(dueDateStr?: string | null, status?: TaskStatus): boolean {
  if (!dueDateStr || status === "Completed") return false;
  try {
    const due = parseISO(dueDateStr);
    return isPast(due) && !isToday(due);
  } catch {
    return false;
  }
}

export default function MyTasksPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tasksData, setTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMyTasks = useCallback(
    async (page = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await pmApi.getMyTasks({ page });
        setTasksData(data);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load assigned tasks.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMyTasks(1);
  }, [fetchMyTasks]);

  const rawList = tasksData?.data || [];
  const filteredTasks = statusFilter === "All" ? rawList : rawList.filter((t) => t.status === statusFilter);
  const totalTasks = tasksData?.total ?? rawList.length;
  const lastPage = tasksData?.last_page || 1;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-blue-600 dark:hover:text-blue-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white">My Tasks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Assigned Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Deliverables and milestone items specifically assigned to you.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {(isSuperAdmin || isTeamLead) && (
            <Link
              href="/project-management/tasks"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              All Tasks Directory
            </Link>
          )}

          <button
            onClick={() => fetchMyTasks(currentPage, true)}
            disabled={refreshing || loading}
            aria-label="Refresh My Tasks"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Status Filters ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {["All", ...TASK_STATUSES].map((status) => {
          const isSelected = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load tasks</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchMyTasks(currentPage, true)}
            className="text-xs font-semibold underline hover:no-underline text-rose-700 dark:text-rose-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Tasks Table / Cards ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-3 animate-pulse">
            <CheckSquare className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-sm font-semibold">Loading your assigned tasks…</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-3">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">No tasks assigned</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {statusFilter !== "All"
                ? `You have no tasks currently in "${statusFilter}" status.`
                : "You do not have any active project tasks assigned to your account."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-5">Task Title</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredTasks.map((task) => {
                  const overdue = isTaskOverdue(task.due_date, task.status);

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Task Title */}
                      <td className="py-4 px-5">
                        <Link
                          href={`/project-management/tasks/${task.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors block line-clamp-1"
                        >
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {task.catalogTask && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{task.catalogTask.name}</span>
                            </span>
                          )}
                          {task.sprint && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              Sprint: {task.sprint}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-4 px-4">
                        {task.project ? (
                          <Link
                            href={`/project-management/projects/${task.project.id}`}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
                          >
                            <FolderKanban className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="line-clamp-1">{task.project.name}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs ${
                              overdue
                                ? "text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {overdue && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                            <span>{formatDateDisplay(task.due_date)}</span>
                          </span>
                          {overdue && (
                            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4">
                        <TaskPriorityBadge priority={task.priority} />
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <TaskStatusBadge status={task.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalTasks > 0 && lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong>{" "}
              of <strong className="text-slate-800 dark:text-slate-200">{lastPage}</strong> (
              {totalTasks} total tasks)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchMyTasks(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchMyTasks(currentPage + 1)}
                disabled={currentPage >= lastPage || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
