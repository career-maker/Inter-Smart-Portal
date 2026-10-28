"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Page, Panel, Row, Dot, Primary, Alert, Spinner, Label, field, money, errMsg } from "@/components/clean";

const TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = { Active: "ok", "Expiring soon": "warn", Expired: "bad", "No AMC": "neutral" };

/** Completed (live) projects: go-live date, AMC start and renewal, AMC amount, payment status. Sales records the AMC and is reminded 30 days before it expires. */
export default function CompletedPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => { api.get("/sales/completed").then((r) => setRows(r.data.data)).catch(() => setRows([])); }, []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <Spinner />;

  return (
    <Page title="Completed projects and AMC" hint="Record each project's AMC. You are reminded 30 days before it expires.">
      {rows.length === 0 && <Panel className="p-0"><Row className="text-slate-500">No project has gone live yet.</Row></Panel>}
      {rows.map((r) => <Item key={r.id} r={r} onSaved={load} />)}
    </Page>
  );
}

function Item({ r, onSaved }: { r: any; onSaved: () => void }) {
  const [f, setF] = useState({ amc_start: r.amc_start?.slice(0, 10) || "", renewal_date: r.renewal_date?.slice(0, 10) || "", amount: r.amc_amount ?? "", notes: r.amc_notes || "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setErr(null);
    try { await api.put(`/sales/projects/${r.id}/amc`, { ...f, amount: Number(f.amount), notes: f.notes || null }); onSaved(); } catch (e: any) { setErr(errMsg(e)); }
  };
  const left = r.days_left !== null && r.amc_status !== "No AMC" ? (r.days_left < 0 ? `${-r.days_left} days ago` : `${r.days_left} days left`) : "";
  return (
    <Panel className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xl font-semibold text-slate-900 dark:text-white">{r.name}</span>
        <Dot tone={TONE[r.amc_status]}>{r.amc_status}{left ? `, ${left}` : ""}</Dot>
        <span className="ml-auto"><Dot tone={r.state === "Paid in full" ? "ok" : "warn"}>{r.state}</Dot></span>
      </div>
      <p className="text-xs text-slate-500">Went live {r.go_live_date || "not recorded"}. Contract {money(r.contract_value)}, received {money(r.received)}, balance {money(r.balance)}.</p>
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <div><Label>AMC start</Label><input type="date" className={field} value={f.amc_start} onChange={(e) => set("amc_start", e.target.value)} /></div>
        <div><Label>Renewal date</Label><input type="date" className={field} value={f.renewal_date} onChange={(e) => set("renewal_date", e.target.value)} /></div>
        <div><Label>AMC amount</Label><input type="number" min={0} className={field} value={f.amount} onChange={(e) => set("amount", e.target.value)} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
        <div><Label>Notes</Label><input className={field} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        <Primary disabled={!f.amc_start || !f.renewal_date || f.amount === ""} onClick={save}>Save AMC</Primary>
      </div>
    </Panel>
  );
}
