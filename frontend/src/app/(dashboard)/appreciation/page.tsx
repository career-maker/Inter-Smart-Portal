"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, HeartHandshake } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";

/** Team leads, HR and PCs nominate; the project manager or HR approves. Approved ones appear on the Hall and as an announcement. */
export default function AppreciationPage() {
  const [d, setD] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => {
    api.get("/appreciations").then((r) => setD(r.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (d?.can_nominate) api.get("/appreciations/people").then((r) => setPeople(r.data.data)).catch(() => {}); }, [d?.can_nominate]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Appreciation is for team leads, HR and the Project Office.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><HeartHandshake className="h-7 w-7 text-amber-500" /> Appreciation</h1>
        <p className="text-slate-600 dark:text-slate-300">{d.can_approve ? "Approve nominations. Approved ones are shared on the Hall and as a company announcement." : "Nominate someone for appreciation. The project manager or HR approves it."}</p>
      </div>
      {d.can_nominate && <Nominate people={people} onSent={load} />}
      {d.data.length === 0 && <p className="text-sm text-slate-500">No nominations yet.</p>}
      {d.data.map((a: any) => <Row key={a.id} a={a} canApprove={d.can_approve} onDone={load} />)}
    </div>
  );
}

function Nominate({ people, onSent }: { people: any[]; onSent: () => void }) {
  const [nominee, setNominee] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    setErr(null);
    try { await api.post("/appreciations", { nominee_id: Number(nominee), title, reason }); setNominee(""); setTitle(""); setReason(""); onSent(); } catch (e: any) { setErr(errMsg(e)); }
  };
  return (
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      <div>
        <Label>Who</Label>
        <select className="w-full h-9 rounded-md border bg-transparent px-2" value={nominee} onChange={(e) => setNominee(e.target.value)}>
          <option value="">Choose a person</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
      </div>
      <div><Label>Title (for example "Star of the month")</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Why</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      <Button disabled={!nominee || !title || !reason} onClick={send}>Nominate</Button>
    </CardContent></Card>
  );
}

function Row({ a, canApprove, onDone }: { a: any; canApprove: boolean; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const decide = async (approve: boolean) => {
    setErr(null);
    try { await api.post(`/appreciations/${a.id}/decision`, { approve, note: note || null }); onDone(); } catch (e: any) { setErr(errMsg(e)); }
  };
  return (
    <Card><CardContent className="p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-900 dark:text-white">{a.nominee?.first_name} {a.nominee?.last_name}: {a.title}</span>
        <Badge variant="outline" className="ml-auto">{a.status}</Badge>
      </div>
      <p className="text-slate-600 dark:text-slate-300">{a.reason}</p>
      <p className="text-xs text-slate-500">Nominated by {a.nominator?.first_name} {a.nominator?.last_name}{a.decision_note ? `. Note: ${a.decision_note}` : ""}</p>
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      {canApprove && a.status === "Pending" && (
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
          <Input placeholder="Reason (needed to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={() => decide(true)}>Approve</Button>
          <Button variant="outline" onClick={() => decide(false)}>Reject</Button>
        </div>
      )}
    </CardContent></Card>
  );
}
