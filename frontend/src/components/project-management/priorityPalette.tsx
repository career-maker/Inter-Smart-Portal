"use client";

import { UiverseSelect } from "@/components/ui/UiverseSelect";

/** Task priority is shown by colour only. Colours come from the portal palette (teal, coral, blue) plus yellow. */
export const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#FE586E", // coral
  High: "#FFCC61", // yellow
  Medium: "#0780B7", // blue
  Low: "#00BDA1", // teal
};

export const PRIORITY_ORDER = ["Critical", "High", "Medium", "Low"];

/** Status colours for the status dropdown: palette colours first, then a few extras. */
export const STATUS_COLORS: Record<string, string> = {
  "Yet to Start": "#85858F",
  "Being Developed": "#0780B7",
  "Ready for QA": "#FFCC61",
  "Assigned to QA": "#8B6CF6",
  "In Progress": "#276BFA",
  Completed: "#00BDA1",
  "On Hold": "#FE586E",
  Forecast: "#7C8DB5",
  Rejected: "#C2334D",
  Cancelled: "#A1A1AA",
};

export function PriorityDot({ priority, size = 14 }: { priority: string; size?: number }) {
  const c = PRIORITY_COLORS[priority] || "#A1A1AA";
  return <span title={`Priority: ${priority}`} aria-label={`Priority: ${priority}`} className="inline-block rounded-full align-middle" style={{ width: size, height: size, backgroundColor: c }} />;
}

/** Info strip shown above task tables: which colour means which priority. */
export function PriorityLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-1 text-xs ${className}`}>
      <span style={{ color: "var(--portal-secondary-text, #52525B)" }}>Priority</span>
      {PRIORITY_ORDER.map((p) => (
        <span key={p} className="inline-flex items-center gap-2" style={{ color: "var(--portal-secondary-text, #52525B)" }}>
          <PriorityDot priority={p} size={8} />{p}
        </span>
      ))}
    </div>
  );
}

export const TASK_STATUS_LIST = ["Yet to Start", "Being Developed", "Ready for QA", "Assigned to QA", "In Progress", "On Hold", "Completed", "Forecast", "Rejected", "Cancelled"];

/** The one status dropdown for tasks: pill trigger, a coloured dot per status. Use it wherever task statuses are picked. */
export function TaskStatusSelect({ value, onChange, disabled, statuses = TASK_STATUS_LIST, className = "" }: { value: string; onChange: (v: string) => void; disabled?: boolean; statuses?: readonly string[]; className?: string }) {
  return (
    <UiverseSelect
      value={value}
      disabled={disabled}
      onChange={(v) => onChange(String(v))}
      size="sm"
      className={className}
      triggerClassName="!rounded-full !px-3 font-semibold"
      options={statuses.map((st) => ({ value: st, label: <span className="inline-flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[st] || "#A1A1AA" }} />{st}</span> }))}
    />
  );
}

/** The one priority dropdown: coloured dot, with the name too when showLabel is set (forms). */
export function TaskPrioritySelect({ value, onChange, disabled, showLabel = false, priorities = PRIORITY_ORDER, className = "" }: { value: string; onChange: (v: string) => void; disabled?: boolean; showLabel?: boolean; priorities?: readonly string[]; className?: string }) {
  return (
    <UiverseSelect
      value={value}
      disabled={disabled}
      onChange={(v) => onChange(String(v))}
      size="sm"
      className={className}
      triggerClassName={showLabel ? "!px-3" : "!px-2 !min-h-[28px] justify-center"}
      options={priorities.map((pr) => ({ value: pr, label: <span className="inline-flex items-center gap-2"><PriorityDot priority={pr} size={12} />{showLabel ? pr : <span className="sr-only">{pr}</span>}</span> }))}
    />
  );
}
