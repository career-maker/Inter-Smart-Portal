"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const num = (n: number | string) => Number(n || 0).toString();
const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";
const COLOR: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700", Submitted: "bg-amber-100 text-amber-800", Approved: "bg-blue-100 text-blue-800", Rejected: "bg-red-100 text-red-800",
  Scheduled: "bg-purple-100 text-purple-800", "In progress": "bg-amber-100 text-amber-800", Completed: "bg-green-100 text-green-800",
};

/** UX / Dev tab: sprints with effort, approval against the department budget, dates, and daily progress. */
export default function Sprints({ projectId }: { projectId: string | number }) {
  const [d, setD] = useState<any>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState({ team_id: "", title: "" });

  const load = useCallback(async () => {
    try { const r = await api.get(`/work/projects/${projectId}/sprints`); setD(r.data); setLocked(null); }
    catch (e: any) { if (e?.response?.status === 423) setLocked(errMsg(e)); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(); } catch (e: any) { alert(errMsg(e)); } };

  if (locked) return <Card><CardContent className="p-4 text-sm">{locked}</CardContent></Card>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const planners = d.departments.filter((x: any) => x.can_plan);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {d.departments.map((x: any) => (
          <div key={x.id} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
            <div className="text-xs text-slate-500">{x.name} person-days</div>
            <div className="font-semibold">{money(x.budget)}</div>
            <div className="text-xs text-slate-500">Approved work {money(x.approved_cost)} · left {money(x.left)}</div>
          </div>
        ))}
        {d.departments.length === 0 && <p className="col-span-4 text-sm text-slate-500">No UX or Dev department has a budget on this project yet.</p>}
      </div>

      {planners.length > 0 && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Plan a sprint</CardTitle></CardHeader>
          <CardContent className="pt-3 grid sm:grid-cols-4 gap-2 items-end">
            <div><Label>Department</Label><SelectCompat className={SELECT} value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}><option value="">Select</option>{planners.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectCompat></div>
            <div><Label>Sprint title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <Button disabled={!form.team_id || !form.title} onClick={() => run(async () => {
              const r = await api.post(`/work/projects/${projectId}/sprints`, { team_id: Number(form.team_id), title: form.title });
              setForm({ team_id: "", title: "" }); setOpenId(r.data.data.id);
            })}>Create sprint</Button>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">Sprint</th><th className="p-3">Department</th><th className="p-3">Status</th><th className="p-3 text-right">Effort</th><th className="p-3">Tasks</th><th className="p-3">Dates</th><th className="p-3" /></tr></thead>
          <tbody>
            {d.sprints.map((s: any) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-slate-900 dark:text-white">{s.title}</td>
                <td className="p-3">{s.team}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${COLOR[s.status]}`}>{s.status}</span></td>
                <td className="p-3 text-right">{num(s.effort_days)} d</td>
                <td className="p-3">{s.items_approved} of {s.items_count} done</td>
                <td className="p-3">{s.start_date ? `${s.start_date} to ${s.end_date}` : s.requested_start ? `asked ${s.requested_start} to ${s.requested_end}` : "-"}</td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>Open</Button></td>
              </tr>
            ))}
            {d.sprints.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">No sprints yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {openId !== null && <SprintDialog id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function SprintDialog({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<any>(null);
  const [item, setItem] = useState({ title: "", effort_days: "", assigned_to: "" });
  const [dates, setDates] = useState({ start: "", end: "" });
  const [note, setNote] = useState("");

  const [ready, setReady] = useState(false);
  // Cost and dates are filled from the server once, and again only after something was saved, so a background reload never wipes typing.
  const load = useCallback(async (force = false) => {
    const r = await api.get(`/work/sprints/${id}`);
    setD(r.data);
    setReady((was) => {
      if (!was || force) { setDates({ start: r.data.sprint.requested_start || "", end: r.data.sprint.requested_end || "" }); }
      return true;
    });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(true); onChanged(); } catch (e: any) { alert(errMsg(e)); } };
  if (!d) return null;
  const s = d.sprint;
  const editable = ["Draft", "Rejected"].includes(s.status) && d.can_manage;
  const working = ["Scheduled", "In progress"].includes(s.status);

  const setItemStatus = async (it: any, patch: any) => {
    try { await api.post(`/work/sprint-items/${it.id}/status`, { status: it.status, ...patch }); }
    catch (e: any) {
      if (/effort was exceeded/i.test(errMsg(e))) {
        const why = prompt(errMsg(e)); if (!why) return;
        try { await api.post(`/work/sprint-items/${it.id}/status`, { status: it.status, ...patch, note: why }); } catch (e2: any) { alert(errMsg(e2)); return; }
      } else { alert(errMsg(e)); return; }
    }
    await load(true); onChanged();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 py-4 pr-14 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg">{s.title}</DialogTitle>
          <p className="text-xs text-slate-500">{s.team} · <span className={`px-2 py-0.5 rounded-full font-semibold ${COLOR[s.status]}`}>{s.status}</span></p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500 [&>*]:shrink-0">

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Effort planned", `${num(d.totals.effort_days)} days`], ["Time spent", `${num(d.totals.spent_days)} days`], ["Department person-days", money(d.budget.department)], ["Left after other sprints", money(d.budget.left)]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"><div className="text-xs text-slate-500">{k}</div><div className="font-semibold">{v}</div></div>
            ))}
          </div>
          {s.decision_note && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">Decision note: {s.decision_note}</p>}

          {editable && (
            <Card><CardContent className="pt-5 grid grid-cols-3 gap-2 items-end">
            </CardContent></Card>
          )}

          <Card><CardHeader className="pb-0"><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
            <CardContent className="pt-3 space-y-2">
              {d.items.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
              {d.items.map((it: any) => (
                <div key={it.id} className="border rounded-lg p-2 text-sm space-y-2">
                  <div className="flex items-center gap-2"><span className="font-medium">{it.title}</span><span className="ml-auto text-slate-500">{num(it.effort_days)} d planned</span>
                    {editable && <Button size="sm" variant="ghost" onClick={() => run(() => api.delete(`/work/sprint-items/${it.id}`))}>Remove</Button>}</div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div><Label>Assigned to</Label>
                      {d.can_manage && ["Draft", "Rejected", "Approved", "Scheduled", "In progress"].includes(s.status) ? (
                        <SelectCompat className={SELECT} value={it.assigned_to ?? ""} onChange={(e) => run(() => api.put(`/work/sprint-items/${it.id}`, { assigned_to: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">Not assigned</option>{d.members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </SelectCompat>) : <div className="h-10 flex items-center">{it.assignee || "Not assigned"}</div>}
                    </div>
                    <div><Label>Status</Label>
                      {working ? <SelectCompat className={SELECT} value={it.status} onChange={(e) => setItemStatus({ ...it, status: e.target.value }, {})}>{d.item_statuses.map((x: string) => <option key={x}>{x}</option>)}</SelectCompat>
                        : <div className="h-10 flex items-center">{it.status}</div>}
                    </div>
                    <div><Label>Days spent</Label>
                      {working ? <Input type="number" min="0" step="0.5" defaultValue={num(it.time_spent_days)} onBlur={(e) => { if (Number(e.target.value) !== Number(it.time_spent_days)) setItemStatus(it, { time_spent_days: Number(e.target.value) }); }} />
                        : <div className="h-10 flex items-center">{num(it.time_spent_days)}</div>}
                    </div>
                  </div>
                </div>
              ))}
              {editable && (
                <div className="grid grid-cols-3 gap-2 items-end pt-2 border-t">
                  <div className="col-span-3"><Label>New task</Label><Input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} /></div>
                  <div><Label>Effort (days)</Label><Input type="number" min="0" step="0.5" value={item.effort_days} onChange={(e) => setItem({ ...item, effort_days: e.target.value })} /></div>
                  <div><Label>Assign to</Label><SelectCompat className={SELECT} value={item.assigned_to} onChange={(e) => setItem({ ...item, assigned_to: e.target.value })}><option value="">Later</option>{d.members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</SelectCompat></div>
                  <Button disabled={!item.title || !item.effort_days} onClick={() => run(async () => { await api.post(`/work/sprints/${id}/items`, { title: item.title, effort_days: Number(item.effort_days), assigned_to: item.assigned_to ? Number(item.assigned_to) : null }); setItem({ title: "", effort_days: "", assigned_to: "" }); })}>Add task</Button>
                </div>
              )}
            </CardContent></Card>

          {editable && <Button className="w-full" onClick={() => run(() => api.post(`/work/sprints/${id}/submit`))}>Submit for approval</Button>}

          {s.status === "Submitted" && d.is_manager && (
            <Card><CardHeader className="pb-0"><CardTitle className="text-base">Decision</CardTitle></CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 gap-2 items-end">
                <div className="col-span-2"><Label>Note (needed to reject)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <Button onClick={async () => {
                  try { await api.post(`/work/sprints/${id}/decision`, { decision: "approve", note: note || null }); await load(true); onChanged(); }
                  catch (e: any) {
                    if (e?.response?.data?.over_budget && confirm(`${e.response.data.message}\n\nApprove anyway? The Super Admin will be told.`)) { await run(() => api.post(`/work/sprints/${id}/decision`, { decision: "approve", note: note || null, allow_over_budget: true })); }
                    else if (!e?.response?.data?.over_budget) alert(errMsg(e));
                  }
                }}>Approve</Button>
                <Button variant="outline" onClick={() => run(() => api.post(`/work/sprints/${id}/decision`, { decision: "reject", note: note || null }))}>Reject</Button>
              </CardContent></Card>
          )}

          {s.status === "Approved" && (d.is_coordinator || d.is_manager || d.can_manage) && (
            <Card><CardHeader className="pb-0"><CardTitle className="text-base">Dates</CardTitle></CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 gap-2 items-end">
                <div><Label>Start</Label><Input type="date" value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} /></div>
                <div><Label>End</Label><Input type="date" value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} /></div>
                {(d.is_coordinator || d.is_manager) && <Button variant="outline" disabled={!dates.start || !dates.end} onClick={() => run(() => api.post(`/work/sprints/${id}/request-dates`, dates))}>Request these dates</Button>}
                {d.can_manage && <Button disabled={!dates.start || !dates.end} onClick={() => run(() => api.post(`/work/sprints/${id}/schedule`, dates))}>Confirm and schedule</Button>}
              </CardContent></Card>
          )}
          {s.start_date && <p className="text-sm">Scheduled: {s.start_date} to {s.end_date}</p>}

          <Card><CardHeader className="pb-0"><CardTitle className="text-base">History</CardTitle></CardHeader>
            <CardContent className="pt-3 space-y-1 text-sm">
              {d.events.map((e: any) => (
                <div key={e.id} className="border-b last:border-0 py-1"><span className="font-medium">{e.from_status ? `${e.from_status} to ${e.to_status}` : e.to_status}</span>
                  <div className="text-xs text-slate-500">{e.user || "Someone"} · {String(e.created_at).slice(0, 16).replace("T", " ")}{e.note ? ` · ${e.note}` : ""}</div></div>
              ))}
            </CardContent></Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
