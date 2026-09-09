"use client";

import { TaskPriority } from "@/types/pm";

interface TaskPriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
  compact?: boolean;
}

export function TaskPriorityBadge({ priority, className = "", compact = false }: TaskPriorityBadgeProps) {
  let badgeStyle = "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-700 font-medium";

  switch (priority) {
    case "Critical":
      badgeStyle = "task-priority-critical !bg-rose-100 !text-rose-800 !border-rose-400 dark:!bg-rose-950/70 dark:!text-rose-300 dark:!border-rose-700 font-bold";
      break;
    case "High":
      badgeStyle = "task-priority-high !bg-orange-100 !text-orange-800 !border-orange-400 dark:!bg-orange-950/70 dark:!text-orange-300 dark:!border-orange-700 font-bold";
      break;
    case "Medium":
      badgeStyle = "task-priority-medium !bg-yellow-100 !text-yellow-800 !border-yellow-400 dark:!bg-amber-950/70 dark:!text-amber-300 dark:!border-amber-700 font-semibold";
      break;
    case "Low":
    default:
      badgeStyle = "task-priority-low !bg-teal-50 !text-teal-800 !border-teal-400 dark:!bg-teal-950/70 dark:!text-teal-300 dark:!border-teal-700 font-medium";
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
