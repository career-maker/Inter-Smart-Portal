"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Page, Panel, Row, Dot, Primary, Alert, Spinner, Label, field, area, errMsg } from "@/components/clean";

const STAGE: Record<string, string> = { during: "During the project", post_live: "After go-live" };

/** Notes from customer feedback calls: the project manager during a project, HR after go-live. The questions are asked by phone. */
export default function CustomerFeedbackPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => { api.get("/customer-feedback").then((r) => setD(r.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); }); }, []);
  useEffect(() => { load(); }, [load]);

  if (unavailable) return <Page title="Customer feedback" hint="Customer feedback is for the project manager and HR." children={null} />;
  if (!d) return <Spinner />;

  return (
    <Page title="Customer feedback" hint="Record what the customer said on the call. The score is for information only and never changes anyone's rating.">
      <Add d={d} onSaved={load} />
      <Panel className="p-0">
        {d.data.length === 0 && <Row className="text-slate-500">No feedback recorded yet.</Row>}
        {d.data.map((r: any) => (
          <div key={r.id} className="border-b border-slate-200 dark:border-white/10 last:border-0">
            <Row className="border-b-0">
              <span className="font-medium text-slate-900 dark:text-white">{r.project_name}</span>
              <Dot tone={r.stage === "post_live" ? "ok" : "neutral"}>{STAGE[r.stage]}</Dot>
              {r.score && <span className="ml-auto text-slate-600 dark:text-slate-300">{r.score} out of 5</span>}
            </Row>
            <div className="px-4 pb-4 space-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-300">{r.notes}</p>
              <p className="text-xs text-slate-500">Spoke to {r.contact_name} on {String(r.call_date).slice(0, 10)}. Recorded by {r.recorded_by_name}.</p>
            </div>
          </div>
        ))}
      </Panel>
    </Page>
  );
}

function Add({ d, onSaved }: { d: any; onSaved: () => void }) {
  const [f, setF] = useState({ project_id: "", stage: d.stages[0] || "", contact_name: "", call_date: "", score: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const projects = d.projects.filter((p: any) => f.stage !== "post_live" || p.live);
  const save = async () => {
    setErr(null);
    try {
      await api.post("/customer-feedback", { ...f, project_id: Number(f.project_id), score: f.score ? Number(f.score) : null });
      setF({ ...f, project_id: "", contact_name: "", call_date: "", score: "", notes: "" }); onSaved();
    } catch (e: any) { setErr(errMsg(e)); }
  };
  return (
    <Panel className="space-y-4">
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>When</Label>
          <select className={field} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value, project_id: "" })}>
            {d.stages.map((s: string) => <option key={s} value={s}>{STAGE[s]}</option>)}
          </select></div>
        <div><Label>Project{f.stage === "post_live" ? ", live projects only" : ""}</Label>
          <select className={field} value={f.project_id} onChange={(e) => set("project_id", e.target.value)}>
            <option value="">Choose</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div><Label>Spoke to</Label><input className={field} value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></div>
        <div><Label>Call date</Label><input type="date" className={field} value={f.call_date} onChange={(e) => set("call_date", e.target.value)} /></div>
        <div><Label>Score 1 to 5, optional</Label><input type="number" min={1} max={5} className={field} value={f.score} onChange={(e) => set("score", e.target.value)} /></div>
      </div>
      <div><Label>What the customer said</Label><textarea className={area} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <Primary disabled={!f.stage || !f.project_id || !f.contact_name || !f.call_date || !f.notes} onClick={save}>Record feedback</Primary>
    </Panel>
  );
}
