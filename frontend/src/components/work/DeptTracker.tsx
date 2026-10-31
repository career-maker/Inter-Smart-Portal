"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Kind = "design" | "frontend" | "dev";
type Col = { key: string; label: string; type?: "select" | "text" | "num"; options?: string[]; get?: (r: any) => string | number };

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";
const num = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const TITLE: Record<Kind, string> = { design: "Design", frontend: "Frontend (HTML)", dev: "Dev" };

/** Department table for a project: Design pages, Frontend (HTML) pages with timeline sub-tasks, or Dev tasks. Sort and filter on every column. */
export default function DeptTracker({ projectId, kind }: { projectId: string | number; kind: Kind }) {
  const [d, setD] = useState<any>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const empty = { no: "", name: "", priority: "P2", status: kind === "dev" ? "Not started" : "Yet to start", link: "", work_type: "Backend", client_status: "Not shared", members: [] as number[], days: "", hours: "", subtasks: [] as { title: string; hours: string; create_task?: boolean }[] };
  const [form, setForm] = useState<any>(empty);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get(`/work/projects/${projectId}/tracker/${kind}`); setD(r.data); setLocked(null); }
    catch (e: any) { if (e?.response?.status === 423) setLocked(errMsg(e)); }
  }, [projectId, kind]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(); } catch (e: any) { alert(errMsg(e)); } };

  const cols: Col[] = useMemo(() => {
    if (!d) return [];
    const mem: Col = { key: "members", label: kind === "design" ? "Design team" : kind === "frontend" ? "HTML team" : "Assigned to", get: (r) => (r.member_names || []).join(", ") };
    if (kind === "design") return [
      { key: "no", label: "Page no", type: "num" }, { key: "name", label: "Page name" }, { key: "priority", label: "Priority", type: "select", options: d.options.priorities },
      { key: "status", label: "Design status", type: "select", options: d.options.statuses }, { key: "link", label: "Design link" }, mem,
      { key: "client_status", label: "Client status", type: "select", options: d.options.client }, { key: "days", label: "Days used", type: "num" }];
    if (kind === "frontend") return [
      { key: "no", label: "Page no", type: "num" }, { key: "name", label: "Page name" }, { key: "status", label: "HTML status", type: "select", options: d.options.statuses },
      { key: "link", label: "HTML link" }, mem, { key: "planned_hours", label: "Planned (hrs)", type: "num" }];
    return [
      { key: "no", label: "Task no", type: "num" }, { key: "name", label: "Task name" }, { key: "work_type", label: "Work type", type: "select", options: d.options.work_types },
      mem, { key: "status", label: "Progress", type: "select", options: d.options.progress }, { key: "hours", label: "Time (hrs)", type: "num" }];
  }, [d, kind]);

  const rows = useMemo(() => {
    if (!d) return [];
    const val = (r: any, c: Col) => (c.get ? c.get(r) : r[c.key]) ?? "";
    let out = d.rows.filter((r: any) => cols.every((c) => !filters[c.key] || String(val(r, c)).toLowerCase().includes(filters[c.key].toLowerCase())));
    if (sort) {
      const c = cols.find((x) => x.key === sort.key)!;
      out = [...out].sort((a: any, b: any) => (c.type === "num" ? Number(val(a, c)) - Number(val(b, c)) : String(val(a, c)).localeCompare(String(val(b, c)), undefined, { numeric: true })) * sort.dir);
    }
    return out;
  }, [d, cols, filters, sort]);

  if (locked) return <Card><CardContent className="p-4 text-sm">{locked}</CardContent></Card>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const s = d.summary;
  const hrs = kind !== "design";
  const cards: [string, string, boolean?][] = [
    ["Total allocated (by PM)", `${num(s.allocated_days)} days${hrs ? ` · ${num(s.allocated_hours)} hrs` : ""}`],
    ["Total used (from the table)", `${num(s.used_days)} days${hrs ? ` · ${num(s.used_hours)} hrs` : ""}`],
    ["Deviation from allocated", `${s.deviation_days < 0 ? "Over by " : "Left "}${num(Math.abs(s.deviation_days))} days${hrs ? ` · ${num(Math.abs(s.deviation_hours))} hrs` : ""}`, s.deviation_days < 0],
  ];

  const startEdit = (r: any) => {
    setEditId(r.id); setShowForm(true);
    setForm({ no: r.no, name: r.name, priority: r.priority || "P2", status: r.status, link: r.link || "", work_type: r.work_type || "Backend", client_status: r.client_status || "Not shared", members: r.members || [], days: r.days ?? "", hours: r.hours ?? "", subtasks: [] });
  };
  const payload = () => {
    const p: any = { name: form.name, status: form.status, link: form.link || null, members: form.members, no: form.no ? Number(form.no) : undefined };
    if (kind === "design") Object.assign(p, { priority: form.priority, client_status: form.client_status, days: form.days === "" ? null : Number(form.days) });
    if (kind === "dev") Object.assign(p, { work_type: form.work_type, hours: form.hours === "" ? null : Number(form.hours) });
    if (kind === "frontend" && !editId) p.subtasks = form.subtasks.filter((x: any) => x.title).map((x: any) => ({ title: x.title, hours: Number(x.hours || 0), create_task: !!x.create_task }));
    return p;
  };
  const save = () => run(async () => {
    if (editId) await api.put(`/work/tracker/rows/${editId}`, payload()); else await api.post(`/work/projects/${projectId}/tracker/${kind}`, payload());
    setForm(empty); setEditId(null); setShowForm(false);
  });
  const toggleMember = (id: number) => setForm({ ...form, members: form.members.includes(id) ? form.members.filter((x: number) => x !== id) : [...form.members, id] });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{TITLE[kind]}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {cards.map(([k, v, bad], i) => {
          const c = ["#0780B7", "#00BDA1", "#FE586E"][i]; // blue, teal, coral from the portal palette
          return (
            <div key={k} className="rounded-[14px] border px-4 py-3" style={{ backgroundColor: `${c}14`, borderColor: `${c}55`, borderLeftWidth: 4, borderLeftColor: c }}>
              <div className="text-xs font-medium" style={{ color: c }}>{k}</div>
              <div className="text-base font-bold" style={{ color: bad ? "#C2334D" : c }}>{v}</div>
            </div>
          );
        })}
      </div>

      {d.can_edit && (
        <div>
          {!showForm && <Button onClick={() => { setForm(empty); setEditId(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />{kind === "dev" ? "Add task" : "Add page"}</Button>}
          {showForm && (
            <Card><CardHeader className="pb-0"><CardTitle className="text-base">{editId ? "Edit" : "Add"} {kind === "dev" ? "task" : "page"}</CardTitle></CardHeader>
              <CardContent className="pt-3 grid sm:grid-cols-4 gap-2 items-end [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
                <div><Label>{kind === "dev" ? "Task no" : "Page no"}</Label><Input type="number" min="1" value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} placeholder="auto" /></div>
                <div className="sm:col-span-2"><Label>{kind === "dev" ? "Task name" : "Page name"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                {kind === "design" && <div><Label>Priority</Label><SelectCompat className={SELECT} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{d.options.priorities.map((x: string) => <option key={x}>{x}</option>)}</SelectCompat></div>}
                {kind === "dev" && <div><Label>Work type</Label><SelectCompat className={SELECT} value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value })}>{d.options.work_types.map((x: string) => <option key={x}>{x}</option>)}</SelectCompat></div>}
                <div><Label>{kind === "dev" ? "Progress" : kind === "design" ? "Design status" : "HTML status"}</Label><SelectCompat className={SELECT} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{(kind === "dev" ? d.options.progress : d.options.statuses).map((x: string) => <option key={x}>{x}</option>)}</SelectCompat></div>
                {kind !== "dev" && <div className="sm:col-span-2"><Label>{kind === "design" ? "Design link" : "HTML link"}</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://" /></div>}
                {kind === "design" && <div><Label>Client status</Label><SelectCompat className={SELECT} value={form.client_status} onChange={(e) => setForm({ ...form, client_status: e.target.value })}>{d.options.client.map((x: string) => <option key={x}>{x}</option>)}</SelectCompat></div>}
                {kind === "design" && <div><Label>Days used</Label><Input type="number" min="0" step="0.5" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></div>}
                {kind === "dev" && <div><Label>Time (hrs)</Label><Input type="number" min="0" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>}
                <div className="sm:col-span-4"><Label>{kind === "design" ? "Design team member(s)" : kind === "frontend" ? "HTML team member(s)" : "Assigned to"}</Label>
                  <div className="flex flex-wrap gap-2">{d.options.members.length === 0 && <span className="text-xs text-slate-500">No team members found for this department.</span>}
                    {d.options.members.map((m: any) => (
                      <label key={m.id} className={`px-2 py-1 rounded-md border text-xs cursor-pointer select-none ${form.members.includes(m.id) ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : ""}`}>
                        <input type="checkbox" className="sr-only" checked={form.members.includes(m.id)} onChange={() => toggleMember(m.id)} />{m.name}
                      </label>
                    ))}</div></div>
                {kind === "frontend" && !editId && d.can_edit_hours && (
                  <div className="sm:col-span-4 space-y-2"><Label>Timeline: sub-tasks with hours</Label>
                    {form.subtasks.map((t: any, i: number) => (
                      <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
                        <Input placeholder="Sub-task" value={t.title} onChange={(e) => setForm({ ...form, subtasks: form.subtasks.map((x: any, j: number) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                        <Input type="number" min="0" step="0.5" placeholder="Hours" value={t.hours} onChange={(e) => setForm({ ...form, subtasks: form.subtasks.map((x: any, j: number) => (j === i ? { ...x, hours: e.target.value } : x)) })} />
                        <label className="col-span-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={!!t.create_task} onChange={(e) => setForm({ ...form, subtasks: form.subtasks.map((x: any, j: number) => (j === i ? { ...x, create_task: e.target.checked } : x)) })} />Create a task on the Tasks page (for the selected HTML team members, unassigned if none)</label>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_: any, j: number) => j !== i) })} aria-label="Remove sub-task"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, subtasks: [...form.subtasks, { title: "", hours: "" }] })}><Plus className="h-3.5 w-3.5 mr-1" />Add sub-task</Button>
                  </div>
                )}
                <div className="sm:col-span-4 flex gap-2">
                  <Button disabled={!form.name} onClick={save}>{editId ? "Save changes" : kind === "dev" ? "Add task" : "Add page"}</Button>
                  <Button variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(empty); }}>Cancel</Button>
                </div>
              </CardContent></Card>
          )}
        </div>
      )}

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              {kind === "frontend" && <th className="p-2 w-8" />}
              {cols.map((c) => (
                <th key={c.key} className="p-2 whitespace-nowrap">
                  <button className="inline-flex items-center gap-1 font-semibold" onClick={() => setSort(sort?.key === c.key ? (sort.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>
                    {c.label}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              <th className="p-2" />
            </tr>
            <tr className="border-b">
              {kind === "frontend" && <th />}
              {cols.map((c) => (
                <th key={c.key} className="p-1 font-normal">
                  {c.type === "select"
                    ? <SelectCompat className="w-full h-8 rounded-md border bg-transparent px-1 text-xs" value={filters[c.key] || ""} onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })}><option value="">All</option>{c.options!.map((o) => <option key={o}>{o}</option>)}</SelectCompat>
                    : <Input className="h-8 text-xs" placeholder="Filter" value={filters[c.key] || ""} onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })} />}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={cols.length + 2}>{d.rows.length === 0 ? "Nothing added yet." : "No rows match the filters."}</td></tr>}
            {rows.map((r: any) => (
              <Fragment key={r.id}>
                <tr className="border-b last:border-0 align-top">
                  {kind === "frontend" && <td className="p-2"><button onClick={() => setOpenRow(openRow === r.id ? null : r.id)} aria-label="Show timeline">{openRow === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></td>}
                  {cols.map((c) => (
                    <td key={c.key} className="p-2 max-w-[16rem] break-words">
                      {d.can_edit && c.type === "select" ? (
                        <SelectCompat className="min-w-[8rem] text-xs h-8" value={r[c.key] ?? ""} onChange={(e) => run(() => api.put(`/work/tracker/rows/${r.id}`, { [c.key]: e.target.value }))}>
                          {c.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                        </SelectCompat>
                      ) : d.can_edit && ["no", "name", "link", "days", "hours"].includes(c.key) ? (
                        <Input key={`${r.id}-${c.key}-${r[c.key]}`} className="h-8 text-xs min-w-[5rem]" type={["no", "days", "hours"].includes(c.key) ? "number" : "text"} step={c.key === "no" ? "1" : "0.5"} min="0"
                          defaultValue={r[c.key] ?? ""} placeholder={c.key === "link" ? "https://" : ""}
                          onBlur={(e) => { const v = e.target.value.trim(); if (v === String(r[c.key] ?? "")) return; if (c.key === "name" && !v) return; return run(() => api.put(`/work/tracker/rows/${r.id}`, { [c.key]: ["no", "days", "hours"].includes(c.key) ? (v === "" ? null : Number(v)) : (v === "" ? null : v) })); }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                      )
                      : c.key === "link" ? (r.link ? <a className="underline text-blue-600" href={r.link} target="_blank" rel="noreferrer">Open</a> : "-")
                        : c.key === "planned_hours" || c.key === "hours" || c.key === "days" ? (r[c.key] == null ? "-" : num(r[c.key]))
                        : String((c.get ? c.get(r) : r[c.key]) || "-")}
                    </td>
                  ))}
                  <td className="p-2 whitespace-nowrap text-right">
                    {(kind === "frontend" || kind === "dev") && (r.qa_status
                      ? <span className="text-xs text-slate-500 mr-2">QA: {r.qa_status}</span>
                      : <Button size="sm" variant="outline" className="mr-1" onClick={() => { const note = prompt("Anything QA should know? (optional)"); if (note === null) return; return run(() => api.post(`/work/tracker/rows/${r.id}/qa-request`, { note: note || null })); }}><ShieldCheck className="h-3.5 w-3.5 mr-1" />Request QA</Button>)}
                    {d.can_edit && <Button size="icon" variant="ghost" onClick={() => startEdit(r)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}
                    {d.can_edit && <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remove "${r.name}"?`)) return run(() => api.delete(`/work/tracker/rows/${r.id}`)); }} aria-label="Remove"><Trash2 className="h-4 w-4 text-red-600" /></Button>}
                  </td>
                </tr>
                {kind === "frontend" && openRow === r.id && (
                  <tr key={`${r.id}-t`} className="border-b bg-slate-50 dark:bg-slate-900/40"><td /><td className="p-3" colSpan={cols.length + 1}>
                    <Subtasks row={r} canEdit={d.can_edit_hours} run={run} />
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
          {kind !== "design" && d.rows.length > 0 && (
            <tfoot><tr className="border-t font-semibold">
              <td className="p-2" colSpan={cols.length + (kind === "frontend" ? 1 : 0)}>Total {kind === "dev" ? "time" : "planned timeline"}: {num(s.used_hours)} hrs ({num(s.used_days)} days) · Deviation from allocated: <span className={s.deviation_days < 0 ? "text-red-600" : "text-green-700"}>{s.deviation_days < 0 ? "over by " : "left "}{num(Math.abs(s.deviation_hours))} hrs ({num(Math.abs(s.deviation_days))} days)</span></td><td />
            </tr></tfoot>
          )}
        </table>
      </CardContent></Card>
    </div>
  );
}

function Subtasks({ row, canEdit, run }: { row: any; canEdit: boolean; run: (fn: () => Promise<any>) => Promise<void> }) {
  const [t, setT] = useState({ title: "", hours: "", create_task: false });
  const [editing, setEditing] = useState<number | null>(null);
  const [e, setE] = useState({ title: "", hours: "" });
  return (
    <div className="space-y-2 text-sm">
      <div className="font-medium">Timeline for "{row.name}": {num(row.planned_hours)} hrs</div>
      {row.subtasks.length === 0 && <p className="text-slate-500">No sub-tasks yet.</p>}
      {row.subtasks.map((x: any) => editing === x.id ? (
        <div key={x.id} className="grid grid-cols-[1fr_8rem_auto_auto] gap-2 items-center border-b py-1">
          <Input value={e.title} onChange={(ev) => setE({ ...e, title: ev.target.value })} />
          <Input type="number" min="0" step="0.5" value={e.hours} onChange={(ev) => setE({ ...e, hours: ev.target.value })} />
          <Button size="sm" disabled={!e.title || e.hours === ""} onClick={() => run(async () => { await api.put(`/work/tracker/subtasks/${x.id}`, { title: e.title, hours: Number(e.hours) }); setEditing(null); })}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      ) : (
        <div key={x.id} className="flex items-center gap-3 border-b py-1"><span className="flex-1">{x.title}</span><span>{num(x.hours)} hrs</span>
          {canEdit && <Button size="icon" variant="ghost" onClick={() => { setEditing(x.id); setE({ title: x.title, hours: String(x.hours) }); }} aria-label="Edit sub-task"><Pencil className="h-4 w-4" /></Button>}
          {canEdit && <Button size="icon" variant="ghost" onClick={() => run(() => api.delete(`/work/tracker/subtasks/${x.id}`))} aria-label="Remove sub-task"><Trash2 className="h-4 w-4 text-red-600" /></Button>}</div>
      ))}
      {canEdit && (
        <div className="grid grid-cols-[1fr_8rem_auto] gap-2 items-end">
          <Input placeholder="Sub-task" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} />
          <Input type="number" min="0" step="0.5" placeholder="Hours" value={t.hours} onChange={(e) => setT({ ...t, hours: e.target.value })} />
          <Button variant="outline" disabled={!t.title || t.hours === ""} onClick={() => run(async () => { await api.post(`/work/tracker/rows/${row.id}/subtasks`, { title: t.title, hours: Number(t.hours), create_task: t.create_task }); setT({ title: "", hours: "", create_task: false }); })}>Add</Button>
          <label className="col-span-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={t.create_task} onChange={(e) => setT({ ...t, create_task: e.target.checked })} />Create a task on the Tasks page (for this page's HTML team members, unassigned if none)</label>
        </div>
      )}
    </div>
  );
}
