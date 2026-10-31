"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ClipboardList, Search, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const STATES = ["Advance awaiting", "Pending payment", "Paid in full", "No finance record"];
const STATE_COLOR: Record<string, string> = {
  "Advance awaiting": "bg-amber-100 text-amber-800", "Pending payment": "bg-blue-100 text-blue-800",
  "Paid in full": "bg-green-100 text-green-800", "No finance record": "bg-slate-100 text-slate-700",
};
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function PmoProjectsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const [pcs, setPcs] = useState<any[]>([]);
  const [pc, setPc] = useState("");
  useEffect(() => { api.get("/pmo/meta").then((r) => setPcs(r.data.coordinators || [])).catch(() => {}); }, []);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/pmo/projects", { params: { payment_state: state || undefined, search: search || undefined, coordinator_id: pc || undefined, scope: all ? "all" : undefined } });
      setRows(r.data.data);
      setUnavailable(false);
    } catch (e: any) {
      if ([403, 404].includes(e?.response?.status)) setUnavailable(true);
    } finally { setLoading(false); }
  }, [state, search, all, pc]);
  useEffect(() => { load(); }, [load]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">The Project Office is not switched on for your account.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-amber-500" /> Project Office
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Every project from sale to delivery: coordinator, payment, department budgets and holds.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["", ...STATES].map((s) => <Button key={s || "all"} size="sm" variant={state === s ? "default" : "outline"} onClick={() => setState(s)}>{s || "All"}</Button>)}
        <select className="h-9 rounded-md border bg-transparent px-2 text-sm" value={pc} onChange={(e) => setPc(e.target.value)} aria-label="Filter by project coordinator"><option value="">All coordinators</option>{pcs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <Button size="sm" variant={all ? "default" : "ghost"} onClick={() => setAll(!all)}>{all ? "Including older projects" : "New pipeline only"}</Button>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search project" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="p-3">Project</th><th className="p-3">Status</th><th className="p-3">Coordinator</th>
                  <th className="p-3">Payment</th><th className="p-3 text-right">Contract</th><th className="p-3 text-right">Allocated (days)</th>
                  <th className="p-3">Progress</th><th className="p-3">Flags</th><th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-3"><div className="font-medium text-slate-900 dark:text-white">{r.name}</div><div className="text-xs text-slate-500">{r.sales_person ? `Sold by ${r.sales_person}` : ""}</div></td>
                    <td className="p-3"><Badge variant="outline">{r.status}</Badge>{r.hold_reason && <div className="text-xs text-amber-700 mt-1">{r.hold_reason}</div>}</td>
                    <td className="p-3">{r.coordinator ? <>{r.coordinator}{!r.accepted && <div className="text-xs text-amber-700">Not accepted yet</div>}</> : <span className="text-slate-400">Not assigned</span>}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATE_COLOR[r.state]}`}>{r.state}</span></td>
                    <td className="p-3 text-right">{r.contract_value == null ? "-" : money(r.contract_value)}</td>
                    <td className="p-3 text-right">{money(r.allocated)}</td>
                    <td className="p-3">{r.progress_percent === null ? "-" : `${r.progress_percent}%`}</td>
                    <td className="p-3 space-x-1">
                      {r.date_exceeded && <Badge className="bg-red-100 text-red-800">Date exceeded</Badge>}
                      {r.pending_out_of_scope > 0 && <Badge className="bg-amber-100 text-amber-800">{r.pending_out_of_scope} out of scope</Badge>}
                    </td>
                    <td className="p-3 text-right"><Link href={`/pmo/projects/${r.id}`}><Button size="sm" variant="outline">Open</Button></Link></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500">No projects here yet.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
