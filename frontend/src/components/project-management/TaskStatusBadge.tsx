"use client";

import { TaskStatus } from "@/types/pm";

interface TaskStatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
}

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  let badgeStyle = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  let dotStyle = "bg-slate-400";

  switch (status) {
    case "Yet to Start":
      badgeStyle = "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      dotStyle = "bg-slate-400";
      break;
    case "Being Developed":
      badgeStyle = "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60";
      dotStyle = "bg-indigo-500 animate-pulse";
      break;
    case "Ready for QA":
      badgeStyle = "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
      dotStyle = "bg-amber-500";
      break;
    case "Assigned to QA":
      badgeStyle = "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60";
      dotStyle = "bg-purple-500";
      break;
    case "In Progress":
      badgeStyle = "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60";
      dotStyle = "bg-blue-500 animate-pulse";
      break;
    case "On Hold":
      badgeStyle = "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60";
      dotStyle = "bg-rose-500";
      break;
    case "Completed":
      badgeStyle = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
      dotStyle = "bg-emerald-500";
      break;
    case "Forecast":
      badgeStyle = "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60";
      dotStyle = "bg-cyan-500";
      break;
    case "Rejected":
      badgeStyle = "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60";
      dotStyle = "bg-red-500";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
      <span>{status}</span>
    </span>
  );
}
