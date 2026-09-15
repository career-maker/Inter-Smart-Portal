"use client";

import { TaskPriority } from "@/types/pm";

interface TaskPriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
  compact?: boolean;
}

export function TaskPriorityBadge({ priority, className = "", compact = false }: TaskPriorityBadgeProps) {
  let badgeStyle = "task-priority-low font-extrabold";

  switch (priority) {
    case "Critical":
      badgeStyle = "task-priority-critical font-extrabold";
      break;
    case "High":
      badgeStyle = "task-priority-high font-extrabold";
      break;
    case "Medium":
      badgeStyle = "task-priority-medium font-extrabold";
      break;
    case "Low":
    default:
      badgeStyle = "task-priority-low font-extrabold";
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
