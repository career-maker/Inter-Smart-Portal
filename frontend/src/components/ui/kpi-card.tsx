import * as React from "react";

/** Plain bordered card: 12px label, 28px tabular number, optional delta. No icon tile. */
export function KpiCard({
  label,
  value,
  delta,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-5">
      <div className="text-xs leading-4 font-medium text-slate-500">{label}</div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <div className="mt-1 text-[28px] leading-8 font-semibold text-slate-900 tabular-nums">{value}</div>
      )}
      {delta && <div className="mt-1 text-xs text-slate-500">{delta}</div>}
    </div>
  );
}
