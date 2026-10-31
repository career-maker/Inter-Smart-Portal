"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";
const STATUS_COLOR = (s: string) =>
  s === "Completed" ? "bg-green-100 text-green-800" : s === "Rejected" ? "bg-red-100 text-red-800" : s.startsWith("Correction") ? "bg-orange-100 text-orange-800"
    : s.startsWith("Internal") ? "bg-purple-100 text-purple-800" : s === "Waiting for feedback" ? "bg-blue-100 text-blue-800" : s === "Ongoing" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";

/** UI department tab: pages, sections, status chain and per-page budgets. Used on the work view of a project. */
export default function UiPages({ projectId }: { projectId: string | number }) {
  const [d, setD] = useState<any>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", animation_level: "None", est_sections: "", figma_url: "" });

  const load = useCallback(async () => {
    try { const r = await api.get(`/work/projects/${projectId}/ui`); setD(r.data); setLocked(null); }
    catch (e: any) { if (e?.response?.status === 423) setLocked(errMsg(e)); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(); } catch (e: any) { alert(errMsg(e)); } };

  if (locked) return <Card><CardContent className="p-4 text-sm">{locked}</CardContent></Card>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const approved = d.pages.filter((p: any) => p.approval === "Approved");
  const done = approved.filter((p: any) => p.status === "Completed").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[["Pages", `${approved.length}${d.pages_allowed ? ` of ${d.pages_allowed} sold` : ""}`], ["Completed", `${done} of ${approved.length}`],
          ["Design person-days", money(d.budget.cap)], ["Left to give pages", money(d.budget.left)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"><div className="text-xs text-slate-500">{k}</div><div className="font-semibold">{v}</div></div>
        ))}
      </div>

      {d.can_manage && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Add a page</CardTitle></CardHeader>
          <CardContent className="pt-3 grid sm:grid-cols-5 gap-2 items-end">
            <div className="sm:col-span-2"><Label>Page title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Animation</Label><SelectCompat className={SELECT} value={form.animation_level} onChange={(e) => setForm({ ...form, animation_level: e.target.value })}>{d.animation_levels.map((a: string) => <option key={a}>{a}</option>)}</SelectCompat></div>
            <div><Label>Sections planned</Label><Input type="number" min="1" value={form.est_sections} onChange={(e) => setForm({ ...form, est_sections: e.target.value })} /></div>
            <Button disabled={!form.title} onClick={() => run(async () => {
              const r = await api.post(`/work/projects/${projectId}/ui/pages`, { title: form.title, animation_level: form.animation_level, est_sections: form.est_sections ? Number(form.est_sections) : null, figma_url: form.figma_url || null });
              if (r.data.needs_approval) alert("This is more pages than were sold, so it now waits for the project manager to approve it.");
              setForm({ title: "", animation_level: "None", est_sections: "", figma_url: "" });
            })}><Plus className="h-4 w-4 mr-1" />Add page</Button>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">#</th><th className="p-3">Page</th><th className="p-3">Status</th><th className="p-3">Assigned to</th><th className="p-3">Sections</th><th className="p-3 text-right">Days</th><th className="p-3" /></tr></thead>
          <tbody>
            {d.pages.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">{p.position}</td>
                <td className="p-3"><div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                  <div className="text-xs text-slate-500">Animation: {p.animation_level}{p.due_date ? ` · due ${p.due_date}` : ""}</div>
                  {p.approval !== "Approved" && <Badge className={p.approval === "Pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>{p.approval === "Pending" ? "Waiting for project manager" : "Rejected by project manager"}</Badge>}</td>
                <td className="p-3">
                  {d.can_work && p.approval === "Approved" ? (
                    <SelectCompat className={`rounded-full px-2 py-1 text-xs font-semibold border-0 ${STATUS_COLOR(p.status)}`} value={p.status} onChange={(e) => {
                      let note: string | null = null;
                      if (e.target.value === "Rejected") { note = prompt("Why is this page rejected?"); if (!note) return; }
                      run(() => api.post(`/work/ui/pages/${p.id}/status`, { status: e.target.value, note }));
                    }}>{d.statuses.map((s: string) => <option key={s}>{s}</option>)}</SelectCompat>
                  ) : <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR(p.status)}`}>{p.status}</span>}
                </td>
                <td className="p-3">{p.assignee || <span className="text-slate-400">Not assigned</span>}</td>
                <td className="p-3">{p.sections_count}{p.est_sections ? ` / ${p.est_sections}` : ""}</td>
                <td className="p-3 text-right">{p.budget ? money(p.budget) : "-"}</td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  {d.is_manager && p.approval === "Pending" && <>
                    <Button size="sm" onClick={() => run(() => api.post(`/work/ui/pages/${p.id}/decision`, { decision: "approve" }))}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => { const n = prompt("Why is this page rejected?"); if (n) return run(() => api.post(`/work/ui/pages/${p.id}/decision`, { decision: "reject", note: n })); }}>Reject</Button>
                  </>}
                  <Button size="sm" variant="outline" onClick={() => setOpenId(p.id)}>Open</Button>
                </td>
              </tr>
            ))}
            {d.pages.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No pages yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {openId !== null && <PageDialog id={openId} d={d} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function PageDialog({ id, d, onClose, onChanged }: { id: number; d: any; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [status, setStatus] = useState({ status: "", update_type: "", note: "" });
  const [sec, setSec] = useState({ title: "", subtitle: "", statistics: "", content: "", description: "" });
  const [subOf, setSubOf] = useState<number | null>(null);

  // The form is filled from the server once, and again only after something was saved. A background reload must never wipe what someone is typing.
  const load = useCallback(async (force = false) => {
    const r = await api.get(`/work/ui/pages/${id}`);
    setData(r.data);
    const p = r.data.page;
    const fresh = { title: p.title, animation_level: p.animation_level, est_sections: p.est_sections ?? "", budget: p.budget ?? "", figma_url: p.figma_url ?? "", due_date: p.due_date ?? "", assigned_to: p.assigned_to ?? "" };
    setEdit((cur: any) => (cur && !force ? cur : fresh));
    setStatus((s) => (s.status && !force ? s : { ...s, status: p.status }));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(true); onChanged(); } catch (e: any) { alert(errMsg(e)); } };
  if (!data || !edit) return null;
  const page = data.page;
  const frozen = page.approval !== "Approved";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 py-4 pr-14 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg">{page.title}</DialogTitle>
          <p className="text-xs text-slate-500">{page.status}{page.approval !== "Approved" ? ` · ${page.approval}` : ""}</p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500 [&>*]:shrink-0">

          {d.can_manage && (
            <Card><CardHeader className="pb-0"><CardTitle className="text-base">Page details</CardTitle></CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 gap-2">
                <div className="col-span-2"><Label>Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
                <div><Label>Animation</Label><SelectCompat className={SELECT} value={edit.animation_level} onChange={(e) => setEdit({ ...edit, animation_level: e.target.value })}>{d.animation_levels.map((a: string) => <option key={a}>{a}</option>)}</SelectCompat></div>
                <div><Label>Sections planned</Label><Input type="number" min="1" value={edit.est_sections} onChange={(e) => setEdit({ ...edit, est_sections: e.target.value })} /></div>
                <div><Label>Person-days</Label><Input type="number" min="0" step="0.5" value={edit.budget} onChange={(e) => setEdit({ ...edit, budget: e.target.value })} /></div>
                <div><Label>Due date</Label><Input type="date" value={edit.due_date} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} /></div>
                <div className="col-span-2"><Label>Figma link</Label><Input placeholder="https://" value={edit.figma_url} onChange={(e) => setEdit({ ...edit, figma_url: e.target.value })} /></div>
                <div className="col-span-2"><Label>Assigned to</Label>
                  <SelectCompat className={SELECT} value={edit.assigned_to} onChange={(e) => setEdit({ ...edit, assigned_to: e.target.value })}>
                    <option value="">Not assigned</option>{d.ui_team.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </SelectCompat></div>
                <Button className="col-span-2" onClick={() => run(() => api.put(`/work/ui/pages/${id}`, {
                  title: edit.title, animation_level: edit.animation_level, est_sections: edit.est_sections === "" ? null : Number(edit.est_sections),
                  budget: edit.budget === "" ? null : Number(edit.budget), figma_url: edit.figma_url || null, due_date: edit.due_date || null, assigned_to: edit.assigned_to ? Number(edit.assigned_to) : null,
                }))}>Save details</Button>
              </CardContent></Card>
          )}
          {!d.can_manage && page.figma_url && <a href={page.figma_url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline">Open Figma design</a>}

          {d.can_work && !frozen && (
            <Card><CardHeader className="pb-0"><CardTitle className="text-base">Change status</CardTitle></CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 gap-2">
                <div><Label>Status</Label><SelectCompat className={SELECT} value={status.status} onChange={(e) => setStatus({ ...status, status: e.target.value })}>{d.statuses.map((s: string) => <option key={s}>{s}</option>)}</SelectCompat></div>
                <div><Label>Update type</Label><SelectCompat className={SELECT} value={status.update_type} onChange={(e) => setStatus({ ...status, update_type: e.target.value })}><option value="">None</option>{d.update_types.map((t: string) => <option key={t}>{t}</option>)}</SelectCompat></div>
                <div className="col-span-2"><Label>Note{status.status === "Rejected" ? " (required)" : ""}</Label><Input value={status.note} onChange={(e) => setStatus({ ...status, note: e.target.value })} /></div>
                <Button className="col-span-2" disabled={status.status === page.status} onClick={() => run(async () => { await api.post(`/work/ui/pages/${id}/status`, { status: status.status, update_type: status.update_type || null, note: status.note || null }); setStatus({ status: status.status, update_type: "", note: "" }); })}>Update status</Button>
              </CardContent></Card>
          )}

          <Card><CardHeader className="pb-0"><CardTitle className="text-base">Sections</CardTitle></CardHeader>
            <CardContent className="pt-3 space-y-3">
              {data.sections.length === 0 && <p className="text-sm text-slate-500">No sections yet.</p>}
              {data.sections.map((s: any) => (
                <div key={s.id} className="border rounded-lg p-2 text-sm space-y-1">
                  <SectionRow s={s} canEdit={d.can_work && !frozen} run={run} onSub={() => setSubOf(s.id)} />
                  {s.children.map((c: any) => <div key={c.id} className="ml-4 border-l pl-2"><SectionRow s={c} canEdit={d.can_work && !frozen} run={run} /></div>)}
                </div>
              ))}
              {d.can_work && !frozen && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <p className="col-span-2 text-xs text-slate-500">{subOf ? "Adding a sub-section" : "Adding a section"}{subOf && <button className="ml-2 underline" onClick={() => setSubOf(null)}>cancel</button>}</p>
                  <div className="col-span-2"><Label>Title</Label><Input value={sec.title} onChange={(e) => setSec({ ...sec, title: e.target.value })} /></div>
                  <div><Label>Subtitle</Label><Input value={sec.subtitle} onChange={(e) => setSec({ ...sec, subtitle: e.target.value })} /></div>
                  <div><Label>Statistics</Label><Input value={sec.statistics} onChange={(e) => setSec({ ...sec, statistics: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Content</Label><Input value={sec.content} onChange={(e) => setSec({ ...sec, content: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Description</Label><Input value={sec.description} onChange={(e) => setSec({ ...sec, description: e.target.value })} /></div>
                  <Button className="col-span-2" disabled={!sec.title} onClick={() => run(async () => {
                    await api.post(`/work/ui/pages/${id}/sections`, { ...Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v || null])), title: sec.title, parent_id: subOf });
                    setSec({ title: "", subtitle: "", statistics: "", content: "", description: "" }); setSubOf(null);
                  })}>Add {subOf ? "sub-section" : "section"}</Button>
                </div>
              )}
            </CardContent></Card>

          <Card><CardHeader className="pb-0"><CardTitle className="text-base">History</CardTitle></CardHeader>
            <CardContent className="pt-3 space-y-1 text-sm">
              {data.events.length === 0 && <p className="text-slate-500">No changes yet.</p>}
              {data.events.map((e: any) => (
                <div key={e.id} className="border-b last:border-0 py-1">
                  <span className="font-medium">{e.from_status} to {e.to_status}</span>{e.update_type ? <Badge variant="outline" className="ml-2">{e.update_type}</Badge> : null}
                  <div className="text-xs text-slate-500">{e.user || "Someone"} · {String(e.created_at).slice(0, 16).replace("T", " ")}{e.note ? ` · ${e.note}` : ""}</div>
                </div>
              ))}
            </CardContent></Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionRow({ s, canEdit, run, onSub }: { s: any; canEdit: boolean; run: (fn: () => Promise<any>) => void; onSub?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: s.title, subtitle: s.subtitle ?? "", statistics: s.statistics ?? "", content: s.content ?? "", description: s.description ?? "" });
  if (editing) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(["title", "subtitle", "statistics", "content", "description"] as const).map((k) => (
          <div key={k} className={k === "title" || k === "content" || k === "description" ? "col-span-2" : ""}><Label>{k[0].toUpperCase() + k.slice(1)}</Label><Input value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <div className="col-span-2 flex gap-2">
          <Button size="sm" disabled={!f.title} onClick={() => run(async () => { await api.put(`/work/ui/sections/${s.id}`, Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v || null]))); setEditing(false); })}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2"><span className="font-medium">{s.title}</span>{s.subtitle && <span className="text-slate-500">{s.subtitle}</span>}
        {canEdit && <span className="ml-auto space-x-1 whitespace-nowrap">
          {onSub && <Button size="sm" variant="ghost" onClick={onSub}>+ Sub</Button>}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${s.title}"?`) && run(() => api.delete(`/work/ui/sections/${s.id}`))}>Delete</Button>
        </span>}</div>
      {(s.statistics || s.content || s.description) && <div className="text-xs text-slate-500 space-y-0.5 mt-1">{s.statistics && <div>Statistics: {s.statistics}</div>}{s.content && <div>Content: {s.content}</div>}{s.description && <div>{s.description}</div>}</div>}
    </div>
  );
}
