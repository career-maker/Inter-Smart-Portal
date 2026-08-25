"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  Layers,
  ChevronRight,
  FolderKanban,
  Calendar,
  Clock,
  User,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ExternalLink,
  Edit3,
  UserPlus,
  RefreshCw,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import { ProjectTask } from "@/types/pm";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/project-management/TaskPriorityBadge";
import { TaskExecutionModal } from "@/components/project-management/TaskExecutionModal";
import { TaskAssigneeModal } from "@/components/project-management/TaskAssigneeModal";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function isTaskOverdue(dueDateStr?: string | null, status?: string): boolean {
  if (!dueDateStr || status === "Completed") return false;
  try {
    const due = parseISO(dueDateStr);
    return isPast(due) && !isToday(due);
  } catch {
    return false;
  }
}

export default function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const taskId = Number(resolvedParams.id);

  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";

  const [task, setTask] = useState<ProjectTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);

  const fetchTaskDetails = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await pmApi.getTask(taskId);
      setTask(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load task details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId, fetchTaskDetails]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="py-24 text-center text-slate-500 space-y-3 animate-pulse">
          <Layers className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-semibold">Loading task specifications…</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertCircle className="w-5 h-5" />
            <span>Task Not Found or Access Denied</span>
          </div>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
            {error || "The requested task does not exist or you do not have permission to view it."}
          </p>
          <Link
            href="/project-management/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 underline"
          >
            ← Back to Tasks Directory
          </Link>
        </div>
      </div>
    );
  }

  const overdue = isTaskOverdue(task.due_date, task.status);
  const isAssignee = (task.assignees || []).some((a) => a.id === user?.id);
  const canManage = isSuperAdmin || isTeamLead;
  const canUpdateExecution = canManage || isAssignee;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Breadcrumbs & Header ── */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/project-management" className="hover:text-blue-600 dark:hover:text-blue-400">
            Project Management
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/project-management/tasks" className="hover:text-blue-600 dark:hover:text-blue-400">
            Tasks
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-white truncate max-w-xs">{task.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {task.title}
              </h1>
              {task.catalogTask && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  <span>Template: {task.catalogTask.name}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {task.project && (
                <Link
                  href={`/project-management/projects/${task.project.id}`}
                  className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>{task.project.name}</span>
                </Link>
              )}
              <span>•</span>
              <span>Created {formatDateDisplay(task.created_at)}</span>
              {task.sprint && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Sprint: {task.sprint}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchTaskDetails(true)}
              disabled={refreshing}
              aria-label="Refresh Details"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
              title="Refresh Task"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
            </button>

            {canUpdateExecution && (
              <button
                onClick={() => setIsExecutionModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Update Execution</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => setIsAssigneeModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Manage Assignees</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Specs, Execution & Discussion (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Highlights Card */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <TaskStatusBadge status={task.status} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Priority:</span>
                <TaskPriorityBadge priority={task.priority} />
              </div>
              {overdue && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Schedule Overdue</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="pt-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Task Description & Acceptance Scope
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {task.description || "No specific scope notes provided for this task."}
              </p>
            </div>
          </div>

          {/* Execution & Schedule Deviation Card */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Execution Tracking & Deviation
                </h3>
              </div>
              {canUpdateExecution && (
                <button
                  onClick={() => setIsExecutionModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit Progress
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Activity Progress
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {task.activity_percentage ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, task.activity_percentage ?? 0))}%` }}
                />
              </div>
            </div>

            {/* Execution Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[11px] text-slate-400 block font-medium">Allotted Days</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {task.allotted_days ?? "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[11px] text-slate-400 block font-medium">Days Taken</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {task.days_taken ?? "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[11px] text-slate-400 block font-medium">Time Taken</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {task.time_taken ? `${task.time_taken} hrs` : "—"}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-0.5 ${
                  task.deviation && task.deviation > 0
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                <span className="text-[11px] block font-medium opacity-80">Deviation</span>
                <span className="text-sm font-bold">
                  {task.deviation !== null && task.deviation !== undefined
                    ? task.deviation > 0
                      ? `+${task.deviation}d`
                      : `${task.deviation}d`
                    : "0d"}
                </span>
              </div>
            </div>

            {/* Current Updates / Live Log */}
            {task.current_updates && (
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                  Latest Execution Notes:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {task.current_updates}
                </p>
              </div>
            )}

            {/* Deviation Reason */}
            {task.deviation_reason && (
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                  Documented Deviation Reason:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {task.deviation_reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Assignees, Project & Meta (1/3) ── */}
        <div className="space-y-6">
          {/* Assignees Card */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Assignees ({task.assignees?.length || 0})
                </h3>
              </div>
              {canManage && (
                <button
                  onClick={() => setIsAssigneeModalOpen(true)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Manage
                </button>
              )}
            </div>

            {!task.assignees || task.assignees.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-400">
                No assignees allocated yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {task.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                        {assignee.first_name?.[0]}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {assignee.first_name} {assignee.last_name}
                        </span>
                        {assignee.pivot?.is_primary && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            Primary Lead
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Planning Dates Card */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Milestone Dates</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Start Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateDisplay(task.start_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Due Date</span>
                <span
                  className={`font-semibold ${
                    overdue
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {formatDateDisplay(task.due_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Actual Start</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateDisplay(task.actual_start_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Actual Completion</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateDisplay(task.actual_completion_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Target Project Card */}
          {task.project && (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FolderKanban className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Target Project</h3>
              </div>

              <div className="space-y-1.5">
                <Link
                  href={`/project-management/projects/${task.project.id}`}
                  className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>{task.project.name}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                {task.sprint_link && (
                  <a
                    href={task.sprint_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 mt-1"
                  >
                    <span>View Sprint Board</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <TaskExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        task={task}
        onSuccess={(updated) => setTask(updated)}
      />

      <TaskAssigneeModal
        isOpen={isAssigneeModalOpen}
        onClose={() => setIsAssigneeModalOpen(false)}
        task={task}
        onSuccess={(updated) => setTask(updated)}
      />
    </div>
  );
}
