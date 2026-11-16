"use client";

import { ArrangeArrows } from "@/components/project-management/TaskBoard";

export type RailItem = { key: string; name: string; sub?: string; count: number; overdue: number };

/** Pick one person (or everyone). A plain list on desktop, a select on phone and tablet. */
export function EmployeeRail({
  items, value, onChange, arrange = false, onMove,
}: {
  items: RailItem[]; value: string; onChange: (key: string) => void; arrange?: boolean; onMove?: (key: string, dir: -1 | 1) => void;
}) {
  const total = items.reduce((n, i) => n + i.count, 0);
  const all: RailItem = { key: "all", name: "Everyone", count: total, overdue: 0 };
  return (
    <>
      <div className="lg:hidden">
        <label className="sr-only" htmlFor="employee-pick">Show tasks for</label>
        <select
          id="employee-pick"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-800 dark:text-slate-100"
        >
          <option value="all">Everyone ({total})</option>
          {items.map((i) => (
            <option key={i.key} value={i.key}>{i.name} ({i.count}{i.overdue ? `, ${i.overdue} overdue` : ""})</option>
          ))}
        </select>
      </div>

      <nav aria-label="Employees" className="max-lg:hidden lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-8rem)] overflow-y-auto">
        <ul className="divide-y divide-slate-200/70 dark:divide-slate-800">
          {[all, ...items].map((i, idx) => {
            const on = value === i.key;
            const canMove = arrange && onMove && i.key.startsWith("u");
            return (
              <li key={i.key} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onChange(i.key)}
                  aria-current={on ? "true" : undefined}
                  title={i.sub ? `${i.name} · ${i.sub}` : i.name}
                  className={`flex min-h-9 flex-1 min-w-0 items-center gap-2 px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    on ? "bg-[#00806E]/10 font-semibold text-[#00806E] dark:text-teal-300" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex-1 truncate">{i.name}</span>
                  {i.overdue > 0 && <span className="text-[11px] font-semibold text-rose-600" title={`${i.overdue} overdue`}>{i.overdue} late</span>}
                  <span className="text-xs tabular-nums text-slate-500">{i.count}</span>
                </button>
                {canMove && (
                  <ArrangeArrows label={i.name} className="pr-1 scale-75 origin-right" canBack={idx > 1} canFwd={idx < items.length} onMove={(d) => onMove!(i.key, d)} />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
