"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Search,
  Users,
  Layers,
  Clock,
  Plus
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import {
  ProjectTask,
  TaskStatus,
  TaskPriority,
  PaginatedResponse,
} from "@/types/pm";
import { TaskTrackerTable } from "@/components/project-management/TaskTrackerTable";
import { TeamFilterSelector } from "@/components/project-management/TeamFilterSelector";
import { CreateTaskModal } from "@/components/project-management/CreateTaskModal";
import { getTaskOverdueInfo } from "@/utils/taskOverdue";

export default function OverdueTasksPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";
  const isTeamLead = userRoleStr === "team lead";
  const isEmployee = !isSuperAdmin && !isTeamLead && userRoleStr !== "admin" && userRoleStr !== "manager";
  const canEdit = !isEmployee;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tasksData, setTasksData] = useState<PaginatedResponse<ProjectTask> | null>(null);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: number; first_name: string; last_name: string; name?: string; employee_code?: string; designation?: string; team_id?: number | null }>
  >([]);
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | "all">("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAssigneeForModal, setSelectedAssigneeForModal] = useState<number | undefined>(undefined);

  // Fetch team members
  useEffect(() => {
    if (canEdit) {
      pmApi.getTeamMembers()
        .then((res: any) => {
          if (res && Array.isArray(res.members)) {
            setTeamMembers(res.members);
          }
        })
        .catch((err) => console.warn("Failed to load team members", err));
    }
  }, [canEdit]);

  const fetchTasks = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        if (isEmployee) {
          // Regular employee only fetches their own tasks
          const data = await pmApi.getMyTasks({ page: 1, per_page: "all" } as any);
          setTasksData(data);
        } else {
          // Team Lead & Admin fetch directory tasks
          const data = await pmApi.getTasks({ page: 1, per_page: "all" } as any);
          setTasksData(data);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load overdue tasks.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isEmployee]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
      fetchTasks(true);
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
      fetchTasks(true);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Filter tasks strictly by Overdue IST rule
  const rawList = tasksData?.data || [];
  const overdueTasks = useMemo(() => {
    return rawList.filter((task) => {
      const overdueInfo = getTaskOverdueInfo(task.due_date, task.status);
      if (!overdueInfo.isOverdue) return false;

      // Filter by team if Super Admin selected one
      if (selectedTeamId !== "all") {
        const matchesProjectTeam = task.project?.team_id === selectedTeamId;
        const matchesTaskTeam = task.team_id === selectedTeamId;
        if (!matchesProjectTeam && !matchesTaskTeam) return false;
      }

      // Filter by search keyword
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const projMatch = task.project?.name?.toLowerCase().includes(q);
        const sprintMatch = task.sprint?.toLowerCase().includes(q);
        if (!titleMatch && !projMatch && !sprintMatch) return false;
      }

      return true;
    });
  }, [rawList, selectedTeamId, search]);

  // Group overdue tasks by team member
  const { employeeGroups, unassignedOverdue } = useMemo(() => {
    const memberMap = new Map<number, {
      member: { id: number; first_name: string; last_name: string; name: string; employee_code?: string; designation?: string };
      tasks: ProjectTask[];
    }>();

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
        },
        tasks: [],
      });
    });

    const unassigned: ProjectTask[] = [];

    overdueTasks.forEach((task) => {
      if (!task.assignees || !Array.isArray(task.assignees) || task.assignees.length === 0) {
        unassigned.push(task);
        return;
      }

      task.assignees.forEach((assignee: any) => {
        const aId = assignee.id || assignee.user_id;
        if (!aId) return;

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

    return {
      employeeGroups: Array.from(memberMap.values()).filter((g) => g.tasks.length > 0),
      unassignedOverdue: unassigned,
    };
  }, [overdueTasks, teamMembers, selectedTeamId]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/project-management/tasks" className="hover:text-purple-600 dark:hover:text-purple-400">
              Tasks
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-rose-600 dark:text-rose-400 font-semibold">Overdue Tasks</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Overdue Tasks</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                {overdueTasks.length}
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Deliverables that missed the 6:30 PM IST daily deadline and require immediate escalation.
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

          {/* View Mode Toggle */}
          {canEdit && (
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
                <span>Flat List</span>
              </button>
            </div>
          )}

          <button
            onClick={() => fetchTasks(true)}
            disabled={refreshing || loading}
            aria-label="Refresh Overdue Tasks"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-rose-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search overdue tasks by title, project, or sprint..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
        />
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-16 text-center text-slate-500 space-y-3 animate-pulse">
          <Clock className="w-8 h-8 mx-auto text-rose-400 opacity-60" />
          <p className="text-sm font-semibold">Checking overdue deadlines…</p>
        </div>
      ) : overdueTasks.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 py-16 text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
            ✓
          </div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">No overdue tasks!</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            All active deliverables are currently on schedule within their 6:30 PM IST timeline.
          </p>
        </div>
      ) : viewMode === "grouped" && canEdit ? (
        /* Grouped Employee Cards */
        <div className="space-y-6">
          {employeeGroups.map((group) => {
            const initial = group.member.first_name?.[0] || group.member.name?.[0] || "U";

            return (
              <div
                key={group.member.id}
                className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-rose-200/80 dark:border-rose-900/40 shadow-sm overflow-hidden"
              >
                {/* Employee Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50/60 dark:bg-rose-950/30 border-b border-rose-200/80 dark:border-rose-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center border border-rose-200 dark:border-rose-800">
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
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {group.tasks.length} {group.tasks.length === 1 ? "Overdue Task" : "Overdue Tasks"}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAssigneeForModal(group.member.id);
                        setIsCreateModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </button>
                  </div>
                </div>

                {/* 12-Column Table */}
                <TaskTrackerTable
                  tasks={group.tasks}
                  canEdit={canEdit}
                  onStatusChange={handleQuickStatusChange}
                  onPriorityChange={handleQuickPriorityChange}
                  updatingTaskId={updatingTaskId}
                />
              </div>
            );
          })}

          {/* Unassigned Overdue Block */}
          {unassignedOverdue.length > 0 && (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-rose-300 dark:border-rose-900/60 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-rose-100/60 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Unassigned Overdue Tasks ({unassignedOverdue.length})</span>
                </div>
              </div>
              <TaskTrackerTable
                tasks={unassignedOverdue}
                canEdit={canEdit}
                onStatusChange={handleQuickStatusChange}
                onPriorityChange={handleQuickPriorityChange}
                updatingTaskId={updatingTaskId}
              />
            </div>
          )}
        </div>
      ) : (
        /* Flat Table View */
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <TaskTrackerTable
            tasks={overdueTasks}
            canEdit={canEdit}
            onStatusChange={handleQuickStatusChange}
            onPriorityChange={handleQuickPriorityChange}
            updatingTaskId={updatingTaskId}
            showAssigneesCol={true}
          />
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedAssigneeForModal(undefined);
        }}
        onSuccess={() => {
          fetchTasks(true);
          setSelectedAssigneeForModal(undefined);
        }}
        defaultAssigneeId={selectedAssigneeForModal}
      />
    </div>
  );
}
