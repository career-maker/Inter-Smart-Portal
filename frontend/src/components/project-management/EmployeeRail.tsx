"use client";

import { Users } from "lucide-react";
import { ArrangeArrows, photoSrc } from "@/components/project-management/TaskBoard";

export type RailItem = { key: string; name: string; sub?: string; count: number; overdue: number; photo?: string | null };

const HUES = [162, 8, 36, 204, 262, 332, 92, 188, 22, 292];
const hue = (s: string) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

function Face({ item, on }: { item: RailItem; on: boolean }) {
  const src = photoSrc(item.photo);
  const ring = on ? "ring-2 ring-[#00806E] ring-offset-2 ring-offset-white dark:ring-offset-slate-950" : "";
  return (
    <span className="relative shrink-0">
      {item.key === "all" ? (
        <span className={`grid h-10 w-10 place-items-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 ${ring}`}><Users className="h-4 w-4" /></span>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className={`h-10 w-10 rounded-full object-cover bg-slate-200 ${ring}`} />
      ) : (
        <span style={{ ["--h" as any]: hue(item.key) }} className={`grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--h)_55%_42%)] text-sm font-bold text-white ${ring}`}>{item.name[0]?.toUpperCase()}</span>
      )}
      {item.overdue > 0 && <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-950" aria-hidden />}
    </span>
  );
}

/** Pick one person (or everyone). Desktop: a slim column of faces; hover or focus a face and the name slides out. Phone and tablet: a select. */
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

      <nav aria-label="Employees" className="max-lg:hidden lg:sticky lg:top-24 lg:z-30 lg:self-start py-1">
        <ul className="flex flex-col gap-2">
          {[all, ...items].map((i, idx) => {
            const on = value === i.key;
            const canMove = arrange && onMove && i.key.startsWith("u");
            return (
              <li key={i.key} className="relative h-10 w-10">
                <div className="group/pill absolute left-0 top-0 z-10 flex h-10 w-max max-w-10 items-center overflow-hidden rounded-full bg-white/0 transition-[max-width,background-color,box-shadow] duration-200 hover:z-30 hover:max-w-[320px] hover:bg-white hover:shadow-lg focus-within:z-30 focus-within:max-w-[320px] focus-within:bg-white focus-within:shadow-lg dark:hover:bg-slate-800 dark:focus-within:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => onChange(i.key)}
                    aria-current={on ? "true" : undefined}
                    aria-label={`${i.name}, ${i.count} tasks${i.overdue ? `, ${i.overdue} overdue` : ""}`}
                    className="flex h-10 items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#00806E] rounded-full"
                  >
                    <Face item={i} on={on} />
                    <span className="whitespace-nowrap pr-3">
                      <span className="block text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{i.name}</span>
                      <span className="block text-[11px] leading-tight text-slate-500">{i.count} {i.count === 1 ? "task" : "tasks"}{i.overdue ? <span className="text-rose-600 font-semibold"> · {i.overdue} late</span> : null}</span>
                    </span>
                  </button>
                  {canMove && <ArrangeArrows label={i.name} className="pr-1 scale-75 origin-right" canBack={idx > 1} canFwd={idx < items.length} onMove={(d) => onMove!(i.key, d)} />}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
