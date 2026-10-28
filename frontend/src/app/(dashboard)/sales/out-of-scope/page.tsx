"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FileWarning } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/** Extra paid work raised by the Project Office. Sales approves or rejects with a reason, or asks for a meeting. */
export default function SalesOutOfScopePage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => { api.get("/sales/out-of-scope").then((r) => setRows(r.data.data)).catch(() => setRows([])); }, []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><FileWarning className="h-7 w-7 text-amber-500" /> Out-of-scope requests</h1>
        <p className="text-slate-600 dark:text-slate-300">The Project Office asks for extra paid work on your projects. Answer each one.</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-500">No out-of-scope requests.</p>}
      {rows.map((r) => <Row key={r.id} r={r} onDone={load} />)}
    </div>
  );
}

function Row({ r, onDone }: { r: any; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async (body: any) => { setErr(null); try { await api.post(`/sales/out-of-scope/${r.id}/reply`, body); setAsking(false); onDone(); } catch (e: any) { setErr(errMsg(e)); } };
  const final = r.sales_status === "Approved" || r.sales_status === "Rejected";

  return (
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-900 dark:text-white">{r.project_name}</span>
        {r.action_required && <Badge className="bg-amber-100 text-amber-800">Action required</Badge>}
        <Badge variant="outline" className="ml-auto">{r.sales_status ? `You: ${r.sales_status}` : "Waiting for you"}</Badge>
      </div>
      <p className="text-slate-600 dark:text-slate-300">{r.description}</p>
      <p className="text-xs text-slate-500">{Number(r.effort_days)} day(s){r.amount_estimate ? `, estimate Rs ${money(r.amount_estimate)}` : ""}. Project Office decision: {r.status}.{r.sales_reason ? ` Your reason: ${r.sales_reason}` : ""}</p>
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      {!final && (
        <div className="space-y-2">
          <div><Label>Reason (needed to approve or reject)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex gap-2 flex-wrap">
            <Button disabled={!reason} onClick={() => send({ answer: "approve", reason })}>Approve</Button>
            <Button variant="outline" disabled={!reason} onClick={() => send({ answer: "reject", reason })}>Reject</Button>
            {r.sales_status !== "Meeting requested" && <Button variant="outline" onClick={() => setAsking(!asking)}>Request a meeting</Button>}
          </div>
          {asking && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div><Label>Starts (India time)</Label><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label>Ends</Label><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
              <Button disabled={!start || !end} onClick={() => send({ answer: "meeting", reason: reason || null, starts_at: start.replace("T", " "), ends_at: end.replace("T", " ") })}>Send invite</Button>
            </div>
          )}
        </div>
      )}
    </CardContent></Card>
  );
}
