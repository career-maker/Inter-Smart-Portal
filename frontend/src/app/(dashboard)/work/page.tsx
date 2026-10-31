"use client";

import OpenLink from "@/components/OpenLink";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const TILES = [
  "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-300",
  "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-900 dark:text-violet-300",
  "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300",
  "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-300",
  "bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-950/40 dark:border-pink-900 dark:text-pink-300",
  "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300",
];
const BAD = "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300";
const WARN = "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300";
const ZERO = "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-500";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><Layers className="h-7 w-7 text-amber-500" /> My Work</h1>
        <p className="text-slate-600 dark:text-slate-300">Projects your department has a budget on, or that you coordinate.</p>
      </div>
      {dash.map((sec) => (
        <div key={sec.title} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{sec.title}</h2>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {sec.tiles.map((t: any, i: number) => {
              const tone = t.value === 0 ? ZERO : t.tone === "bad" ? BAD : t.tone === "warn" ? WARN : TILES[i % TILES.length];
              const body = <CardContent className="p-3"><div className="text-2xl font-bold">{t.value}</div><div className="text-xs opacity-80">{t.label}</div></CardContent>;
              return <Card key={t.label} className={`border ${tone}`}>{t.href ? <Link href={t.href}>{body}</Link> : body}</Card>;
            })}
          </div>
        </div>
      ))}
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="p-3 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">Project</th>
            <th className="p-3 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">Status</th>
            <th className="p-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">UI pages</th>
            <th className="p-3 bg-amber-100 dark:bg-amber-950" /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-sky-900 bg-sky-50/60 dark:bg-sky-950/20 dark:text-sky-100">{p.name}</td>
                <td className="p-3 bg-violet-50/60 dark:bg-violet-950/20"><Badge variant="outline">{p.status}</Badge></td>
                <td className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20">{p.ui_pages ? `${p.ui_pages_done} of ${p.ui_pages} done` : "-"}</td>
                <td className="p-3 text-right bg-amber-50/60 dark:bg-amber-950/20"><OpenLink href={`/work/projects/${p.id}`} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No projects on your work list yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
