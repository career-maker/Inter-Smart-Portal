"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Page, Panel, Row, Dot, Primary, Quiet, Alert, Spinner, Label, field, area, errMsg } from "@/components/clean";

const ist = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

/** Client and internal meetings: schedule with a calendar invite, then record minutes and follow-up actions. */
export default function MeetingsPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(() => { api.get("/meetings").then((r) => setRows(r.data.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); }); }, []);
  useEffect(() => { load(); api.get("/meetings/people").then((r) => setPeople(r.data.data)).catch(() => {}); }, [load]);

  if (unavailable) return <Page title="Meetings" hint="Meetings are not switched on." children={null} />;
  if (!rows) return <Spinner />;

  return (
    <Page title="Meetings" hint="Schedule client and internal meetings. Everyone invited gets a calendar invite by email. Times are India time.">
      <Schedule people={people} onSaved={load} />
      <Panel className="p-0">
        {rows.length === 0 && <Row className="text-slate-500">No meetings yet.</Row>}
        {rows.map((m) => <Item key={m.id} m={m} people={people} onDone={load} />)}
      </Panel>
    </Page>
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
    <Panel className="space-y-4">
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <div><Label>Type</Label><select className={field} value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="internal">Internal</option><option value="client">Client</option></select></div>
        <div><Label>Title</Label><input className={field} value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Starts</Label><input type="datetime-local" className={field} value={f.start} onChange={(e) => set("start", e.target.value)} /></div>
        <div><Label>Ends</Label><input type="datetime-local" className={field} value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Room or meeting link</Label><input className={field} value={f.location} onChange={(e) => set("location", e.target.value)} /></div>
        <div><Label>Agenda</Label><input className={field} value={f.agenda} onChange={(e) => set("agenda", e.target.value)} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Colleagues to invite, hold Ctrl to pick several</Label>
          <select multiple className={`${field} h-32 py-2`} value={ids.map(String)} onChange={(e) => setIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>
        <div><Label>Client email addresses, separated by commas</Label><input className={field} value={f.emails} onChange={(e) => set("emails", e.target.value)} /></div>
      </div>
      <Primary disabled={!f.title || !f.start || !f.end} onClick={save}>Schedule and send invites</Primary>
    </Panel>
  );
}

function Item({ m, people, onDone }: { m: any; people: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<any>(null);
  const [minutes, setMinutes] = useState("");
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => api.get(`/meetings/${m.id}`).then((r) => { setD(r.data.data); setMinutes((x) => x || r.data.data.minutes || ""); }), [m.id]);
  useEffect(() => { if (open) reload(); }, [open, reload]);
  const run = async (fn: () => Promise<any>) => { setErr(null); try { await fn(); await reload(); onDone(); } catch (e: any) { setErr(errMsg(e)); } };
  const tone = m.status === "Done" ? "ok" : m.status === "Cancelled" ? "bad" : "neutral";

  return (
    <div className="border-b border-slate-200 dark:border-white/10 last:border-0">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <Row className="border-b-0">
          <span className="font-medium text-slate-900 dark:text-white">{m.title}</span>
          <span className="text-slate-500">{m.kind === "client" ? "Client" : "Internal"}</span>
          <span className="text-slate-600 dark:text-slate-300">{ist(m.starts_at)}</span>
          <span className="ml-auto"><Dot tone={tone}>{m.status}</Dot></span>
        </Row>
      </button>
      {open && d && (
        <div className="px-4 pb-4 space-y-4">
          {err && <Alert>{err}</Alert>}
          <p className="text-xs text-slate-500">Organiser {d.organizer?.first_name} {d.organizer?.last_name}. Invited: {[...d.attendees.map((a: any) => `${a.first_name} ${a.last_name}`), ...(d.external_emails || [])].join(", ") || "nobody"}.{d.location ? ` Where: ${d.location}.` : ""}</p>
          {d.agenda && <p className="text-sm text-slate-600 dark:text-slate-300">Agenda: {d.agenda}</p>}
          <div className="space-y-2">
            <Label>Minutes</Label>
            <textarea className={area} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            <Primary disabled={!minutes} onClick={() => run(() => api.post(`/meetings/${m.id}/minutes`, { minutes }))}>Save minutes</Primary>
          </div>
          <div className="space-y-1">
            <Label>Follow-up actions</Label>
            {d.actions.map((a: any) => (
              <label key={a.id} className="flex items-center gap-2 min-h-11 text-sm">
                <input type="checkbox" checked={a.done} onChange={() => run(() => api.put(`/meetings/actions/${a.id}/toggle`))} />
                <span className={a.done ? "line-through text-slate-400" : ""}>{a.text}{a.owner ? `, ${a.owner.first_name}` : ""}</span>
              </label>
            ))}
            <div className="grid gap-4 md:grid-cols-[1fr_200px_auto] items-center">
              <input className={field} placeholder="New follow-up" value={text} onChange={(e) => setText(e.target.value)} />
              <select className={field} value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Owner</option>{people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
              <Quiet disabled={!text} onClick={() => run(async () => { await api.post(`/meetings/${m.id}/actions`, { text, owner_id: owner ? Number(owner) : null }); setText(""); setOwner(""); })}>Add follow-up</Quiet>
            </div>
          </div>
          {d.status === "Scheduled" && <Quiet onClick={() => run(() => api.post(`/meetings/${m.id}/cancel`))}>Cancel meeting</Quiet>}
        </div>
      )}
    </div>
  );
}
