"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  Layers,
  Search,
  Plus,
  Filter,
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
  Users
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import {
  Project,
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TASK_STATUSES,
  TASK_PRIORITIES,
  PaginatedResponse,
  TaskFilterParams,
} from "@/types/pm";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/project-management/TaskPriorityBadge";
import { CreateTaskModal } from "@/components/project-management/CreateTaskModal";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "—";
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    return format(parsed, "dd MMM yyyy");
  } catch {
    return String(dateStr);
  }
}

function isTaskOverdue(dueDateStr?: string | null, status?: TaskStatus): boolean {
  if (!dueDateStr || typeof dueDateStr !== "string" || status === "Completed") return false;
  try {
    const due = parseISO(dueDateStr);
    if (isNaN(due.getTime())) return false;
    return isPast(due) && !isToday(due);
  } catch {
    return false;
  }
}

export default function AllTasksPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tasksData, setTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch Projects for dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await pmApi.getProjects({ page: 1 });
        setProjects(res.data || []);
      } catch (err) {
        console.warn("Failed to load projects list", err);
      }
    };
    fetchProjects();
  }, []);

  const fetchTasks = useCallback(
    async (page = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params: TaskFilterParams = { page };
        if (search.trim()) params.search = search.trim();
        if (statusFilter && statusFilter !== "All") params.status = statusFilter;
        if (priorityFilter && priorityFilter !== "All") params.priority = priorityFilter;
        if (projectFilter) params.project_id = Number(projectFilter);

        const data = await pmApi.getTasks(params);
        setTasksData(data);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load tasks.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, priorityFilter, projectFilter]
  );

  useEffect(() => {
    fetchTasks(1);
  }, [fetchTasks]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTasks(1);
  };

  const handleTaskCreated = (newTask: ProjectTask) => {
    fetchTasks(1, true);
  };

  const tasksList = tasksData?.data || [];
  const totalTasks = tasksData?.total ?? tasksList.length;
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
            <span className="text-slate-900 dark:text-white">All Tasks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            All Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor, assign, and track deliverable milestones across all active projects.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/project-management/tasks/my"
            style={{ backgroundColor: "#f3e8ff", color: "#56348f", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="px-3.5 py-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200/80 !text-[#56348f] dark:!text-purple-300 text-[13px] leading-[20px] font-normal border border-purple-300 dark:border-purple-800/80 transition-colors"
          >
            My Tasks
          </Link>

          <button
            onClick={() => fetchTasks(currentPage, true)}
            disabled={refreshing || loading}
            aria-label="Refresh Tasks"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 !text-slate-800 dark:!text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : "text-slate-700 dark:text-slate-300"}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{ backgroundColor: "#56348f", color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-normal shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 !text-white" />
            <span style={{ color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }} className="!text-white">Create Task</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search Header ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["All", ...TASK_STATUSES].map((status) => {
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  backgroundColor: isSelected ? "#56348f" : undefined,
                  color: isSelected ? "rgb(255, 255, 255)" : undefined,
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 400,
                }}
                className={`px-3 py-1 rounded-xl text-[13px] leading-[20px] font-normal whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#56348f] !text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800/60 !text-slate-800 dark:!text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Search, Project & Priority Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <form onSubmit={handleSearchSubmit} className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title or sprint..."
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  fetchTasks(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </form>

          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Priorities</option>
              {TASK_PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr} Priority
                </option>
              ))}
            </select>
          </div>
        </div>
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
            onClick={() => fetchTasks(currentPage, true)}
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
            <Layers className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-sm font-semibold">Loading tasks directory…</p>
          </div>
        ) : tasksList.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">No tasks found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== "All" || priorityFilter !== "All" || projectFilter
                ? "No tasks match the selected filters. Try clearing your search parameters."
                : "No deliverable tasks have been created yet."}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Task</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-y border-slate-200 dark:border-slate-800">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold text-[12px] leading-[18px] uppercase tracking-wider">
                  <th className="py-3.5 px-5 border-r border-slate-200/90 dark:border-slate-800">Task Title</th>
                  <th className="py-3.5 px-4 border-r border-slate-200/90 dark:border-slate-800">Project</th>
                  <th className="py-3.5 px-4 border-r border-slate-200/90 dark:border-slate-800">Assignees</th>
                  <th className="py-3.5 px-4 border-r border-slate-200/90 dark:border-slate-800">Due Date</th>
                  <th className="py-3.5 px-4 border-r border-slate-200/90 dark:border-slate-800">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {tasksList.map((task) => {
                  const overdue = isTaskOverdue(task.due_date, task.status);

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Task Title & Catalog indicator */}
                      <td className="py-3.5 px-5 border-r border-slate-200/80 dark:border-slate-800/80">
                        <Link
                          href={`/project-management/tasks/${task.id}`}
                          style={{
                            fontFamily: '"Proxima Nova", sans-serif',
                            fontSize: "13px",
                            lineHeight: "18px",
                            fontWeight: 400,
                            color: "rgb(15, 24, 36)",
                          }}
                          className="hover:text-purple-600 dark:!text-slate-100 dark:hover:!text-purple-400 transition-colors block line-clamp-1"
                        >
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {task.catalogTask && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{task.catalogTask.name}</span>
                            </span>
                          )}
                          {task.sprint && (
                            <span className="text-[11px] leading-[16px] text-slate-400 dark:text-slate-500 font-normal">
                              Sprint: {task.sprint}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-3.5 px-4 border-r border-slate-200/80 dark:border-slate-800/80">
                        {task.project ? (
                          <Link
                            href={`/project-management/projects/${task.project.id}`}
                            style={{
                              fontFamily: '"Proxima Nova", sans-serif',
                              fontSize: "13px",
                              lineHeight: "18px",
                              fontWeight: 400,
                              color: "rgb(15, 24, 36)",
                            }}
                            className="hover:text-purple-600 dark:!text-slate-200 dark:hover:!text-purple-400 transition-colors flex items-center gap-1.5"
                          >
                            <FolderKanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="line-clamp-1">{task.project.name}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic text-[13px] leading-[18px]">Unassigned</span>
                        )}
                      </td>

                      {/* Assignees */}
                      <td className="py-3.5 px-4 border-r border-slate-200/80 dark:border-slate-800/80">
                        {task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.assignees.map((a: any) => {
                              const name = a?.first_name ? `${a.first_name} ${a.last_name || ""}`.trim() : a?.name || "Assignee";
                              const initial = a?.first_name?.[0] || a?.name?.[0] || "?";
                              return (
                                <span
                                  key={a?.id || Math.random()}
                                  style={{
                                    fontFamily: '"Proxima Nova", sans-serif',
                                    fontSize: "13px",
                                    lineHeight: "18px",
                                    fontWeight: 400,
                                    color: "rgb(15, 24, 36)",
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 dark:!text-slate-200"
                                >
                                  <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[9px] font-bold flex items-center justify-center">
                                    {initial}
                                  </span>
                                  <span>{name}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[13px] leading-[18px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Due Date & Overdue Tag */}
                      <td className="py-3.5 px-4 border-r border-slate-200/80 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{
                              fontFamily: '"Proxima Nova", sans-serif',
                              fontSize: "13px",
                              lineHeight: "18px",
                              fontWeight: 400,
                            }}
                            className={
                              overdue
                                ? "text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"
                                : "text-[#0f1824] dark:text-slate-300"
                            }
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
                      <td className="py-3.5 px-4 border-r border-slate-200/80 dark:border-slate-800/80">
                        <TaskPriorityBadge priority={task.priority} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
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
                onClick={() => fetchTasks(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchTasks(currentPage + 1)}
                disabled={currentPage >= lastPage || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Task Modal ── */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTaskCreated}
      />
    </div>
  );
}
