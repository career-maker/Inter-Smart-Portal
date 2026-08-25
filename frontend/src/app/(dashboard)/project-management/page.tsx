"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck,
  Building2,
  Activity,
  ListTodo,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import {
  Project,
  ProjectTask,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  PaginatedResponse
} from "@/types/pm";

// ── Status Color Helpers ───────────────────────────────────────────────────────

function getProjectStatusBadge(status: ProjectStatus) {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "Planning":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "On Hold":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "Completed":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30";
    case "Cancelled":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
  }
}

function getTaskStatusBadge(status: TaskStatus) {
  switch (status) {
    case "In Progress":
    case "Being Developed":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "Ready for QA":
    case "Assigned to QA":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case "Completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "On Hold":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "Rejected":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "Yet to Start":
    case "Forecast":
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
  }
}

function getTaskPriorityBadge(priority: TaskPriority) {
  switch (priority) {
    case "Critical":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    case "High":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "Medium":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "Low":
    default:
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
  }
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function isTaskOverdue(dueDateStr?: string | null, status?: TaskStatus): boolean {
  if (!dueDateStr || status === "Completed" || status === "Rejected") return false;
  try {
    const d = parseISO(dueDateStr);
    return isPast(d) && !isToday(d);
  } catch {
    return false;
  }
}

// ── Dashboard Component ────────────────────────────────────────────────────────

export default function ProjectManagementDashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectsData, setProjectsData] = useState<PaginatedResponse<Project> | null>(null);
  const [myTasksData, setMyTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);
  const [allTasksData, setAllTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const results = await Promise.allSettled([
        pmApi.getProjects({ page: 1 }),
        pmApi.getMyTasks({ page: 1 }),
        pmApi.getTasks({ page: 1 }),
      ]);

      if (results[0].status === "fulfilled") {
        setProjectsData(results[0].value);
      } else {
        console.warn("Could not load projects data", results[0].reason);
      }

      if (results[1].status === "fulfilled") {
        setMyTasksData(results[1].value);
      } else {
        console.warn("Could not load my tasks data", results[1].reason);
      }

      if (results[2].status === "fulfilled") {
        setAllTasksData(results[2].value);
      } else {
        console.warn("Could not load tasks list data", results[2].reason);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load Project Management overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived Metrics from Real API Responses
  const projectsList = projectsData?.data || [];
  const totalProjectsCount = projectsData?.total ?? projectsList.length;
  const activeProjectsCount = projectsList.filter((p) => p.status === "Active").length;
  const planningProjectsCount = projectsList.filter((p) => p.status === "Planning").length;
  const completedProjectsCount = projectsList.filter((p) => p.status === "Completed").length;

  const myTasksList = myTasksData?.data || [];
  const totalMyTasksCount = myTasksData?.total ?? myTasksList.length;
  const myOpenTasksCount = myTasksList.filter(
    (t) => t.status !== "Completed" && t.status !== "Rejected"
  ).length;

  const tasksList = allTasksData?.data || [];
  const totalVisibleTasksCount = allTasksData?.total ?? tasksList.length;
  const overdueTasksCount = tasksList.filter((t) => isTaskOverdue(t.due_date, t.status)).length;
  const qaTasksCount = tasksList.filter(
    (t) => t.status === "Ready for QA" || t.status === "Assigned to QA"
  ).length;

  // Task Status Distribution Calculation
  const statusCounts: Record<string, number> = {};
  tasksList.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Project Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of ongoing projects, task allocations, and active team deliverables.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
            aria-label="Refresh Dashboard"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>

          <Link
            href="/project-management/tasks/my"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ListTodo className="w-4 h-4 text-blue-500" />
            <span>My Tasks</span>
          </Link>

          <Link
            href="/project-management/projects"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <FolderKanban className="w-4 h-4" />
            <span>View Projects</span>
          </Link>
        </div>
      </div>

      {/* ── Error Banner (if any) ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load all dashboard data</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="text-xs font-semibold underline hover:no-underline text-rose-700 dark:text-rose-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Metric Statistics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Projects */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Projects
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? "…" : totalProjectsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">visible</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>{activeProjectsCount} active</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{planningProjectsCount} in planning</span>
          </p>
        </div>

        {/* Card 2: Active Deliverables */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Projects
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? "…" : activeProjectsCount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              In Progress
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{completedProjectsCount} completed to date</span>
          </p>
        </div>

        {/* Card 3: My Open Tasks */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Open Tasks
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <ListTodo className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? "…" : myOpenTasksCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              of {totalMyTasksCount} assigned
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-purple-500" />
            <span>Direct personal allocations</span>
          </p>
        </div>

        {/* Card 4: QA & Deadline Watch */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              QA & Deadlines
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? "…" : qaTasksCount}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              in QA Review
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            {overdueTasksCount > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overdueTasksCount} overdue task{overdueTasksCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All tasks within target dates
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Main Layout: Asymmetric 2-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg screen): My Tasks & Recent Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: My Assigned Tasks */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    My Tasks
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tasks personally assigned to you across projects
                  </p>
                </div>
              </div>

              <Link
                href="/project-management/tasks/my"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                Loading task allocations…
              </div>
            ) : myTasksList.length === 0 ? (
              <div className="py-10 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No active tasks assigned to you
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  When tasks are assigned to you by your team lead or project coordinator, they will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Task Details</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-4 text-right">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {myTasksList.slice(0, 5).map((task) => {
                      const overdue = isTaskOverdue(task.due_date, task.status);
                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                              {task.title}
                            </div>
                            {task.sub_phase && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Layers className="w-3 h-3 text-slate-400" />
                                {task.sub_phase.name}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                              {task.project?.name || "—"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${getTaskStatusBadge(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${getTaskPriorityBadge(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`text-xs font-semibold inline-flex items-center gap-1 ${
                                overdue
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              {formatDateDisplay(task.due_date)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Recent & Active Projects */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Recent Projects
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active deliverables across departments
                  </p>
                </div>
              </div>

              <Link
                href="/project-management/projects"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                <span>All Projects</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                Loading projects list…
              </div>
            ) : projectsList.length === 0 ? (
              <div className="py-10 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No projects available
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  You are not currently assigned to any project, or no active projects have been
                  created yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Coordinator</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Target End</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {projectsList.slice(0, 5).map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {project.name}
                          </div>
                          {project.category && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {project.category}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            {project.team?.name || "Cross-Team"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {project.coordinator ? (
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center">
                                {project.coordinator.first_name?.[0]}
                                {project.coordinator.last_name?.[0]}
                              </span>
                              <span>
                                {project.coordinator.first_name} {project.coordinator.last_name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${getProjectStatusBadge(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDateDisplay(project.expected_end_date)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col on lg screen): Status Breakdown & Fast Navigation */}
        <div className="space-y-6">
          {/* Section 3: Task Status Breakdown */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Status Distribution
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Breakdown across {totalVisibleTasksCount} visible tasks
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
                Calculating status metrics…
              </div>
            ) : tasksList.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                No task distribution data available.
              </p>
            ) : (
              <div className="space-y-3.5">
                {[
                  { label: "In Progress", count: statusCounts["In Progress"] || 0, color: "bg-blue-500" },
                  { label: "Being Developed", count: statusCounts["Being Developed"] || 0, color: "bg-sky-500" },
                  { label: "Ready for QA", count: statusCounts["Ready for QA"] || 0, color: "bg-purple-500" },
                  { label: "Assigned to QA", count: statusCounts["Assigned to QA"] || 0, color: "bg-fuchsia-500" },
                  { label: "Yet to Start", count: statusCounts["Yet to Start"] || 0, color: "bg-slate-400" },
                  { label: "Completed", count: statusCounts["Completed"] || 0, color: "bg-emerald-500" },
                  { label: "On Hold", count: statusCounts["On Hold"] || 0, color: "bg-amber-500" },
                ]
                  .filter((s) => s.count > 0)
                  .map((item) => {
                    const pct = totalVisibleTasksCount
                      ? Math.round((item.count / totalVisibleTasksCount) * 100)
                      : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Section 4: Quick Navigation & Role Context */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Module Destinations
            </h3>

            <div className="space-y-2">
              <Link
                href="/project-management/projects"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Projects Directory
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/project-management/tasks/my"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <ListTodo className="w-4 h-4 text-purple-500" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    My Assigned Tasks
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
              </Link>

              {(isSuperAdmin || isTeamLead) && (
                <Link
                  href="/project-management/tasks"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      All Tasks & Allocations
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>

            {/* Role indicator info pill */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                Signed in as <strong className="text-slate-700 dark:text-slate-300">{user?.role || "Employee"}</strong>
                {user?.designation ? ` (${user.designation})` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
