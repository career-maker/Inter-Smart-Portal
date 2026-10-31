"use client";

import OpenLink from "@/components/OpenLink";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
            {sec.tiles.map((t: any) => {
              const tone = t.value === 0 ? "text-slate-400" : t.tone === "bad" ? "text-red-600" : t.tone === "warn" ? "text-amber-600" : "text-slate-900 dark:text-white";
              const body = <CardContent className="p-3"><div className={`text-2xl font-bold ${tone}`}>{t.value}</div><div className="text-xs text-slate-500">{t.label}</div></CardContent>;
              return <Card key={t.label}>{t.href ? <Link href={t.href}>{body}</Link> : body}</Card>;
            })}
          </div>
        </div>
      ))}
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">Project</th><th className="p-3">Status</th><th className="p-3">UI pages</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                <td className="p-3"><Badge variant="outline">{p.status}</Badge></td>
                <td className="p-3">{p.ui_pages ? `${p.ui_pages_done} of ${p.ui_pages} done` : "-"}</td>
                <td className="p-3 text-right"><OpenLink href={`/work/projects/${p.id}`} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No projects on your work list yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
