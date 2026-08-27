"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  FolderKanban,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Copy,
  Clock,
  CheckCircle2,
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
      <div className="py-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto table-scrollbar">
      <table className="w-full text-left border-collapse task-tracker-table">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 whitespace-nowrap task-table-header">
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">PROJECT</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-1.5 border-r border-slate-200/80 dark:border-slate-800 text-center dark:!text-white task-col-title w-10">Pty</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">SUB PHASE / TASK</th>
            {showAssigneesCol && (
              <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">ASSIGNEES</th>
            )}
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">PC</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">STATUS</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">START</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">END</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">ACHIEVED</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">COMMENTS</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2 border-r border-slate-200/80 dark:border-slate-800 text-center dark:!text-white task-col-title">DEV</th>
            <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 dark:!text-white task-col-title">SPRINT</th>
            {canEdit && (
              <th style={{ fontFamily: '"Proxima Nova", sans-serif', fontStyle: 'normal', fontWeight: 400, color: 'black', fontSize: '13px', lineHeight: '20px' }} className="py-2.5 px-3 text-right dark:!text-white task-col-title">ACTIONS</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {tasks.map((task) => {
            const overdueInfo = getTaskOverdueInfo(task.due_date, task.status, task.actual_completion_date);
            const pcName = task.coordinator
              ? `${task.coordinator.first_name || ""} ${task.coordinator.last_name || ""}`.trim() || "PC"
              : "—";

            const achievedDateStr = task.actual_completion_date || (task.status === "Completed" ? task.updated_at : null);

            return (
              <tr
                key={task.id}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* 1. PROJECT NAME */}
                <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 max-w-[140px]">
                  {task.project ? (
                    canEdit ? (
                      <div className="flex items-center justify-between gap-1">
                        <Link
                          href={`/project-management/projects/${task.project.id}`}
                          style={{
                            fontFamily: '"Proxima Nova", sans-serif',
                            fontSize: "12px",
                            lineHeight: "16px",
                            fontWeight: 400,
                            color: "rgb(15, 24, 36)",
                          }}
                          className="hover:text-purple-600 dark:!text-slate-200 dark:hover:!text-purple-400 transition-colors flex items-center gap-1 truncate"
                          title={task.project.name}
                        >
                          <FolderKanban className="w-3 h-3 text-purple-500 shrink-0" />
                          <span className="truncate">{task.project.name}</span>
                        </Link>
                        {onDuplicateTask && (
                          <button
                            onClick={() => onDuplicateTask(task)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity"
                            title="Duplicate Task"
                          >
                            <Copy className="w-2.5 h-2.5 text-slate-400 hover:text-slate-600" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "12px",
                          lineHeight: "16px",
                          fontWeight: 400,
                          color: "rgb(15, 24, 36)",
                        }}
                        className="dark:!text-slate-200 flex items-center gap-1 cursor-default select-none truncate"
                        title={task.project.name}
                      >
                        <FolderKanban className="w-3 h-3 text-purple-500 shrink-0" />
                        <span className="truncate">{task.project.name}</span>
                      </div>
                    )
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                  )}
                </td>

                {/* 2. PRIORITY (Pty) */}
                <td className="py-2 px-1.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-center">
                  {canEdit && onPriorityChange ? (
                    <div className="inline-flex items-center justify-center">
                      <select
                        value={task.priority}
                        disabled={updatingTaskId === task.id}
                        onChange={(e) => onPriorityChange(task.id, e.target.value as TaskPriority)}
                        title={`Priority: ${task.priority}`}
                        style={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "11px",
                          lineHeight: "16px",
                          fontWeight: 600,
                        }}
                        className={`w-7 h-5 px-0 text-center [text-align-last:center] rounded border text-[11px] font-bold cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 appearance-none inline-flex items-center justify-center ${getPriorityBadgeStyle(task.priority)}`}
                      >
                        {TASK_PRIORITIES.map((pr) => (
                          <option key={pr} value={pr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold">
                            {pr.charAt(0)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <TaskPriorityBadge priority={task.priority} compact />
                  )}
                </td>

                {/* 3. SUB PHASE / TASK */}
                <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 max-w-[170px]">
                  {canEdit ? (
                    <Link
                      href={`/project-management/tasks/${task.id}`}
                      style={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "12px",
                        lineHeight: "16px",
                        fontWeight: 400,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="hover:text-purple-600 dark:!text-slate-100 dark:hover:!text-purple-400 transition-colors block truncate"
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                  ) : (
                    <span
                      style={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "12px",
                        lineHeight: "16px",
                        fontWeight: 400,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:!text-slate-100 block truncate cursor-default select-none"
                      title={task.title}
                    >
                      {task.title}
                    </span>
                  )}
                  {task.sub_phase && (
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
                      {task.sub_phase.name}
                    </div>
                  )}
                </td>

                {/* Optional Assignees Column (for Flat views) */}
                {showAssigneesCol && (
                  <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 max-w-[130px]">
                    {task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.assignees.map((a: any) => {
                          const name = a?.first_name ? `${a.first_name} ${a.last_name || ""}`.trim() : a?.name || "Assignee";
                          const initial = a?.first_name?.[0] || a?.name?.[0] || "?";
                          return (
                            <span
                              key={a?.id || Math.random()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300"
                            >
                              <span className="w-3 h-3 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[8px] font-bold flex items-center justify-center">
                                {initial}
                              </span>
                              <span className="truncate max-w-[70px]">{name}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                )}

                {/* 4. PC (Project Coordinator) */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px] max-w-[80px] truncate" title={pcName}>
                  {pcName}
                </td>

                {/* 5. STATUS (with delay days badge ! 2d if overdue) */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {canEdit && onStatusChange ? (
                      <div className="inline-flex items-center">
                        <select
                          value={task.status}
                          disabled={updatingTaskId === task.id}
                          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                          style={{
                            fontFamily: '"Proxima Nova", sans-serif',
                            fontSize: "11px",
                            lineHeight: "16px",
                            fontWeight: 400,
                          }}
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-normal cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 ${getStatusBadgeStyle(task.status)}`}
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
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/60 px-1 py-0.5 rounded">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{overdueInfo.delayDays}d</span>
                      </span>
                    )}

                    {/* Completed Overdue Badge */}
                    {overdueInfo.isCompletedOverdue && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1 py-0.5 rounded" title="Completed past due date">
                        Late
                      </span>
                    )}
                  </div>
                </td>

                {/* 6. START DATE */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">
                  {formatDateDisplay(task.start_date)}
                </td>

                {/* 7. END DATE (Highlighted red if overdue past 6:30 PM) */}
                <td
                  className={`py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-[11px] ${
                    overdueInfo.isOverdue
                      ? "bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{formatDateDisplay(task.due_date)}</span>
                    {overdueInfo.isOverdue && (
                      <Clock className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                    )}
                  </div>
                </td>

                {/* 8. ACHIEVED DATE */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">
                  {task.status === "Completed" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{formatDateDisplay(achievedDateStr)}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* 9. COMMENTS / UPDATES */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 text-[11px] max-w-[110px]">
                  {task.current_updates || task.description ? (
                    <span
                      onClick={() => setActiveCommentPopover(activeCommentPopover === task.id ? null : task.id)}
                      className="truncate block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title={task.current_updates || task.description || ""}
                    >
                      {task.current_updates || task.description}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </td>

                {/* 10. DEVIATION */}
                <td className="py-2 px-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center whitespace-nowrap text-[11px]">
                  {task.deviation ? (
                    <span className={`font-semibold ${Number(task.deviation) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {Number(task.deviation) > 0 ? `+${task.deviation}d` : `${task.deviation}d`}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* 11. SPRINT */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-[11px] max-w-[90px]">
                  {task.sprint ? (
                    task.sprint_link ? (
                      <a
                        href={task.sprint_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline truncate"
                        title={task.sprint}
                      >
                        <span className="truncate">{task.sprint}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400 truncate block" title={task.sprint}>{task.sprint}</span>
                    )
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* 12. ACTIONS */}
                {canEdit && (
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <Link
                      href={`/project-management/tasks/${task.id}`}
                      style={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "11px",
                        lineHeight: "16px",
                        fontWeight: 400,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-[11px] border border-slate-200 dark:border-slate-700/60 transition-colors"
                    >
                      <span>Edit</span>
                      <ChevronRight className="w-2.5 h-2.5" />
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
