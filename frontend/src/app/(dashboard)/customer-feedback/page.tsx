"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, MessageSquareQuote } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const STAGE: Record<string, string> = { during: "During the project", post_live: "After go-live" };

/** Notes from customer feedback calls: the project manager during a project, HR after go-live. The questions are asked by phone. */
export default function CustomerFeedbackPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => { api.get("/customer-feedback").then((r) => setD(r.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); }); }, []);
  useEffect(() => { load(); }, [load]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Customer feedback is for the project manager and HR.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><MessageSquareQuote className="h-7 w-7 text-amber-500" /> Customer feedback</h1>
        <p className="text-slate-600 dark:text-slate-300">Record what the customer said on the call. The score is for information only and does not change anyone&apos;s rating.</p>
      </div>
      <Add d={d} onSaved={load} />
      {d.data.length === 0 && <p className="text-sm text-slate-500">No feedback recorded yet.</p>}
      {d.data.map((r: any) => (
        <Card key={r.id}><CardContent className="p-3 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">{r.project_name}</span>
            <Badge variant="outline">{STAGE[r.stage]}</Badge>
            {r.score && <Badge variant="outline" className="ml-auto">{r.score}/5</Badge>}
          </div>
          <p className="text-slate-600 dark:text-slate-300">{r.notes}</p>
          <p className="text-xs text-slate-500">Spoke to {r.contact_name} on {String(r.call_date).slice(0, 10)}. Recorded by {r.recorded_by_name}.</p>
        </CardContent></Card>
      ))}
    </div>
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
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>When</Label>
          <select className="w-full h-9 rounded-md border bg-transparent px-2" value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value, project_id: "" })}>
            {d.stages.map((s: string) => <option key={s} value={s}>{STAGE[s]}</option>)}
          </select>
        </div>
        <div>
          <Label>Project{f.stage === "post_live" ? " (live projects only)" : ""}</Label>
          <select className="w-full h-9 rounded-md border bg-transparent px-2" value={f.project_id} onChange={(e) => set("project_id", e.target.value)}>
            <option value="">Choose</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Spoke to</Label><Input value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></div>
        <div><Label>Call date</Label><Input type="date" value={f.call_date} onChange={(e) => set("call_date", e.target.value)} /></div>
        <div><Label>Score 1-5 (optional)</Label><Input type="number" min={1} max={5} value={f.score} onChange={(e) => set("score", e.target.value)} /></div>
      </div>
      <div><Label>What the customer said</Label><textarea className="w-full min-h-20 rounded-md border bg-transparent px-2 py-1" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      <Button disabled={!f.stage || !f.project_id || !f.contact_name || !f.call_date || !f.notes} onClick={save}>Record feedback</Button>
    </CardContent></Card>
  );
}
