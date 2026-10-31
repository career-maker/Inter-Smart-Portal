"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useCallback, useEffect, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";

/** QA requests raised from the Frontend and Dev tables. The QA lead assigns each to a QA member; the member moves it to In testing and Done. */
export default function QaRequests({ projectId }: { projectId: string | number }) {
  const [d, setD] = useState<any>(null);
  const [pick, setPick] = useState<Record<number, string>>({});
  const [dates, setDates] = useState<Record<number, { start: string; end: string }>>({});
  const load = useCallback(async () => { try { const r = await api.get(`/work/projects/${projectId}/qa-requests`); setD(r.data); } catch { /* not on the work list */ } }, [projectId]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(); } catch (e: any) { alert(errMsg(e)); } };

  if (!d || d.data.length === 0) return null;
  return (
    <Card><CardHeader className="pb-0"><CardTitle className="text-base">QA requests from Frontend and Dev</CardTitle></CardHeader>
      <CardContent className="pt-3 space-y-2 text-sm">
        {d.data.map((q: any) => (
          <div key={q.id} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
            <div className="flex-1 min-w-[12rem]"><div className="font-medium">{q.title} <span className="text-xs text-slate-500">({q.kind})</span></div>
              <div className="text-xs text-slate-500">Asked by {q.requested_by_name || "-"}{q.assigned_to_name ? ` · tester: ${q.assigned_to_name}` : ""}{q.start_date ? ` · ${String(q.start_date).slice(0, 10)} to ${String(q.end_date).slice(0, 10)}` : ""}{q.note ? ` · ${q.note}` : ""}</div></div>
            <span className="text-xs rounded-full border px-2 py-0.5">{q.status}</span>
            {d.can_assign && q.status !== "Done" && (
              <>
                <SelectCompat className="h-8 rounded-md border bg-transparent px-2 text-xs" value={pick[q.id] ?? q.assigned_to ?? ""} onChange={(e) => setPick({ ...pick, [q.id]: e.target.value })}>
                  <option value="">Assign to...</option>{d.qa_members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </SelectCompat>
                <input type="date" aria-label="Start date" className="h-8 rounded-md border bg-transparent px-2 text-xs" value={dates[q.id]?.start ?? String(q.start_date || "").slice(0, 10)} onChange={(e) => setDates({ ...dates, [q.id]: { start: e.target.value, end: dates[q.id]?.end ?? String(q.end_date || "").slice(0, 10) } })} />
                <input type="date" aria-label="End date" className="h-8 rounded-md border bg-transparent px-2 text-xs" value={dates[q.id]?.end ?? String(q.end_date || "").slice(0, 10)} onChange={(e) => setDates({ ...dates, [q.id]: { start: dates[q.id]?.start ?? String(q.start_date || "").slice(0, 10), end: e.target.value } })} />
                <Button size="sm" variant="outline" disabled={!(pick[q.id] ?? q.assigned_to) || !(dates[q.id]?.start ?? q.start_date) || !(dates[q.id]?.end ?? q.end_date)}
                  onClick={() => run(() => api.post(`/work/qa-requests/${q.id}/assign`, { assigned_to: Number(pick[q.id] ?? q.assigned_to), start_date: dates[q.id]?.start ?? String(q.start_date).slice(0, 10), end_date: dates[q.id]?.end ?? String(q.end_date).slice(0, 10) }))}>{q.assigned_to ? "Reassign" : "Assign"}</Button>
              </>
            )}
            {(q.assigned_to === d.me || d.can_assign) && q.assigned_to && q.status !== "Done" && (
              <>
                {q.status !== "In testing" && <Button size="sm" variant="outline" onClick={() => run(() => api.post(`/work/qa-requests/${q.id}/status`, { status: "In testing" }))}>Start testing</Button>}
                <Button size="sm" onClick={() => run(() => api.post(`/work/qa-requests/${q.id}/status`, { status: "Done" }))}>Mark done</Button>
              </>
            )}
          </div>
        ))}
      </CardContent></Card>
  );
}
