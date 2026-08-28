"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Plus,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Users,
  AlertTriangle,
  FileText,
  Upload,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
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
import { TaskTrackerTable } from "@/components/project-management/TaskTrackerTable";
import { TeamFilterSelector } from "@/components/project-management/TeamFilterSelector";
import { CreateTaskModal } from "@/components/project-management/CreateTaskModal";
import { DailyReportModal } from "@/components/project-management/DailyReportModal";
import { ImportTasksModal } from "@/components/project-management/ImportTasksModal";

export default function AllTasksPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";
  const isTeamLead = userRoleStr === "team lead";
  const isEmployee = !isSuperAdmin && !isTeamLead && userRoleStr !== "admin" && userRoleStr !== "manager";
  const canEditTasks = !isEmployee;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tasksData, setTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: number; first_name: string; last_name: string; name?: string; employee_code?: string; designation?: string; department?: string; team_id?: number | null }>
  >([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedAssigneeForModal, setSelectedAssigneeForModal] = useState<number | undefined>(undefined);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);

  // Fetch Projects for dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await pmApi.getProjects({ page: 1, per_page: "all", all: true } as any);
        setProjects(res.data || []);
      } catch (err) {
        console.warn("Failed to load projects list", err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch Team Members for grouped view
  useEffect(() => {
    if (canEditTasks) {
      pmApi.getTeamMembers()
        .then((res: any) => {
          if (res && Array.isArray(res.members)) {
            setTeamMembers(res.members);
          }
        })
        .catch((err) => console.warn("Failed to load team members", err));
    }
  }, [canEditTasks]);

  const fetchTasks = useCallback(
    async (page = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        if (isEmployee) {
          const params: any = { page, per_page: 500 };
          if (statusFilter && statusFilter !== "All") params.status = statusFilter;
          const data = await pmApi.getMyTasks(params);
          setTasksData(data);
        } else {
          const params: TaskFilterParams = { page, per_page: 500 };
          if (search.trim()) params.search = search.trim();
          if (statusFilter && statusFilter !== "All") params.status = statusFilter;
          if (priorityFilter && priorityFilter !== "All") params.priority = priorityFilter;
          if (projectFilter) params.project_id = Number(projectFilter);
          if (selectedTeamId && selectedTeamId !== "all") params.team_id = Number(selectedTeamId);

          const data = await pmApi.getTasks(params);
          setTasksData(data);
        }
        setCurrentPage(page);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load tasks.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, priorityFilter, projectFilter, selectedTeamId, isEmployee]
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
    setSelectedAssigneeForModal(undefined);
  };

  const handleQuickStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    setUpdatingTaskId(taskId);
    setTasksData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      };
    });

    try {
      await pmApi.updateTaskStatus(taskId, { status: newStatus });
    } catch (err: any) {
      console.error("Failed to update status", err);
      fetchTasks(currentPage, true);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleQuickPriorityChange = async (taskId: number, newPriority: TaskPriority) => {
    setUpdatingTaskId(taskId);
    setTasksData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t)),
      };
    });

    try {
      await pmApi.updateTask(taskId, { priority: newPriority });
    } catch (err: any) {
      console.error("Failed to update priority", err);
      fetchTasks(currentPage, true);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const rawList = tasksData?.data || [];
  const totalTasks = tasksData?.total ?? rawList.length;
  const lastPage = tasksData?.last_page || 1;

  // Filter tasks by Team if Super Admin selects one
  const tasksList = useMemo(() => {
    if (selectedTeamId === "all") return rawList;
    return rawList.filter((t) => {
      const matchTaskTeam = t.team_id === selectedTeamId;
      const matchProjTeam = t.project?.team_id === selectedTeamId;
      const matchAssigneeTeam = (t.assignees || []).some((a: any) => a.team_id === selectedTeamId);
      return matchTaskTeam || matchProjTeam || matchAssigneeTeam;
    });
  }, [rawList, selectedTeamId]);

  // Group tasks by team member for Team Leads
  const { employeeGroups, unassignedTasks } = useMemo(() => {
    const memberMap = new Map<number, {
      member: { id: number; first_name: string; last_name: string; name: string; employee_code?: string; designation?: string; team_id?: number | null };
      tasks: ProjectTask[];
    }>();

    // 1. Pre-seed with all known team members
    teamMembers.forEach((m) => {
      if (selectedTeamId !== "all" && m.team_id && m.team_id !== selectedTeamId) {
        return;
      }

      const fName = m.first_name || "";
      const lName = m.last_name || "";
      const fullName = m.name || `${fName} ${lName}`.trim() || `User #${m.id}`;
      memberMap.set(m.id, {
        member: {
          id: m.id,
          first_name: fName || fullName,
          last_name: lName,
          name: fullName,
          employee_code: m.employee_code,
          designation: m.designation,
          team_id: m.team_id,
        },
        tasks: [],
      });
    });

    const unassigned: ProjectTask[] = [];

    // 2. Distribute tasks to assignees
    tasksList.forEach((task) => {
      if (!task.assignees || !Array.isArray(task.assignees) || task.assignees.length === 0) {
        unassigned.push(task);
        return;
      }

      task.assignees.forEach((assignee: any) => {
        const aId = assignee.id || assignee.user_id;
        if (!aId) return;

        if (selectedTeamId !== "all" && assignee.team_id && assignee.team_id !== selectedTeamId && task.team_id !== selectedTeamId && task.project?.team_id !== selectedTeamId) {
          return;
        }

        if (!memberMap.has(aId)) {
          const aName = assignee.first_name ? `${assignee.first_name} ${assignee.last_name || ""}`.trim() : assignee.name || `User #${aId}`;
          memberMap.set(aId, {
            member: {
              id: aId,
              first_name: assignee.first_name || aName,
              last_name: assignee.last_name || "",
              name: aName,
              employee_code: assignee.employee_code,
              designation: assignee.designation,
              team_id: assignee.team_id,
            },
            tasks: [],
          });
        }

        const entry = memberMap.get(aId)!;
        if (!entry.tasks.some((t) => t.id === task.id)) {
          entry.tasks.push(task);
        }
      });
    });

    const filteredEmployeeGroups = Array.from(memberMap.values()).filter((g) => {
      if (selectedTeamId === "all") return true;
      const belongsToTeam = g.member.team_id === selectedTeamId;
      const hasTeamTasks = g.tasks.length > 0;
      return belongsToTeam || hasTeamTasks;
    });

    return {
      employeeGroups: filteredEmployeeGroups,
      unassignedTasks: unassigned,
    };
  }, [tasksList, teamMembers, selectedTeamId]);

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
            <span className="text-slate-900 dark:text-white">All Tasks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            All Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor, assign, and track deliverable milestones across all team members and projects.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Team selector for Super Admin */}
          {(isSuperAdmin || userRoleStr === "admin") && (
            <TeamFilterSelector
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
            />
          )}

          {/* View Mode Toggle (Grouped by Employee vs Flat List) */}
          {canEditTasks && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "grouped"
                    ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>By Employee</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("flat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "flat"
                    ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Tasks</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsDailyReportOpen(true)}
            style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-[13px] leading-[20px] font-normal border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
            title="Open Role-Based Daily Reports"
          >
            <FileText className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
            <span>Daily Reports</span>
          </button>

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

          {canEditTasks && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                style={{
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 400,
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-[13px] leading-[20px] font-normal border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                title="Import Tasks from CSV spreadsheet"
              >
                <Upload className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                <span>Import Tasks</span>
              </button>

              <button
                onClick={() => {
                  setSelectedAssigneeForModal(undefined);
                  setIsCreateModalOpen(true);
                }}
                style={{ backgroundColor: "#56348f", color: "rgb(255, 255, 255)", fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 400 }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] font-normal shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 !text-white" />
                <span className="!text-white">Create Task</span>
              </button>
            </>
          )}
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
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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

      {/* ── Main Content Area ── */}
      {loading ? (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-16 text-center text-slate-500 space-y-3 animate-pulse">
          <Layers className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-semibold">Loading deliverables directory…</p>
        </div>
      ) : tasksList.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 py-16 text-center p-6 space-y-3">
          <Layers className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">No tasks found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== "All" || priorityFilter !== "All" || projectFilter
              ? "No tasks match the selected filters. Try clearing your search parameters."
              : "No deliverable tasks have been created yet."}
          </p>
          {canEditTasks && (
            <button
              onClick={() => {
                setSelectedAssigneeForModal(undefined);
                setIsCreateModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Task</span>
            </button>
          )}
        </div>
      ) : viewMode === "grouped" && canEditTasks ? (
        /* ══════════════════════════════════════════════════════════════════
           GROUPED BY EMPLOYEE TABLES VIEW (For Team Leads & Admins)
           ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {employeeGroups.map((group) => {
            const initial = group.member.first_name?.[0] || group.member.name?.[0] || "U";

            return (
              <div
                key={group.member.id}
                className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden"
              >
                {/* Employee Header Bar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/90 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[#56348f] dark:text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-200 dark:border-purple-800">
                      {initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {group.member.name}
                        </span>
                        {group.member.employee_code && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                            {group.member.employee_code}
                          </span>
                        )}
                        {group.member.designation && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            • {group.member.designation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {group.tasks.length} {group.tasks.length === 1 ? "Task" : "Tasks"}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAssigneeForModal(group.member.id);
                        setIsCreateModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#56348f] hover:bg-[#462875] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                      title={`Assign task to ${group.member.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </button>
                  </div>
                </div>

                {/* 12-Column Table for this employee */}
                <TaskTrackerTable
                  tasks={group.tasks}
                  canEdit={canEditTasks}
                  onStatusChange={handleQuickStatusChange}
                  onPriorityChange={handleQuickPriorityChange}
                  updatingTaskId={updatingTaskId}
                  emptyMessage={`No active tasks assigned to ${group.member.name}. Click "+ New Task" to assign one.`}
                />
              </div>
            );
          })}

          {/* Unassigned Deliverables Block (if any exist) */}
          {unassignedTasks.length > 0 && (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50/60 dark:bg-amber-950/30 border-b border-slate-200/90 dark:border-slate-800">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Unassigned Tasks ({unassignedTasks.length})</span>
                </div>
              </div>
              <TaskTrackerTable
                tasks={unassignedTasks}
                canEdit={canEditTasks}
                onStatusChange={handleQuickStatusChange}
                onPriorityChange={handleQuickPriorityChange}
                updatingTaskId={updatingTaskId}
              />
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           UNIFIED ALL TASKS TABLE VIEW (Flat List)
           ══════════════════════════════════════════════════════════════════ */
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <TaskTrackerTable
            tasks={tasksList}
            canEdit={canEditTasks}
            onStatusChange={handleQuickStatusChange}
            onPriorityChange={handleQuickPriorityChange}
            updatingTaskId={updatingTaskId}
            showAssigneesCol={true}
          />

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
                  <ChevronRight className="w-4 h-4 rotate-180" />
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
      )}

      {/* ── Create Task Modal ── */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedAssigneeForModal(undefined);
        }}
        onSuccess={handleTaskCreated}
        defaultAssigneeId={selectedAssigneeForModal}
      />

      {/* ── Role-Based Daily Report Modal ── */}
      <DailyReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
      />

      {/* ── Import Tasks Modal ── */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projects={projects}
        onSuccess={() => {
          fetchTasks(1, true);
        }}
      />
    </div>
  );
}
