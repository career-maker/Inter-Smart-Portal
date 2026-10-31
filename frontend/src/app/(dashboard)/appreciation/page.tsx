"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Page, Panel, Row, Dot, Primary, Quiet, Alert, Spinner, Label, field, errMsg } from "@/components/clean";

/** Team leads, HR and the Project Office nominate; the project manager or HR approves. Approved ones go to the Hall and to an announcement. */
export default function AppreciationPage() {
  const [d, setD] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => { api.get("/appreciations").then((r) => setD(r.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); }); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (d?.can_nominate) api.get("/appreciations/people").then((r) => setPeople(r.data.data)).catch(() => {}); }, [d?.can_nominate]);

  if (unavailable) return <Page title="Appreciation" hint="Appreciation is for team leads, HR and the Project Office." children={null} />;
  if (!d) return <Spinner />;

  return (
    <Page title="Appreciation" hint={d.can_approve ? "Approve nominations. Approved ones are shown on the Hall page and posted as an announcement." : "Nominate someone. The project manager or HR approves it."}>
      {d.can_nominate && <Nominate people={people} onSent={load} />}
      <Panel className="p-0">
        {d.data.length === 0 && <Row className="text-slate-500">No nominations yet.</Row>}
        {d.data.map((a: any) => <Item key={a.id} a={a} canApprove={d.can_approve} onDone={load} />)}
      </Panel>
    </Page>
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
    <Panel className="space-y-4">
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <div><Label>Who</Label>
          <SelectCompat className={field} value={nominee} onChange={(e) => setNominee(e.target.value)}>
            <option value="">Choose a person</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </SelectCompat></div>
        <div><Label>Title, for example Star of the month</Label><input className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>Why</Label><input className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      </div>
      <Primary disabled={!nominee || !title || !reason} onClick={send}>Nominate</Primary>
    </Panel>
  );
}

function Item({ a, canApprove, onDone }: { a: any; canApprove: boolean; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const decide = async (approve: boolean) => {
    setErr(null);
    try { await api.post(`/appreciations/${a.id}/decision`, { approve, note: note || null }); onDone(); } catch (e: any) { setErr(errMsg(e)); }
  };
  const tone = a.status === "Approved" ? "ok" : a.status === "Rejected" ? "bad" : "warn";
  return (
    <div className="border-b border-slate-200 dark:border-white/10 last:border-0">
      <Row className="border-b-0">
        <span className="font-medium text-slate-900 dark:text-white">{a.nominee?.first_name} {a.nominee?.last_name}</span>
        <span className="text-slate-600 dark:text-slate-300">{a.title}</span>
        <span className="ml-auto"><Dot tone={tone}>{a.status}</Dot></span>
      </Row>
      <div className="px-4 pb-4 space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">{a.reason}</p>
        <p className="text-xs text-slate-500">Nominated by {a.nominator?.first_name} {a.nominator?.last_name}{a.decision_note ? `. Note: ${a.decision_note}` : ""}</p>
        {err && <Alert>{err}</Alert>}
        {canApprove && a.status === "Pending" && (
          <div className="flex items-center gap-4 flex-wrap">
            <input className={`${field} max-w-sm`} placeholder="Reason, needed to reject" value={note} onChange={(e) => setNote(e.target.value)} />
            <Primary onClick={() => decide(true)}>Approve</Primary>
            <Quiet onClick={() => decide(false)}>Reject</Quiet>
          </div>
        )}
      </div>
    </div>
  );
}
