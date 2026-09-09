import React from "react";
import { BugzillaStatus } from "@/types/bugzilla";

interface Props {
  status: BugzillaStatus | string;
  className?: string;
  size?: "sm" | "md";
}

export function BugzillaStatusBadge({ status, className = "", size = "md" }: Props) {
  const s = (status || "").toUpperCase();

  let colors = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  switch (s) {
    case "NEW":
    case "UNCONFIRMED":
      colors = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
      break;
    case "ASSIGNED":
      colors = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
      break;
    case "IN PROGRESS":
      colors = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      break;
    case "RESOLVED":
      colors = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      break;
    case "VERIFIED":
      colors = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800";
      break;
    case "CLOSED":
      colors = "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      break;
    case "REOPENED":
      colors = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      break;
  }

  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide uppercase ${sizeClasses} ${colors} ${className}`}
    >
      {s.replace("_", " ")}
    </span>
  );
}
