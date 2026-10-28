"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, KanbanSquare } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

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

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">The tracker is for the project manager.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

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
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><KanbanSquare className="h-7 w-7 text-amber-500" /> Project tracker</h1>
        <p className="text-slate-600 dark:text-slate-300">Drag a project between Active and On Hold. Each card shows the budget left.</p>
      </div>
      {msg && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">{msg}</div>}
      {hold && (
        <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
          <p className="font-semibold text-slate-900 dark:text-white">Put &quot;{hold.name}&quot; on hold</p>
          <div><Label>Reason</Label>
            <select className="w-full h-9 rounded-md border bg-transparent px-2" value={code} onChange={(e) => setCode(e.target.value)}>
              <option value="">Choose</option>{reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select></div>
          <div><Label>Note (needed for Other)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="flex gap-2"><Button disabled={!code} onClick={confirmHold}>Put on hold</Button><Button variant="outline" onClick={() => setHold(null)}>Cancel</Button></div>
        </CardContent></Card>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        {d.stages.map((stage: string) => (
          <div key={stage} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(stage)} className="rounded-xl border border-slate-200 dark:border-white/10 p-2 min-h-40 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{stage} <span className="font-normal text-slate-500">{d.data.filter((p: any) => p.status === stage).length}</span></h2>
            {d.data.filter((p: any) => p.status === stage).map((p: any) => (
              <Card key={p.id} draggable onDragStart={() => setDrag(p)} className="cursor-grab"><CardContent className="p-2 text-sm space-y-1">
                <a href={`/pmo/projects/${p.id}`} className="font-medium text-slate-900 dark:text-white hover:underline">{p.name}</a>
                <p className={`text-xs ${p.left < 0 ? "text-red-600 font-medium" : "text-slate-500"}`}>{p.budget > 0 ? `Left Rs ${money(p.left)} of Rs ${money(p.budget)}` : "No department budget yet"}</p>
              </CardContent></Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
