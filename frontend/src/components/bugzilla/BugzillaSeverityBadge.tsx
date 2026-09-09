import React from "react";
import { BugzillaSeverity } from "@/types/bugzilla";
import { AlertOctagon, AlertTriangle, AlertCircle, Info, Circle } from "lucide-react";

interface Props {
  severity: BugzillaSeverity | string;
  className?: string;
  showIcon?: boolean;
}

export function BugzillaSeverityBadge({ severity, className = "", showIcon = true }: Props) {
  const s = (severity || "").toUpperCase();

  let colors = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  let icon = <Info className="w-3 h-3" />;

  switch (s) {
    case "BLOCKER":
      colors = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800";
      icon = <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />;
      break;
    case "CRITICAL":
      colors = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      icon = <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />;
      break;
    case "MAJOR":
      colors = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800";
      icon = <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />;
      break;
    case "NORMAL":
      colors = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      icon = <Circle className="w-2.5 h-2.5 text-slate-500" />;
      break;
    case "MINOR":
      colors = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      icon = <Circle className="w-2.5 h-2.5 text-emerald-500" />;
      break;
    case "TRIVIAL":
      colors = "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
      icon = <Circle className="w-2 h-2 text-zinc-400" />;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${colors} ${className}`}
    >
      {showIcon && icon}
      <span>{s}</span>
    </span>
  );
}
