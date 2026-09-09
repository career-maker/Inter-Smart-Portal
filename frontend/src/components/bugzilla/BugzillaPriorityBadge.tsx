import React from "react";
import { BugzillaPriority } from "@/types/bugzilla";

interface Props {
  priority: BugzillaPriority | string;
  className?: string;
}

export function BugzillaPriorityBadge({ priority, className = "" }: Props) {
  const p = (priority || "").toUpperCase();

  let colors = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  switch (p) {
    case "P1":
      colors = "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
      break;
    case "P2":
      colors = "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
      break;
    case "P3":
      colors = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
      break;
    case "P4":
      colors = "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800";
      break;
    case "P5":
      colors = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono border ${colors} ${className}`}
    >
      {p}
    </span>
  );
}
