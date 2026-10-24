"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";
const COLOR: Record<string, string> = { Open: "bg-amber-100 text-amber-800", "In review": "bg-blue-100 text-blue-800", Passed: "bg-green-100 text-green-800", Failed: "bg-red-100 text-red-800" };
const PRIORITY: Record<string, string> = { Low: "bg-slate-100 text-slate-700", Medium: "bg-blue-100 text-blue-800", High: "bg-orange-100 text-orange-800", Critical: "bg-red-100 text-red-800" };

/** QA reviews. With a projectId: that project's reviews (project tab). Without: the whole QA queue (QA team and managers). */
export default function QaReviews({ projectId }: { projectId?: string | number }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { const r = await api.get(projectId ? `/work/projects/${projectId}/qa` : "/work/qa/queue"); setRows(r.data.data); setLocked(null); }
    catch (e: any) { if ([403, 423].includes(e?.response?.status)) setLocked(errMsg(e)); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  if (locked) return <Card><CardContent className="p-4 text-sm">{locked}</CardContent></Card>;
  if (!rows) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">{!projectId && <th className="p-3">Project</th>}<th className="p-3">Task</th><th className="p-3">Round</th><th className="p-3">Status</th><th className="p-3">Bugs open</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                {!projectId && <td className="p-3">{r.project_name}</td>}
                <td className="p-3 font-medium text-slate-900 dark:text-white">{r.task}</td>
                <td className="p-3">{r.round}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${COLOR[r.status]}`}>{r.status}</span></td>
                <td className="p-3">{r.bugs_open} of {r.bugs_total}</td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Open</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">{projectId ? "Nothing has been sent to QA on this project yet." : "The QA queue is empty."}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
      {openId !== null && <ReviewDialog id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function ReviewDialog({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<any>(null);
  const [bug, setBug] = useState({ title: "", priority: "Medium", description: "" });
  const [note, setNote] = useState("");

  const load = useCallback(async () => { const r = await api.get(`/work/qa/reviews/${id}`); setD(r.data); }, [id]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(); onChanged(); } catch (e: any) { alert(errMsg(e)); } };
  if (!d) return null;
  const r = d.review;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 py-4 pr-14 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg">{r.task}</DialogTitle>
          <p className="text-xs text-slate-500">{r.project_name} · round {r.round} · <span className={`px-2 py-0.5 rounded-full font-semibold ${COLOR[r.status]}`}>{r.status}</span></p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500 [&>*]:shrink-0">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Developer", r.developer || "Not assigned"], ["Tester", r.tester || "Not taken yet"], ["Task status", r.task_status], ["Result note", r.note || "-"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"><div className="text-xs text-slate-500">{k}</div><div className="font-semibold break-words">{v}</div></div>
            ))}
          </div>

          {d.can_take && <Button className="w-full" onClick={() => run(() => api.post(`/work/qa/reviews/${id}/take`))}>Take this review</Button>}

          <Card><CardHeader className="pb-0"><CardTitle className="text-base">Bugs</CardTitle></CardHeader>
            <CardContent className="pt-3 space-y-2">
              {d.bugs.length === 0 && <p className="text-sm text-slate-500">No bugs listed.</p>}
              {d.bugs.map((b: any) => (
                <div key={b.id} className="border rounded-lg p-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap"><Badge className={PRIORITY[b.priority]}>{b.priority}</Badge><span className="font-medium">{b.title}</span><Badge variant="outline" className="ml-auto">{b.status}</Badge></div>
                  {b.description && <p className="text-xs text-slate-500 mt-1">{b.description}</p>}
                  <div className="mt-1 space-x-1">
                    {d.can_fix && b.status === "Open" && <Button size="sm" variant="outline" onClick={() => run(() => api.put(`/work/qa/bugs/${b.id}`, { status: "Fixed" }))}>Mark fixed</Button>}
                    {d.can_test && b.status === "Fixed" && <Button size="sm" onClick={() => run(() => api.put(`/work/qa/bugs/${b.id}`, { status: "Verified" }))}>Verify</Button>}
                    {d.can_test && b.status === "Fixed" && <Button size="sm" variant="ghost" onClick={() => run(() => api.put(`/work/qa/bugs/${b.id}`, { status: "Open" }))}>Reopen</Button>}
                  </div>
                </div>
              ))}
              {d.can_test && r.status === "In review" && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="col-span-2"><Label>Bug title</Label><Input value={bug.title} onChange={(e) => setBug({ ...bug, title: e.target.value })} /></div>
                  <div><Label>Priority</Label><select className={SELECT} value={bug.priority} onChange={(e) => setBug({ ...bug, priority: e.target.value })}>{d.priorities.map((p: string) => <option key={p}>{p}</option>)}</select></div>
                  <div><Label>Details</Label><Input value={bug.description} onChange={(e) => setBug({ ...bug, description: e.target.value })} /></div>
                  <Button className="col-span-2" disabled={!bug.title} onClick={() => run(async () => { await api.post(`/work/qa/reviews/${id}/bugs`, { title: bug.title, priority: bug.priority, description: bug.description || null }); setBug({ title: "", priority: "Medium", description: "" }); })}>Add bug</Button>
                </div>
              )}
            </CardContent></Card>

          {d.can_test && r.status === "In review" && (
            <Card><CardHeader className="pb-0"><CardTitle className="text-base">Finish the review</CardTitle></CardHeader>
              <CardContent className="pt-3 grid grid-cols-2 gap-2">
                <div className="col-span-2"><Label>Note (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <Button onClick={() => run(() => api.post(`/work/qa/reviews/${id}/complete`, { result: "pass", note: note || null }))}>Pass</Button>
                <Button variant="outline" onClick={() => run(() => api.post(`/work/qa/reviews/${id}/complete`, { result: "fail", note: note || null }))}>Fail and send back</Button>
              </CardContent></Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
