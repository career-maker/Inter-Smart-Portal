import * as React from "react";

const TONES = {
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
} as const;

/** Status only (Active, Overdue...). Never for counts or labels. */
export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
