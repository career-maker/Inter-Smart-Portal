"use client";

import OpenLink from "@/components/OpenLink";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import api from "@/services/api";
import { Page, Section, Panel, Dot } from "@/components/clean";

// number colour per tile: red = overdue, amber = needs attention, muted = nothing, otherwise the accent
const NUM = (zero: boolean, tone?: string) => zero ? "text-slate-400 dark:text-slate-500" : tone === "bad" ? "text-red-600 dark:text-red-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-[#1F5C4E] dark:text-emerald-300";
const statusTone = (s: string) => (/done|complete|live/i.test(s) ? "ok" : /hold|cancel|reject/i.test(s) ? "bad" : /plan|pending|yet/i.test(s) ? "warn" : "neutral") as "ok" | "warn" | "bad" | "neutral";

export default function MyWorkPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [dash, setDash] = useState<any[]>([]);

  useEffect(() => {
    api.get("/work/projects").then((r) => setRows(r.data.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); });
    api.get("/work/dashboard").then((r) => setDash(r.data.sections)).catch(() => {});
  }, []);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Project work is not switched on for your account.</p>;
  if (!rows) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Page title="My Work" hint="Projects your department has a budget on, or that you coordinate.">
      {dash.map((sec) => (
        <Section key={sec.title} title={sec.title}>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {sec.tiles.map((t: any) => {
              const body = (
                <div className="p-4 h-full">
                  <div className={`text-[32px] leading-10 font-semibold ${NUM(t.value === 0, t.tone)}`}>{t.value}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.label}</div>
                </div>
              );
              return (
                <div key={t.label} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 shadow-sm overflow-hidden hover:border-[#1F5C4E]/50 transition-colors">
                  {t.href ? <Link href={t.href} className="block h-full">{body}</Link> : body}
                </div>
              );
            })}
          </div>
        </Section>
      ))}
      <Section title="Projects" count={rows.length}>
        <Panel className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 h-10">Project</th>
                  <th className="px-4 h-10">Status</th>
                  <th className="px-4 h-10">UI pages</th>
                  <th className="px-4 h-10 w-24" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200 dark:border-white/10 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3"><Dot tone={statusTone(String(p.status))}>{p.status}</Dot></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.ui_pages ? `${p.ui_pages_done} of ${p.ui_pages} done` : "-"}</td>
                    <td className="px-4 py-3 text-right"><OpenLink href={`/work/projects/${p.id}`} /></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No projects on your work list yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </Section>
    </Page>
  );
}
