"use client";

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
  return <span title={`Priority: ${priority}`} aria-label={`Priority: ${priority}`} className="inline-block rounded-full align-middle shadow-sm" style={{ width: size, height: size, backgroundColor: c, boxShadow: `0 0 0 3px ${c}33` }} />;
}

/** Info strip shown above task tables: which colour means which priority. */
export function PriorityLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[12px] border px-4 py-2.5 text-[12px] ${className}`} style={{ borderColor: "var(--portal-border-color, #E4E7F0)", background: "var(--portal-card-bg, #FDFBFE)" }}>
      <span className="font-semibold" style={{ color: "var(--portal-dark-text, #161D2C)" }}>PTY (priority) colours</span>
      {PRIORITY_ORDER.map((p) => (
        <span key={p} className="inline-flex items-center gap-2" style={{ color: "var(--portal-muted-text, #85858F)" }}>
          <PriorityDot priority={p} size={12} />{p}
        </span>
      ))}
    </div>
  );
}
