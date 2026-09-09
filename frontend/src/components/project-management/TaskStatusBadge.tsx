"use client";

import { TaskStatus } from "@/types/pm";

interface TaskStatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
}

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  let badgeClass = "task-status-yet-to-start";
  let dotStyle = "bg-slate-400";

  switch (status) {
    case "Yet to Start":
      badgeClass = "task-status-yet-to-start";
      dotStyle = "bg-slate-400";
      break;
    case "Being Developed":
      badgeClass = "task-status-being-developed";
      dotStyle = "bg-indigo-500 animate-pulse";
      break;
    case "Ready for QA":
      badgeClass = "task-status-ready-for-qa";
      dotStyle = "bg-amber-500";
      break;
    case "Assigned to QA":
      badgeClass = "task-status-assigned-to-qa";
      dotStyle = "bg-purple-500";
      break;
    case "In Progress":
      badgeClass = "task-status-in-progress";
      dotStyle = "bg-blue-500 animate-pulse";
      break;
    case "On Hold":
      badgeClass = "task-status-on-hold";
      dotStyle = "bg-rose-500";
      break;
    case "Completed":
      badgeClass = "task-status-completed";
      dotStyle = "bg-emerald-500";
      break;
    case "Forecast":
      badgeClass = "task-status-forecast";
      dotStyle = "bg-cyan-500";
      break;
    case "Rejected":
      badgeClass = "task-status-rejected";
      dotStyle = "bg-red-500";
      break;
    case "Cancelled":
      badgeClass = "task-status-cancelled";
      dotStyle = "bg-zinc-400";
      break;
    default:
      badgeClass = "task-status-yet-to-start";
      dotStyle = "bg-slate-400";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
      <span>{status}</span>
    </span>
  );
}
