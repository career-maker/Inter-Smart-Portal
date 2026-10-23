"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function SalesDashboardPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    api.get("/sales/dashboard").then((r) => setD(r.data)).catch((e) => {
      if ([403, 404].includes(e?.response?.status)) setUnavailable(true);
    });
  }, []);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">The Sales module is not switched on for your account.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const pct = d.target.target > 0 ? Math.min(100, Math.round((100 * d.target.achieved) / d.target.target)) : 0;
  const tiles: [string, string | number, string?][] = [
    ["Leads to follow up", d.leads.follow_up],
    ["Hot leads", d.leads.hot],
    ["Ready to close", d.leads.ready_to_close, `Value ${money(d.leads.ready_to_close_value)}`],
    ["Lead conversion", d.conversion_percent === null ? "-" : `${d.conversion_percent}%`, "Won / (Won + Lost)"],
    ["Projects ongoing", d.projects_ongoing],
    ["Pending actions", d.pending_actions, "Due today or overdue"],
    ["Meetings attended", d.meetings_attended, "This month"],
    ["Proposals shared", d.proposals_shared, "This month"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-amber-500" /> Sales Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-300">{d.scope === "all" ? "All salespeople" : "Your numbers"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/leads"><Button variant="outline">Leads</Button></Link>
          <Link href="/sales/inbox"><Button variant="outline">Inbox</Button></Link>
          <Link href="/sales/projects"><Button>Projects</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-900 dark:text-white">Target for {d.target.month}</span>
            <span>{money(d.target.achieved)} of {money(d.target.target)} ({pct}%)</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-500">Achieved = contract value of projects you signed this month. Targets are set by Accounts.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([label, value, sub]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
              {sub && <div className="text-xs text-slate-500">{sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
