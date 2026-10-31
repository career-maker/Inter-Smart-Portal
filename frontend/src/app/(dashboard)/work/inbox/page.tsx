"use client";

import OpenLink from "@/components/OpenLink";
import { useEffect, useState } from "react";
import { Inbox, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const days = (n: number | null) => (n === null || n === undefined ? "-" : String(Number(n)));

/** Everything assigned to me, overdue first, plus (for team leads) what is waiting for me. Work itself happens on the project's page. */
export default function InboxPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    api.get("/work/inbox").then((r) => setD(r.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); });
  }, []);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Project work is not switched on for your account.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><Inbox className="h-7 w-7 text-amber-500" /> My inbox</h1>
        <p className="text-slate-600 dark:text-slate-300">Late work comes first. Open a project to start, update or finish a task.</p>
      </div>

      {d.is_lead && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Waiting for you as team lead</CardTitle></CardHeader>
          <CardContent className="p-0 pt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">Project</th><th className="p-3">Item</th><th className="p-3">What to do</th><th className="p-3">Due</th><th className="p-3" /></tr></thead>
              <tbody>
                {d.lead_todo.map((r: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3">{r.project}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{r.title} <span className="text-xs text-slate-500">{r.kind}</span></td>
                    <td className="p-3">{r.action}</td>
                    <td className="p-3">{r.due ? <span className={r.overdue ? "text-red-600 font-semibold" : ""}>{r.due}{r.overdue && " (late)"}</span> : "-"}</td>
                    <td className="p-3 text-right"><OpenLink href={`/work/projects/${r.project_id}`} /></td>
                  </tr>
                ))}
                {d.lead_todo.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nothing is waiting for you.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
      )}

      <Card><CardHeader className="pb-0"><CardTitle className="text-base">Assigned to me</CardTitle></CardHeader>
        <CardContent className="p-0 pt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">Project</th><th className="p-3">Task</th><th className="p-3">Status</th><th className="p-3">Due</th><th className="p-3">Days (spent / planned)</th><th className="p-3" /></tr></thead>
            <tbody>
              {d.mine.map((r: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3">{r.project}</td>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">{r.title} <span className="text-xs text-slate-500">{r.kind}</span></td>
                  <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="p-3">{r.due ? <span className={r.overdue ? "text-red-600 font-semibold" : ""}>{r.due}{r.overdue && " (late)"}</span> : "-"}</td>
                  <td className="p-3"><span className={r.over_effort ? "text-red-600 font-semibold" : ""}>{days(r.spent_days)} / {days(r.effort_days)}</span></td>
                  <td className="p-3 text-right"><OpenLink href={`/work/projects/${r.project_id}`} /></td>
                </tr>
              ))}
              {d.mine.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nothing is assigned to you right now.</td></tr>}
            </tbody>
          </table>
        </CardContent></Card>
    </div>
  );
}
