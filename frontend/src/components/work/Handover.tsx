"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";

/** Project Office hand-overs: ask Accounts for a payment, and ask the system admin team for a server and go-live. */
export default function Handover({ projectId }: { projectId: string | number }) {
  const [gl, setGl] = useState<any>(null);
  const [pay, setPay] = useState({ kind: "installment", amount: "", due_date: "", notes: "" });
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => { api.get(`/pmo/projects/${projectId}/go-live`).then((r) => setGl(r.data.data)).catch(() => {}); }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>, ok: string) => { setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); load(); } catch (e: any) { setMsg({ ok: false, text: errMsg(e) }); } };

  return (
    <Card><CardHeader className="pb-0"><CardTitle className="text-base">Hand-overs</CardTitle></CardHeader>
      <CardContent className="pt-3 space-y-4 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
        {msg && <div role="alert" className={`rounded-lg border px-3 py-2 ${msg.ok ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>{msg.text}</div>}

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 font-semibold">Ask Accounts for a payment</div>
          <div><Label>Type</Label><select className={SELECT} value={pay.kind} onChange={(e) => setPay({ ...pay, kind: e.target.value })}><option value="installment">Instalment</option><option value="final">Final</option></select></div>
          <div><Label>Amount</Label><Input inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
          <div><Label>Due date (optional)</Label><Input type="date" value={pay.due_date} onChange={(e) => setPay({ ...pay, due_date: e.target.value })} /></div>
          <div><Label>Note (optional)</Label><Input value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} /></div>
          <Button className="col-span-2" variant="outline" disabled={!pay.amount}
            onClick={() => run(async () => { await api.post(`/pmo/projects/${projectId}/payment-request`, { kind: pay.kind, amount: Number(pay.amount), due_date: pay.due_date || null, notes: pay.notes || null }); setPay({ ...pay, amount: "", notes: "" }); }, "Accounts has been asked for this payment.")}>Send to Accounts</Button>
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="font-semibold">Server and go-live</div>
          {!gl && (
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div><Label>Note for the system admin (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <Button variant="outline" onClick={() => run(() => api.post(`/pmo/projects/${projectId}/go-live`, { request_note: note || null }), "The system admin team has been asked for a server.")}>Request a server</Button>
            </div>
          )}
          {gl && (
            <p>Status: <b>{gl.status}</b>{gl.server_details && <> · server: {gl.server_details}</>}{gl.live_url && <> · live at <a className="underline" href={gl.live_url} target="_blank" rel="noreferrer">{gl.live_url}</a></>}</p>
          )}
        </div>
      </CardContent></Card>
  );
}
