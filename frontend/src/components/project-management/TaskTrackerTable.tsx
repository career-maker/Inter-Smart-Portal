"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  FolderKanban,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Copy,
  MessageSquare,
  Clock,
  User,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/types/pm";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/project-management/TaskPriorityBadge";
import { getTaskOverdueInfo } from "@/utils/taskOverdue";

interface TaskTrackerTableProps {
  tasks: ProjectTask[];
  canEdit: boolean;
  onStatusChange?: (taskId: number, newStatus: TaskStatus) => Promise<void>;
  onPriorityChange?: (taskId: number, newPriority: TaskPriority) => Promise<void>;
  onDuplicateTask?: (task: ProjectTask) => void;
  updatingTaskId?: number | null;
  showAssigneesCol?: boolean;
  emptyMessage?: string;
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "—";
  try {
    const clean = dateStr.split("T")[0];
    const parsed = parseISO(clean);
    if (isNaN(parsed.getTime())) return dateStr;
    return format(parsed, "dd MMM yyyy");
  } catch {
    return String(dateStr);
  }
}

function getStatusBadgeStyle(status: TaskStatus | string): string {
  switch (status) {
    case "Yet to Start":
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
    case "Being Developed":
      return "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700";
    case "Ready for QA":
      return "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700";
    case "Assigned to QA":
      return "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700";
    case "In Progress":
      return "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700";
    case "On Hold":
      return "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700";
    case "Completed":
      return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
    case "Forecast":
      return "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700";
    case "Rejected":
      return "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function getPriorityBadgeStyle(priority: TaskPriority | string): string {
  switch (priority) {
    case "Low":
      return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-700";
    case "Critical":
      return "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

export function TaskTrackerTable({
  tasks,
  canEdit,
  onStatusChange,
  onPriorityChange,
  onDuplicateTask,
  updatingTaskId,
  showAssigneesCol = false,
  emptyMessage = "No tasks found in this section.",
}: TaskTrackerTableProps) {
  const [activeCommentPopover, setActiveCommentPopover] = useState<number | null>(null);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 px-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold text-[12px] leading-[18px] uppercase tracking-wider whitespace-nowrap">
            <th className="py-3 px-4 border-r border-slate-200/90 dark:border-slate-800">PROJECT</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">TYPE</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">PRIORITY</th>
            <th className="py-3 px-4 border-r border-slate-200/90 dark:border-slate-800 min-w-[200px]">SUB PHASE / TASK</th>
            {showAssigneesCol && (
              <th className="py-3 px-4 border-r border-slate-200/90 dark:border-slate-800">ASSIGNEES</th>
            )}
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">PC</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">STATUS</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">START</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">END</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">ACHIEVED</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">COMMENTS</th>
            <th className="py-3 px-3 border-r border-slate-200/90 dark:border-slate-800 text-center">DEV</th>
            <th className="py-3 px-3.5 border-r border-slate-200/90 dark:border-slate-800">SPRINT</th>
            {canEdit && (
              <th className="py-3 px-4 text-right">ACTIONS</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[13px] leading-[18px]">
          {tasks.map((task) => {
            const overdueInfo = getTaskOverdueInfo(task.due_date, task.status, task.actual_completion_date);
            const categoryName = task.catalogTask?.category || task.catalog_task?.category || task.catalogTask?.name || "Task";
            const pcName = task.coordinator
              ? `${task.coordinator.first_name || ""} ${task.coordinator.last_name || ""}`.trim() || "PC"
              : "—";

            const achievedDateStr = task.actual_completion_date || (task.status === "Completed" ? task.updated_at : null);

            return (
              <tr
                key={task.id}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* 1. PROJECT NAME */}
                <td className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800/80 max-w-[200px]">
                  {task.project ? (
                    canEdit ? (
                      <div className="flex items-center justify-between gap-1.5">
                        <Link
                          href={`/project-management/projects/${task.project.id}`}
                          style={{
                            fontFamily: '"Proxima Nova", sans-serif',
                            fontSize: "13px",
                            lineHeight: "18px",
                            fontWeight: 400,
                            color: "rgb(15, 24, 36)",
                          }}
                          className="hover:text-purple-600 dark:!text-slate-200 dark:hover:!text-purple-400 transition-colors flex items-center gap-1.5 truncate"
                          title={task.project.name}
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate">{task.project.name}</span>
                        </Link>
                        {onDuplicateTask && (
                          <button
                            onClick={() => onDuplicateTask(task)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity"
                            title="Duplicate Task"
                          >
                            <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "13px",
                          lineHeight: "18px",
                          fontWeight: 400,
                          color: "rgb(15, 24, 36)",
                        }}
                        className="dark:!text-slate-200 flex items-center gap-1.5 cursor-default select-none truncate"
                        title={task.project.name}
                      >
                        <FolderKanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">{task.project.name}</span>
                      </div>
                    )
                  ) : (
                    <span className="text-slate-400 italic text-[13px] leading-[18px]">Unassigned</span>
                  )}
                </td>

                {/* 2. TYPE */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {categoryName}
                  </span>
                </td>

                {/* 3. PRIORITY */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap">
                  {canEdit && onPriorityChange ? (
                    <div className="inline-flex items-center">
                      <select
                        value={task.priority}
                        disabled={updatingTaskId === task.id}
                        onChange={(e) => onPriorityChange(task.id, e.target.value as TaskPriority)}
                        style={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "12px",
                          lineHeight: "18px",
                          fontWeight: 400,
                        }}
                        className={`px-2.5 py-0.5 rounded-full border text-xs font-normal cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 ${getPriorityBadgeStyle(task.priority)}`}
                      >
                        {TASK_PRIORITIES.map((pr) => (
                          <option key={pr} value={pr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {pr}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <TaskPriorityBadge priority={task.priority} />
                  )}
                </td>

                {/* 4. SUB PHASE / TASK */}
                <td className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800/80">
                  {canEdit ? (
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
                  ) : (
                    <span
                      style={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "13px",
                        lineHeight: "18px",
                        fontWeight: 400,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:!text-slate-100 block line-clamp-1 cursor-default select-none"
                    >
                      {task.title}
                    </span>
                  )}
                  {task.sub_phase && (
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
                      {task.sub_phase.name}
                    </div>
                  )}
                </td>

                {/* Optional Assignees Column (for Flat views) */}
                {showAssigneesCol && (
                  <td className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800/80">
                    {task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.assignees.map((a: any) => {
                          const name = a?.first_name ? `${a.first_name} ${a.last_name || ""}`.trim() : a?.name || "Assignee";
                          const initial = a?.first_name?.[0] || a?.name?.[0] || "?";
                          return (
                            <span
                              key={a?.id || Math.random()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
                            >
                              <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[9px] font-bold flex items-center justify-center">
                                {initial}
                              </span>
                              <span>{name}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                )}

                {/* 5. PC (Project Coordinator) */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs">
                  {pcName}
                </td>

                {/* 6. STATUS (with delay days badge ! 2d if overdue) */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {canEdit && onStatusChange ? (
                      <div className="inline-flex items-center">
                        <select
                          value={task.status}
                          disabled={updatingTaskId === task.id}
                          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                          style={{
                            fontFamily: '"Proxima Nova", sans-serif',
                            fontSize: "12px",
                            lineHeight: "18px",
                            fontWeight: 400,
                          }}
                          className={`px-2.5 py-0.5 rounded-full border text-xs font-normal cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 ${getStatusBadgeStyle(task.status)}`}
                        >
                          {TASK_STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <TaskStatusBadge status={task.status} />
                    )}

                    {/* Delay Days Badge if Overdue */}
                    {overdueInfo.isOverdue && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/60 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{overdueInfo.delayDays}d</span>
                      </span>
                    )}

                    {/* Completed Overdue Badge */}
                    {overdueInfo.isCompletedOverdue && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded" title="Completed past due date">
                        Late
                      </span>
                    )}
                  </div>
                </td>

                {/* 7. START DATE */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap text-slate-600 dark:text-slate-300 text-xs">
                  {formatDateDisplay(task.start_date)}
                </td>

                {/* 8. END DATE (Highlighted red if overdue past 6:30 PM) */}
                <td
                  className={`py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap text-xs ${
                    overdueInfo.isOverdue
                      ? "bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{formatDateDisplay(task.due_date)}</span>
                    {overdueInfo.isOverdue && (
                      <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                    )}
                  </div>
                </td>

                {/* 9. ACHIEVED DATE */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap text-slate-600 dark:text-slate-300 text-xs">
                  {task.status === "Completed" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{formatDateDisplay(achievedDateStr)}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* 10. COMMENTS / UPDATES */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 text-xs max-w-[150px]">
                  {task.current_updates || task.description ? (
                    <div className="relative">
                      <span
                        onClick={() => setActiveCommentPopover(activeCommentPopover === task.id ? null : task.id)}
                        className="truncate block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        title={task.current_updates || task.description || ""}
                      >
                        {task.current_updates || task.description}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </td>

                {/* 11. DEVIATION */}
                <td className="py-3 px-3 border-r border-slate-200/80 dark:border-slate-800/80 text-center whitespace-nowrap text-xs">
                  {task.deviation ? (
                    <span className={`font-semibold ${Number(task.deviation) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {Number(task.deviation) > 0 ? `+${task.deviation}d` : `${task.deviation}d`}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* 12. SPRINT */}
                <td className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800/80 whitespace-nowrap text-xs">
                  {task.sprint ? (
                    task.sprint_link ? (
                      <a
                        href={task.sprint_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        <span>{task.sprint}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{task.sprint}</span>
                    )
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* 13. ACTIONS */}
                {canEdit && (
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/project-management/tasks/${task.id}`}
                      style={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "12px",
                        lineHeight: "18px",
                        fontWeight: 400,
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs border border-slate-200 dark:border-slate-700/60 transition-colors"
                    >
                      <span>Edit</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
