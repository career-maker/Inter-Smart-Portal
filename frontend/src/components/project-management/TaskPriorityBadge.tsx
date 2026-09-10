"use client";

import { TaskPriority } from "@/types/pm";

interface TaskPriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
  compact?: boolean;
}

export function TaskPriorityBadge({ priority, className = "", compact = false }: TaskPriorityBadgeProps) {
  let badgeStyle = "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-emerald-700 font-extrabold";

  switch (priority) {
    case "Critical":
      badgeStyle = "task-priority-critical !bg-rose-100 !text-rose-900 !border-rose-400 dark:!bg-rose-950/80 dark:!text-rose-100 dark:!border-rose-600 font-extrabold";
      break;
    case "High":
      badgeStyle = "task-priority-high !bg-orange-100 !text-orange-950 !border-orange-500 dark:!bg-orange-950/80 dark:!text-orange-100 dark:!border-orange-600 font-extrabold";
      break;
    case "Medium":
      badgeStyle = "task-priority-medium !bg-amber-100 !text-amber-950 !border-amber-500 dark:!bg-amber-950/80 dark:!text-amber-100 dark:!border-amber-600 font-extrabold";
      break;
    case "Low":
    default:
      badgeStyle = "task-priority-low !bg-emerald-100 !text-emerald-950 !border-emerald-500 dark:!bg-emerald-950/80 dark:!text-emerald-100 dark:!border-emerald-600 font-extrabold";
      break;
  }

  const label = compact ? (priority ? priority.charAt(0) : "—") : priority;

  return (
    <span
      title={`Priority: ${priority}`}
      className={`inline-flex items-center justify-center ${
        compact ? "w-6 h-5 px-0 text-center font-bold" : "min-w-[85px] px-2.5 py-0.5"
      } rounded text-[11.5px] border ${badgeStyle} ${className}`}
    >
      {label}
    </span>
  );
}
