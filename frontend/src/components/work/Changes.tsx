"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const errMsg = (e: any) => e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";
const COLOR: Record<string, string> = { Requested: "bg-amber-100 text-amber-800", Estimated: "bg-blue-100 text-blue-800", Approved: "bg-green-100 text-green-800", Rejected: "bg-red-100 text-red-800", "In progress": "bg-indigo-100 text-indigo-800", Completed: "bg-slate-200 text-slate-700" };
const money = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Corrections and changes on one project: raised by the coordinator, estimated by the team lead, approved by the project manager against the budget. */
export default function Changes({ projectId }: { projectId: string | number }) {
  const [d, setD] = useState<any>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [form, setForm] = useState({ team_id: "", kind: "Correction", title: "", description: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await api.get(`/work/projects/${projectId}/changes`); setD(r.data); setLocked(null); }
    catch (e: any) { if ([403, 423].includes(e?.response?.status)) setLocked(errMsg(e)); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => { setMsg(null); try { await fn(); await load(); return true; } catch (e: any) { setMsg(errMsg(e)); return false; } };

  if (locked) return <Card><CardContent className="p-4 text-sm">{locked}</CardContent></Card>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {msg && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2">{msg}</div>}

      <Card><CardContent className="p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        {d.departments.map((t: any) => (
          <div key={t.id} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
            <div className="text-xs text-slate-500">{t.name}</div>
            <div className="font-semibold">{money(t.left)} days left</div>
            <div className="text-xs text-slate-500">of {money(t.budget)} person-days</div>
          </div>
        ))}
        {d.departments.length === 0 && <p className="text-slate-500">No department has a budget on this project yet.</p>}
      </CardContent></Card>

      {d.can_raise && d.departments.length > 0 && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Raise a correction or change</CardTitle></CardHeader>
          <CardContent className="pt-3 grid gap-2 sm:grid-cols-2 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
            <div><Label>Department</Label>
              <select className={SELECT} value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                <option value="">Choose</option>{d.departments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
            <div><Label>Type</Label>
              <select className={SELECT} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{d.kinds.map((k: string) => <option key={k}>{k}</option>)}</select></div>
            <div className="sm:col-span-2"><Label>What needs to change</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Details</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button className="sm:col-span-2" disabled={!form.team_id || !form.title}
              onClick={async () => { if (await run(() => api.post(`/work/projects/${projectId}/changes`, { ...form, team_id: Number(form.team_id), description: form.description || null }))) setForm({ ...form, title: "", description: "" }); }}>Send to the team lead</Button>
          </CardContent></Card>
      )}

      {d.changes.length === 0 && <p className="text-sm text-slate-500">No corrections or changes on this project yet.</p>}
      {d.changes.map((c: any) => <ChangeRow key={c.id} c={c} d={d} run={run} />)}
    </div>
  );
}

function ChangeRow({ c, d, run }: { c: any; d: any; run: (fn: () => Promise<any>) => Promise<boolean> }) {
  const [effort, setEffort] = useState(c.effort_days > 0 ? String(c.effort_days) : "");
  const [note, setNote] = useState("");
  const [spent, setSpent] = useState(String(c.time_spent_days || ""));
  const [assignee, setAssignee] = useState(c.assigned_to ? String(c.assigned_to) : "");
  const [overAsk, setOverAsk] = useState(false);
  const decide = (decision: string, over = false) => run(async () => {
    try { await api.post(`/work/changes/${c.id}/decision`, { decision, note: note || null, allow_over_budget: over }); setOverAsk(false); }
    catch (e: any) { if (e?.response?.data?.over_budget) { setOverAsk(true); } throw e; }
  });

  return (
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-900 dark:text-white">{c.title}</span>
        <span className="text-xs text-slate-500">{c.kind} · {c.team}</span>
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${COLOR[c.status]}`}>{c.status}</span>
      </div>
      {c.description && <p className="text-slate-600 dark:text-slate-300">{c.description}</p>}
      <p className="text-xs text-slate-500">Raised by {c.requested_by_name || "-"}{c.effort_days > 0 && <> · {c.effort_days} day(s)</>}{c.assignee && <> · assigned to {c.assignee}</>}{c.time_spent_days > 0 && <> · {c.time_spent_days} day(s) spent</>}{c.decision_note && <> · note: {c.decision_note}</>}</p>

      {c.can_estimate && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Effort (days)</Label><Input inputMode="decimal" value={effort} onChange={(e) => setEffort(e.target.value)} /></div>
          <Button className="col-span-2" disabled={!effort} onClick={() => run(() => api.post(`/work/changes/${c.id}/estimate`, { effort_days: Number(effort) }))}>Send for approval</Button>
        </div>
      )}

      {d.is_manager && c.status === "Estimated" && (
        <div className="space-y-2">
          <div><Label>Note (needed to reject)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => decide("approve")}>Approve</Button>
            {overAsk && <Button variant="outline" onClick={() => decide("approve", true)}>Approve anyway, over budget</Button>}
            <Button variant="outline" onClick={() => decide("reject")}>Reject</Button>
          </div>
        </div>
      )}

      {c.can_assign && (
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div><Label>Assign to</Label>
            <select className={SELECT} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Choose</option>{(d.members[c.team_id] || []).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></div>
          <Button variant="outline" disabled={!assignee} onClick={() => run(() => api.post(`/work/changes/${c.id}/assign`, { assigned_to: Number(assignee) }))}>Assign</Button>
        </div>
      )}

      {c.can_work && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div><Label>Days spent</Label><Input inputMode="decimal" value={spent} onChange={(e) => setSpent(e.target.value)} /></div>
          <div><Label>Note (why it took longer)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          {c.status === "Approved" && <Button variant="outline" onClick={() => run(() => api.post(`/work/changes/${c.id}/progress`, { status: "In progress" }))}>Start</Button>}
          <Button onClick={() => run(() => api.post(`/work/changes/${c.id}/progress`, { status: "Completed", time_spent_days: spent ? Number(spent) : null, note: note || null }))}>Mark completed</Button>
        </div>
      )}
    </CardContent></Card>
  );
}
