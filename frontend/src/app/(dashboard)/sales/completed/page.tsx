"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const AMC_COLOR: Record<string, string> = { Active: "bg-green-100 text-green-800", "Expiring soon": "bg-amber-100 text-amber-800", Expired: "bg-red-100 text-red-800", "No AMC": "bg-slate-100 text-slate-700" };

/** Completed (live) projects: go-live date, AMC start and renewal, AMC amount, payment status. Sales records the AMC and is reminded 30 days before it expires. */
export default function CompletedPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => { api.get("/sales/completed").then((r) => setRows(r.data.data)).catch(() => setRows([])); }, []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-amber-500" /> Completed projects and AMC</h1>
        <p className="text-slate-600 dark:text-slate-300">Record each project&apos;s AMC. You are reminded 30 days before it expires.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-500">No project has gone live yet.</p>}
      {rows.map((r) => <Row key={r.id} r={r} onSaved={load} />)}
    </div>
  );
}

function Row({ r, onSaved }: { r: any; onSaved: () => void }) {
  const [f, setF] = useState({ amc_start: r.amc_start?.slice(0, 10) || "", renewal_date: r.renewal_date?.slice(0, 10) || "", amount: r.amc_amount ?? "", notes: r.amc_notes || "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setErr(null);
    try { await api.put(`/sales/projects/${r.id}/amc`, { ...f, amount: Number(f.amount), notes: f.notes || null }); onSaved(); } catch (e: any) { setErr(errMsg(e)); }
  };
  return (
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-900 dark:text-white">{r.name}</span>
        <Badge className={AMC_COLOR[r.amc_status]}>{r.amc_status}{r.days_left !== null && r.amc_status !== "No AMC" ? ` (${r.days_left < 0 ? `${-r.days_left} days ago` : `${r.days_left} days left`})` : ""}</Badge>
        <Badge variant="outline" className="ml-auto">{r.state}</Badge>
      </div>
      <p className="text-xs text-slate-500">Went live: {r.go_live_date || "not recorded"}. Contract Rs {money(r.contract_value)}, received Rs {money(r.received)}, balance Rs {money(r.balance)}.</p>
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      <div className="grid grid-cols-3 gap-2">
        <div><Label>AMC start</Label><Input type="date" value={f.amc_start} onChange={(e) => set("amc_start", e.target.value)} /></div>
        <div><Label>Renewal date</Label><Input type="date" value={f.renewal_date} onChange={(e) => set("renewal_date", e.target.value)} /></div>
        <div><Label>AMC amount (Rs)</Label><Input type="number" min={0} value={f.amount} onChange={(e) => set("amount", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div><Label>Notes</Label><Input value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        <Button disabled={!f.amc_start || !f.renewal_date || f.amount === ""} onClick={save}>Save AMC</Button>
      </div>
    </CardContent></Card>
  );
}
