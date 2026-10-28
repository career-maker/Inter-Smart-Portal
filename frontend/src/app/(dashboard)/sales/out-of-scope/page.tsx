"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Page, Panel, Row, Dot, Primary, Quiet, Alert, Spinner, Label, field, money, errMsg } from "@/components/clean";

/** Extra paid work raised by the Project Office. Sales approves or rejects with a reason, or asks for a meeting. */
export default function SalesOutOfScopePage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => { api.get("/sales/out-of-scope").then((r) => setRows(r.data.data)).catch(() => setRows([])); }, []);
  useEffect(() => { load(); }, [load]);
  if (!rows) return <Spinner />;

  return (
    <Page title="Out-of-scope requests" hint="The Project Office asks for extra paid work on your projects. Answer each one.">
      {rows.length === 0 && <Panel className="p-0"><Row className="text-slate-500">No out-of-scope requests.</Row></Panel>}
      {rows.map((r) => <Item key={r.id} r={r} onDone={load} />)}
    </Page>
  );
}

function Item({ r, onDone }: { r: any; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async (body: any) => { setErr(null); try { await api.post(`/sales/out-of-scope/${r.id}/reply`, body); setAsking(false); onDone(); } catch (e: any) { setErr(errMsg(e)); } };
  const final = r.sales_status === "Approved" || r.sales_status === "Rejected";

  return (
    <Panel className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xl font-semibold text-slate-900 dark:text-white">{r.project_name}</span>
        {r.action_required && <Dot tone="warn">Action required</Dot>}
        <span className="ml-auto text-sm text-slate-600 dark:text-slate-300">{r.sales_status ? `You answered: ${r.sales_status}` : "Waiting for you"}</span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200">{r.description}</p>
      <p className="text-xs text-slate-500">{Number(r.effort_days)} days{r.amount_estimate ? `, estimate ${money(r.amount_estimate)}` : ""}. Project Office decision: {r.status}.{r.sales_reason ? ` Your reason: ${r.sales_reason}` : ""}</p>
      {err && <Alert>{err}</Alert>}
      {!final && (
        <div className="space-y-4">
          <div className="max-w-xl"><Label>Reason, needed to approve or reject</Label><input className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className="flex items-center gap-4 flex-wrap">
            <Primary disabled={!reason} onClick={() => send({ answer: "approve", reason })}>Approve</Primary>
            <Quiet disabled={!reason} onClick={() => send({ answer: "reject", reason })}>Reject</Quiet>
            {r.sales_status !== "Meeting requested" && <Quiet onClick={() => setAsking(!asking)}>Request a meeting</Quiet>}
          </div>
          {asking && (
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
              <div><Label>Starts, India time</Label><input type="datetime-local" className={field} value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label>Ends</Label><input type="datetime-local" className={field} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
              <Primary disabled={!start || !end} onClick={() => send({ answer: "meeting", reason: reason || null, starts_at: start.replace("T", " "), ends_at: end.replace("T", " ") })}>Send invite</Primary>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
