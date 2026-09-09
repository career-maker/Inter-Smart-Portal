"use client";

import React, { useState, useMemo } from "react";
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
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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

export type SortField =
  | "project"
  | "priority"
  | "task"
  | "assignees"
  | "pc"
  | "status"
  | "start_date"
  | "due_date"
  | "achieved"
  | "comments"
  | "dev"
  | "sprint";

export type SortDirection = "asc" | "desc";

const PRIORITY_WEIGHTS: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const STATUS_WEIGHTS: Record<string, number> = {
  "Yet to Start": 1,
  "Being Developed": 2,
  "Ready for QA": 3,
  "Assigned to QA": 4,
  "In Progress": 5,
  "On Hold": 6,
  "Forecast": 7,
  "Completed": 8,
  "Rejected": 9,
  "Cancelled": 10,
};

function getTaskStatusClass(status: TaskStatus | string): string {
  switch (status) {
    case "Yet to Start":
      return "task-status-yet-to-start";
    case "Being Developed":
      return "task-status-being-developed";
    case "Ready for QA":
      return "task-status-ready-for-qa";
    case "Assigned to QA":
      return "task-status-assigned-to-qa";
    case "In Progress":
      return "task-status-in-progress";
    case "On Hold":
      return "task-status-on-hold";
    case "Completed":
      return "task-status-completed";
    case "Forecast":
      return "task-status-forecast";
    case "Rejected":
      return "task-status-rejected";
    case "Cancelled":
      return "task-status-cancelled";
    default:
      return "task-status-yet-to-start";
  }
}

function getTaskPriorityClass(priority: TaskPriority | string): string {
  switch (priority) {
    case "Critical":
      return "task-priority-critical";
    case "High":
      return "task-priority-high";
    case "Medium":
      return "task-priority-medium";
    case "Low":
    default:
      return "task-priority-low";
  }
}

interface TaskTrackerTableProps {
  tasks: ProjectTask[];
  canEdit: boolean;
  onStatusChange?: (taskId: number, newStatus: TaskStatus) => Promise<void>;
  onPriorityChange?: (taskId: number, newPriority: TaskPriority) => Promise<void>;
  onDateChange?: (taskId: number, field: "start_date" | "due_date" | "actual_completion_date", newDate: string | null) => Promise<void>;
  onDuplicateTask?: (task: ProjectTask) => void;
  updatingTaskId?: number | null;
  showAssigneesCol?: boolean;
  emptyMessage?: string;
  pageSize?: number;
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

function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  try {
    return dateStr.split("T")[0];
  } catch {
    return "";
  }
}

function TableDateCell({
  value,
  field,
  taskId,
  disabled,
  onDateChange,
  isOverdue = false,
  isCompleted = false,
  emptyPlaceholder = "—",
}: {
  value: string | null | undefined;
  field: "start_date" | "due_date" | "actual_completion_date";
  taskId: number;
  disabled?: boolean;
  onDateChange?: (taskId: number, field: "start_date" | "due_date" | "actual_completion_date", newDate: string | null) => Promise<void>;
  isOverdue?: boolean;
  isCompleted?: boolean;
  emptyPlaceholder?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (disabled || !onDateChange) return;
    if (inputRef.current) {
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
        }
      } catch {
        inputRef.current.focus();
      }
    }
  };

  if (!onDateChange) {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>{formatDateDisplay(value)}</span>
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <span className={isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : ""}>
          {value ? formatDateDisplay(value) : emptyPlaceholder}
        </span>
        {isOverdue && <Clock className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
      </div>
    );
  }

  return (
    <div
      onClick={openPicker}
      className="relative group/date inline-flex items-center gap-1 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 py-0.5 px-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all select-none"
      title="Click to open calendar date picker"
    >
      <input
        ref={inputRef}
        type="date"
        value={toDateInputValue(value)}
        disabled={disabled}
        onChange={(e) => {
          onDateChange(taskId, field, e.target.value || null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          try {
            if ("showPicker" in HTMLInputElement.prototype) {
              e.currentTarget.showPicker();
            }
          } catch {}
        }}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
      />
      {isCompleted ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium group-hover/date:underline">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>{formatDateDisplay(value)}</span>
        </span>
      ) : (
        <span className={isOverdue ? "text-rose-600 dark:text-rose-400 font-bold group-hover/date:underline" : "group-hover/date:underline"}>
          {value ? formatDateDisplay(value) : <span className="text-slate-400 font-normal">{emptyPlaceholder}</span>}
        </span>
      )}
      {isOverdue ? (
        <Clock className="w-2.5 h-2.5 text-rose-500 shrink-0" />
      ) : (
        <Calendar className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover/date:opacity-100 group-hover/date:text-purple-600 transition-opacity shrink-0" />
      )}
    </div>
  );
}

export function TaskTrackerTable({
  tasks,
  canEdit,
  onStatusChange,
  onPriorityChange,
  onDateChange,
  onDuplicateTask,
  updatingTaskId,
  showAssigneesCol = false,
  emptyMessage = "No tasks found in this section.",
  pageSize = 20,
}: TaskTrackerTableProps) {
  const [activeCommentPopover, setActiveCommentPopover] = useState<number | null>(null);
  const [tablePage, setTablePage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setTablePage(1);
  };

  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks;

    const getFieldValue = (t: ProjectTask, field: SortField): string | number => {
      switch (field) {
        case "project":
          return (t.project?.name || "").toLowerCase();
        case "priority":
          return PRIORITY_WEIGHTS[t.priority] || 0;
        case "task":
          return (t.title || "").toLowerCase();
        case "assignees":
          if (t.assignees && t.assignees.length > 0) {
            const first = t.assignees[0];
            return `${first.first_name || ""} ${first.last_name || ""}`.trim().toLowerCase();
          }
          return "";
        case "pc":
          if (t.coordinator) {
            return `${t.coordinator.first_name || ""} ${t.coordinator.last_name || ""}`.trim().toLowerCase();
          }
          return "";
        case "status":
          return STATUS_WEIGHTS[t.status] || (t.status || "").toLowerCase();
        case "start_date":
          return t.start_date ? new Date(t.start_date).getTime() : 0;
        case "due_date":
          return t.due_date ? new Date(t.due_date).getTime() : 0;
        case "achieved": {
          const d = t.actual_completion_date || (t.status === "Completed" ? t.updated_at : null);
          return d ? new Date(d).getTime() : 0;
        }
        case "comments":
          return (t.current_updates || t.description || "").toLowerCase();
        case "dev":
          return Number(t.deviation || 0);
        case "sprint":
          return (t.sprint || "").toLowerCase();
        default:
          return "";
      }
    };

    const copy = [...tasks];
    copy.sort((a, b) => {
      const valA = getFieldValue(a, sortField);
      const valB = getFieldValue(b, sortField);

      if (typeof valA === "number" && typeof valB === "number") {
        if (valA === 0 && valB !== 0) return 1;
        if (valB === 0 && valA !== 0) return -1;
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      if (!strA && strB) return 1;
      if (!strB && strA) return -1;

      const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return copy;
  }, [tasks, sortField, sortDirection]);

  const perPage = pageSize;
  const totalPages = Math.ceil(sortedTasks.length / perPage);
  const visibleTasks = sortedTasks.slice((tablePage - 1) * perPage, tablePage * perPage);

  React.useEffect(() => {
    if (tablePage > totalPages && totalPages > 0) {
      setTablePage(1);
    }
  }, [sortedTasks.length, totalPages, tablePage]);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
        {emptyMessage}
      </div>
    );
  }

  const renderSortHeader = (
    field: SortField,
    label: string,
    align: "left" | "center" | "right" = "left",
    extraClass = ""
  ) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        style={{
          fontFamily: '"Proxima Nova", sans-serif',
          fontStyle: "normal",
          fontWeight: 600,
          fontSize: "12px",
          lineHeight: "18px",
        }}
        className={`py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer select-none transition-colors hover:bg-slate-100/90 dark:hover:bg-slate-800/80 group/th task-col-title ${
          isActive
            ? "text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/30 font-bold"
            : "text-slate-800 dark:!text-slate-200"
        } ${extraClass}`}
        title={`Sort by ${label} (${
          isActive
            ? sortDirection === "asc"
              ? "Ascending - click for Descending"
              : "Descending - click to clear"
            : "click to sort"
        })`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            align === "center"
              ? "justify-center"
              : align === "right"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          {field === "priority" ? (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 shadow-2xs">
              {label}
            </span>
          ) : field === "status" ? (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700 shadow-2xs">
              {label}
            </span>
          ) : (
            <span>{label}</span>
          )}
          <span className="inline-flex shrink-0">
            {isActive ? (
              sortDirection === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 stroke-[2.5]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 stroke-[2.5]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400/50 group-hover/th:text-slate-600 dark:group-hover/th:text-slate-300 transition-colors" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="w-full flex flex-col">
      <div className="w-full overflow-x-auto table-scrollbar">
        <table className="w-full text-left border-collapse task-tracker-table">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 whitespace-nowrap task-table-header">
              {renderSortHeader("project", "PROJECT", "left", "px-3")}
              {renderSortHeader("priority", "PTY", "center", "w-[108px] min-w-[108px]")}
              {renderSortHeader("task", "SUB PHASE / TASK", "left", "px-3")}
              {showAssigneesCol && renderSortHeader("assignees", "ASSIGNEES", "left", "px-3")}
              {renderSortHeader("pc", "PC", "left")}
              {renderSortHeader("status", "STATUS", "left")}
              {renderSortHeader("start_date", "START", "left")}
              {renderSortHeader("due_date", "END", "left")}
              {renderSortHeader("achieved", "ACHIEVED", "left")}
              {renderSortHeader("comments", "COMMENTS", "left")}
              {renderSortHeader("dev", "DEV", "center")}
              {renderSortHeader("sprint", "SPRINT", "left")}
              {canEdit && (
                <th
                  style={{
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontStyle: "normal",
                    fontWeight: 600,
                    fontSize: "12px",
                    lineHeight: "18px",
                  }}
                  className="py-2.5 px-3 text-right text-slate-800 dark:!text-slate-200 task-col-title"
                >
                  ACTIONS
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {visibleTasks.map((task) => {
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
                  <td className="py-2 px-1 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-center w-[108px] min-w-[108px]">
                    {canEdit && onPriorityChange ? (
                      <div className="inline-flex items-center justify-center">
                        <select
                          value={task.priority}
                          disabled={updatingTaskId === task.id}
                          onChange={(e) => onPriorityChange(task.id, e.target.value as TaskPriority)}
                          title={`Priority: ${task.priority}`}
                          className={`task-priority-select ${getTaskPriorityClass(task.priority)} disabled:opacity-50`}
                        >
                          {TASK_PRIORITIES.map((pr) => (
                            <option key={pr} value={pr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold py-1">
                              {pr}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <TaskPriorityBadge priority={task.priority} />
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
                          title={`Status: ${task.status}`}
                          className={`task-status-select ${getTaskStatusClass(task.status)} disabled:opacity-50`}
                        >
                          {TASK_STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium py-1">
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
                  <TableDateCell
                    value={task.start_date}
                    field="start_date"
                    taskId={task.id}
                    disabled={updatingTaskId === task.id}
                    onDateChange={canEdit ? onDateChange : undefined}
                  />
                </td>

                {/* 7. END DATE (Highlighted red if overdue past 6:30 PM) */}
                <td
                  className={`py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-[11px] ${
                    overdueInfo.isOverdue
                      ? "bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <TableDateCell
                    value={task.due_date}
                    field="due_date"
                    taskId={task.id}
                    disabled={updatingTaskId === task.id}
                    onDateChange={canEdit ? onDateChange : undefined}
                    isOverdue={overdueInfo.isOverdue}
                  />
                </td>

                {/* 8. ACHIEVED DATE */}
                <td className="py-2 px-2.5 border-r border-slate-200/70 dark:border-slate-800/70 whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">
                  <TableDateCell
                    value={achievedDateStr}
                    field="actual_completion_date"
                    taskId={task.id}
                    disabled={updatingTaskId === task.id}
                    onDateChange={canEdit ? onDateChange : undefined}
                    isCompleted={task.status === "Completed"}
                  />
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

      {/* ── Per-Table Pagination Footer (20 tasks per page) ── */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/75 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{(tablePage - 1) * perPage + 1}</strong>–<strong className="text-slate-800 dark:text-slate-200">{Math.min(tablePage * perPage, tasks.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{tasks.length}</strong> tasks
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              disabled={tablePage <= 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - tablePage) <= 2)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                      <button
                        type="button"
                        onClick={() => setTablePage(p)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          tablePage === p
                            ? "bg-[#56348f] text-white shadow-xs"
                            : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
              disabled={tablePage >= totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
