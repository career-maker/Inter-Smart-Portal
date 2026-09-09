"use client";

import { TaskStatus } from "@/types/pm";

interface TaskStatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
}

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  let badgeClass = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600";
  let dotStyle = "bg-slate-400";

  switch (status) {
    case "Yet to Start":
      badgeClass = "task-status-yet-to-start !bg-slate-100 !text-slate-700 !border-slate-300 dark:!bg-slate-800 dark:!text-slate-300 dark:!border-slate-600";
      dotStyle = "bg-slate-400";
      break;
    case "Being Developed":
      badgeClass = "task-status-being-developed !bg-indigo-100 !text-indigo-800 !border-indigo-300 dark:!bg-indigo-950/70 dark:!text-indigo-300 dark:!border-indigo-700";
      dotStyle = "bg-indigo-500 animate-pulse";
      break;
    case "Ready for QA":
      badgeClass = "task-status-ready-for-qa !bg-amber-100 !text-amber-800 !border-amber-300 dark:!bg-amber-950/70 dark:!text-amber-300 dark:!border-amber-700";
      dotStyle = "bg-amber-500";
      break;
    case "Assigned to QA":
      badgeClass = "task-status-assigned-to-qa !bg-purple-100 !text-purple-800 !border-purple-300 dark:!bg-purple-950/70 dark:!text-purple-300 dark:!border-purple-700";
      dotStyle = "bg-purple-500";
      break;
    case "In Progress":
      badgeClass = "task-status-in-progress !bg-blue-100 !text-blue-800 !border-blue-300 dark:!bg-blue-950/70 dark:!text-blue-300 dark:!border-blue-700";
      dotStyle = "bg-blue-500 animate-pulse";
      break;
    case "On Hold":
      badgeClass = "task-status-on-hold !bg-rose-100 !text-rose-800 !border-rose-300 dark:!bg-rose-950/70 dark:!text-rose-300 dark:!border-rose-700";
      dotStyle = "bg-rose-500";
      break;
    case "Completed":
      badgeClass = "task-status-completed !bg-emerald-100 !text-emerald-800 !border-emerald-300 dark:!bg-emerald-950/70 dark:!text-emerald-300 dark:!border-emerald-700";
      dotStyle = "bg-emerald-500";
      break;
    case "Forecast":
      badgeClass = "task-status-forecast !bg-cyan-100 !text-cyan-800 !border-cyan-300 dark:!bg-cyan-950/70 dark:!text-cyan-300 dark:!border-cyan-700";
      dotStyle = "bg-cyan-500";
      break;
    case "Rejected":
      badgeClass = "task-status-rejected !bg-red-100 !text-red-800 !border-red-300 dark:!bg-red-950/70 dark:!text-red-300 dark:!border-red-700";
      dotStyle = "bg-red-500";
      break;
    case "Cancelled":
      badgeClass = "task-status-cancelled !bg-zinc-100 !text-zinc-600 !border-zinc-300 dark:!bg-zinc-800 dark:!text-zinc-400 dark:!border-zinc-700";
      dotStyle = "bg-zinc-400";
      break;
    default:
      badgeClass = "task-status-yet-to-start !bg-slate-100 !text-slate-700 !border-slate-300 dark:!bg-slate-800 dark:!text-slate-300 dark:!border-slate-600";
      dotStyle = "bg-slate-400";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
      <span>{status}</span>
    </span>
  );
}
