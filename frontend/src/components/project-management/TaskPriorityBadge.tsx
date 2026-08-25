"use client";

import { TaskPriority } from "@/types/pm";

interface TaskPriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
}

export function TaskPriorityBadge({ priority, className = "" }: TaskPriorityBadgeProps) {
  let badgeStyle = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";

  switch (priority) {
    case "Low":
      badgeStyle = "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      break;
    case "Medium":
      badgeStyle = "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
      break;
    case "High":
      badgeStyle = "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60";
      break;
    case "Critical":
      badgeStyle = "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 font-bold";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle} ${className}`}
    >
      {priority}
    </span>
  );
}
