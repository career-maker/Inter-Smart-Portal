"use client";

import { Users } from "lucide-react";

export type RailItem = { key: string; name: string; sub?: string; count: number; overdue: number };

const hue = (s: string) => [162, 8, 36, 204, 262, 332, 92, 188, 22, 292][[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 10];

/** Pick one person (or everyone) so only their tasks fill the page. Left rail on desktop, a select on phone and tablet. */
export function EmployeeRail({ items, value, onChange }: { items: RailItem[]; value: string; onChange: (key: string) => void }) {
  const total = items.reduce((n, i) => n + i.count, 0);
  const select = "w-full min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-800 dark:text-slate-100";
  return (
    <>
      <div className="lg:hidden">
        <label className="sr-only" htmlFor="employee-pick">Show tasks for</label>
        <select id="employee-pick" value={value} onChange={(e) => onChange(e.target.value)} className={select}>
          <option value="all">Everyone ({total})</option>
          {items.map((i) => (
            <option key={i.key} value={i.key}>{i.name} ({i.count}{i.overdue ? `, ${i.overdue} overdue` : ""})</option>
          ))}
        </select>
      </div>

      <nav aria-label="Employees" className="max-lg:hidden lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl bg-white/80 dark:bg-slate-900/70 p-2 shadow-sm">
        <ul className="space-y-0.5">
          {[{ key: "all", name: "Everyone", sub: undefined, count: total, overdue: 0 } as RailItem, ...items].map((i) => {
            const on = value === i.key;
            return (
              <li key={i.key}>
                <button
                  type="button"
                  onClick={() => onChange(i.key)}
                  aria-current={on ? "true" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${on ? "bg-[#00806E] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100"}`}
                >
                  {i.key === "all" ? (
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${on ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}><Users className="h-4 w-4" /></span>
                  ) : (
                    <span style={{ ["--h" as any]: hue(i.key) }} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${on ? "bg-white/25" : "bg-[hsl(var(--h)_55%_42%)]"}`}>{i.name[0]?.toUpperCase()}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{i.name}</span>
                    {i.sub && <span className={`block truncate text-[11px] ${on ? "text-white/75" : "text-slate-500"}`}>{i.sub}</span>}
                  </span>
                  {i.overdue > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white" title={`${i.overdue} overdue`}>{i.overdue}</span>}
                  <span className={`text-xs font-semibold tabular-nums ${on ? "text-white" : "text-slate-500"}`}>{i.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
