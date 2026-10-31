"use client";

import { TaskPriority } from "@/types/pm";
import { PriorityDot } from "@/components/project-management/priorityPalette";

interface TaskPriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
  compact?: boolean;
}

/** Priority is a colour only; the legend above the tables says which colour is which. */
export function TaskPriorityBadge({ priority, className = "" }: TaskPriorityBadgeProps) {
  return <span className={`inline-flex items-center justify-center ${className}`}><PriorityDot priority={String(priority || "")} /></span>;
}
