"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Page, Panel, Primary, Quiet, Alert, Spinner, Label, field, money, errMsg } from "@/components/clean";

/** Project board by stage with the budget left. Drag Active to On Hold (asks the reason) or On Hold to Active. Other stages move by their own steps. */
export default function TrackerPage() {
  const [d, setD] = useState<any>(null);
  const [reasons, setReasons] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [drag, setDrag] = useState<any>(null);
  const [hold, setHold] = useState<any>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => { api.get("/pmo/tracker").then((r) => setD(r.data)).catch(() => setUnavailable(true)); }, []);
  useEffect(() => { load(); api.get("/pmo/meta").then((r) => setReasons(r.data.hold_reasons || [])).catch(() => {}); }, [load]);

  if (unavailable) return <Page title="Project tracker" hint="The tracker is for the project manager." children={null} />;
  if (!d) return <Spinner />;

  const drop = async (stage: string) => {
    const p = drag; setDrag(null); setMsg(null);
    if (!p || p.status === stage) return;
    if (p.status === "Active" && stage === "On Hold") { setHold(p); return; }
    if (p.status === "On Hold" && stage === "Active") {
      try { await api.post(`/pmo/projects/${p.id}/resume`); load(); } catch (e: any) { setMsg(errMsg(e)); }
      return;
    }
    setMsg("That move is not done by dragging: a project becomes Active when its coordinator accepts it, and Completed when it goes live.");
  };
  const confirmHold = async () => {
    setMsg(null);
    try { await api.post(`/pmo/projects/${hold.id}/hold`, { reason_code: code, note: note || null }); setHold(null); setCode(""); setNote(""); load(); } catch (e: any) { setMsg(errMsg(e)); }
  };

  return (
    <Page title="Project tracker" hint="Drag a project between Active and On Hold. Each card shows the budget left.">
      {msg && <Alert>{msg}</Alert>}
      {hold && (
        <Panel className="space-y-4">
          <p className="text-sm font-medium text-slate-900 dark:text-white">Put {hold.name} on hold</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Reason</Label>
              <select className={field} value={code} onChange={(e) => setCode(e.target.value)}>
                <option value="">Choose</option>{reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select></div>
            <div><Label>Note, needed for Other</Label><input className={field} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-4"><Primary disabled={!code} onClick={confirmHold}>Put on hold</Primary><Quiet onClick={() => setHold(null)}>Cancel</Quiet></div>
        </Panel>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        {d.stages.map((stage: string) => {
          const here = d.data.filter((p: any) => p.status === stage);
          return (
            <div key={stage} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(stage)} className="rounded-xl border border-slate-200 dark:border-white/10 p-2 min-h-40 space-y-2">
              <h2 className="px-2 text-sm font-medium text-slate-900 dark:text-white">{stage} <span className="font-normal text-slate-500">{here.length}</span></h2>
              {here.map((p: any) => (
                <div key={p.id} draggable onDragStart={() => setDrag(p)} className="cursor-grab rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 p-4 space-y-1">
                  <a href={`/pmo/projects/${p.id}`} className="text-sm font-medium text-slate-900 dark:text-white hover:underline">{p.name}</a>
                  <p className={`text-xs ${p.left < 0 ? "text-red-700 dark:text-red-300" : "text-slate-500"}`}>{p.budget > 0 ? `${money(p.left)} days left of ${money(p.budget)}` : "No department person-days yet"}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
