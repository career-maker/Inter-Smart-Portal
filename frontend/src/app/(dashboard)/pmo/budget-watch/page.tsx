"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import api from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/** Project managers: projects whose approved work costs more than the department budgets, and those nearing the limit. */
export default function BudgetWatchPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { api.get("/pmo/budget-watch").then((r) => setD(r.data)).catch(() => setUnavailable(true)); }, []);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">The out-of-budget list is for the project manager.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><TrendingUp className="h-7 w-7 text-amber-500" /> Out of budget</h1>
        <p className="text-slate-600 dark:text-slate-300">Approved sprints and changes compared with the department budgets.</p>
      </div>
      <Section title="Over the limit" rows={d.over} empty="No project is over its budget." tone="bg-red-100 text-red-800" />
      <Section title={`Nearing the limit (${d.near_percent}% or more)`} rows={d.near} empty="No project is close to its limit." tone="bg-amber-100 text-amber-800" />
    </div>
  );
}

function Section({ title, rows, empty, tone }: { title: string; rows: any[]; empty: string; tone: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title} <span className="text-sm font-normal text-slate-500">{rows.length}</span></h2>
      {rows.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
      {rows.map((r) => (
        <Card key={r.id}><CardContent className="p-3 space-y-1 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`/pmo/projects/${r.id}`} className="font-semibold text-slate-900 dark:text-white hover:underline">{r.name}</a>
            <Badge className={tone}>{r.percent}%</Badge>
            <span className="ml-auto text-slate-600 dark:text-slate-300">Rs {money(r.used)} of Rs {money(r.budget)}{r.overrun > 0 ? ` (over by Rs ${money(r.overrun)})` : ""}</span>
          </div>
          <ul className="text-xs text-slate-500 flex gap-x-4 flex-wrap">
            {r.departments.map((x: any) => <li key={x.team} className={x.over ? "text-red-600 font-medium" : ""}>{x.team}: Rs {money(x.used)} / Rs {money(x.budget)}</li>)}
          </ul>
        </CardContent></Card>
      ))}
    </div>
  );
}
