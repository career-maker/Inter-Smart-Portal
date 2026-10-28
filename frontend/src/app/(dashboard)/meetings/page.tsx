"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CalendarClock } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const ist = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

/** Client and internal meetings: schedule with a calendar invite, then record minutes and follow-up actions. */
export default function MeetingsPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => { api.get("/meetings").then((r) => setRows(r.data.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); }); }, []);
  useEffect(() => { load(); api.get("/meetings/people").then((r) => setPeople(r.data.data)).catch(() => {}); }, [load]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Meetings are not switched on yet.</p>;
  if (!rows) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><CalendarClock className="h-7 w-7 text-amber-500" /> Meetings</h1>
        <p className="text-slate-600 dark:text-slate-300">Schedule client and internal meetings. Everyone invited gets a calendar invite by email. Times are India time.</p>
      </div>
      <Schedule people={people} onSaved={load} />
      {rows.length === 0 && <p className="text-sm text-slate-500">No meetings yet.</p>}
      {rows.map((m) => <Row key={m.id} m={m} people={people} onDone={load} />)}
    </div>
  );
}

function Schedule({ people, onSaved }: { people: any[]; onSaved: () => void }) {
  // opened from a Sales lead (?lead_id=&title=&email=): start a client meeting for that lead
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const leadId = q.get("lead_id");
  const [f, setF] = useState({ kind: leadId ? "client" : "internal", title: q.get("title") || "", start: "", end: "", location: "", agenda: "", emails: q.get("email") || "" });
  const [ids, setIds] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setErr(null);
    try {
      await api.post("/meetings", {
        kind: f.kind, lead_id: leadId ? Number(leadId) : null, title: f.title, starts_at: f.start.replace("T", " "), ends_at: f.end.replace("T", " "), location: f.location || null, agenda: f.agenda || null,
        attendee_ids: ids, external_emails: f.emails.split(/[\s,;]+/).filter(Boolean),
      });
      setF({ kind: "internal", title: "", start: "", end: "", location: "", agenda: "", emails: "" }); setIds([]); onSaved();
    } catch (e: any) { setErr(errMsg(e)); }
  };
  return (
    <Card><CardContent className="p-3 space-y-2 text-sm [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div><Label>Type</Label><select className="h-9 rounded-md border bg-transparent px-2" value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="internal">Internal</option><option value="client">Client</option></select></div>
        <div><Label>Title</Label><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Starts</Label><Input type="datetime-local" value={f.start} onChange={(e) => set("start", e.target.value)} /></div>
        <div><Label>Ends</Label><Input type="datetime-local" value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
      </div>
      <div><Label>Room or meeting link</Label><Input value={f.location} onChange={(e) => set("location", e.target.value)} /></div>
      <div><Label>Agenda</Label><Input value={f.agenda} onChange={(e) => set("agenda", e.target.value)} /></div>
      <div>
        <Label>Colleagues to invite (hold Ctrl to pick several)</Label>
        <select multiple className="w-full h-28 rounded-md border bg-transparent px-2" value={ids.map(String)} onChange={(e) => setIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}>
          {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
      </div>
      <div><Label>Client email addresses (separate with commas)</Label><Input value={f.emails} onChange={(e) => set("emails", e.target.value)} /></div>
      <Button disabled={!f.title || !f.start || !f.end} onClick={save}>Schedule and send invites</Button>
    </CardContent></Card>
  );
}

function Row({ m, people, onDone }: { m: any; people: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<any>(null);
  const [minutes, setMinutes] = useState("");
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => api.get(`/meetings/${m.id}`).then((r) => { setD(r.data.data); setMinutes((x) => x || r.data.data.minutes || ""); }), [m.id]);
  useEffect(() => { if (open) reload(); }, [open, reload]);
  const run = async (fn: () => Promise<any>) => { setErr(null); try { await fn(); await reload(); onDone(); } catch (e: any) { setErr(errMsg(e)); } };

  return (
    <Card><CardContent className="p-3 space-y-2 text-sm">
      <button className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-slate-900 dark:text-white">{m.title}</span>
        <Badge variant="outline">{m.kind}</Badge>
        <span className="text-slate-500">{ist(m.starts_at)}</span>
        <Badge variant="outline" className="ml-auto">{m.status}</Badge>
      </button>
      {open && d && (
        <div className="space-y-2">
          {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-3 py-2">{err}</div>}
          <p className="text-xs text-slate-500">Organiser: {d.organizer?.first_name} {d.organizer?.last_name}. Invited: {[...d.attendees.map((a: any) => `${a.first_name} ${a.last_name}`), ...(d.external_emails || [])].join(", ") || "nobody"}.{d.location ? ` Where: ${d.location}.` : ""}</p>
          {d.agenda && <p className="text-slate-600 dark:text-slate-300">Agenda: {d.agenda}</p>}
          <div>
            <Label className="text-xs text-slate-500">Minutes</Label>
            <textarea className="w-full min-h-20 rounded-md border bg-transparent px-2 py-1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            <Button size="sm" disabled={!minutes} onClick={() => run(() => api.post(`/meetings/${m.id}/minutes`, { minutes }))}>Save minutes</Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Follow-up actions</Label>
            {d.actions.map((a: any) => (
              <label key={a.id} className="flex items-center gap-2">
                <input type="checkbox" checked={a.done} onChange={() => run(() => api.put(`/meetings/actions/${a.id}/toggle`))} />
                <span className={a.done ? "line-through text-slate-400" : ""}>{a.text}{a.owner ? ` (${a.owner.first_name})` : ""}</span>
              </label>
            ))}
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <Input placeholder="New follow-up" value={text} onChange={(e) => setText(e.target.value)} />
              <select className="h-9 rounded-md border bg-transparent px-2" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Owner</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
              <Button size="sm" disabled={!text} onClick={() => run(async () => { await api.post(`/meetings/${m.id}/actions`, { text, owner_id: owner ? Number(owner) : null }); setText(""); setOwner(""); })}>Add</Button>
            </div>
          </div>
          {d.status === "Scheduled" && <Button size="sm" variant="outline" onClick={() => run(() => api.post(`/meetings/${m.id}/cancel`))}>Cancel meeting</Button>}
        </div>
      )}
    </CardContent></Card>
  );
}
