"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { ChevronDown } from "lucide-react";
import { Page, Section, Panel, Row, Dot, Primary, Quiet, Alert, Spinner, Label, field, area, errMsg } from "@/components/clean";

const COLS = "md:grid-cols-[minmax(0,1fr)_110px_190px_130px_24px]";
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
      <Section title="Schedule a meeting">
        <Schedule people={people} onSaved={load} />
      </Section>
      <Section title="Scheduled meetings" count={rows.length}>
        <Panel className="p-0 overflow-hidden">
          {rows.length > 0 && (
            <div className={`${COLS} hidden md:grid items-center gap-4 px-4 h-10 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-medium uppercase tracking-wide text-slate-500`}>
              <span>Meeting</span><span>Type</span><span>When (IST)</span><span>Status</span><span />
            </div>
          )}
          {rows.length === 0 && <Row className="text-slate-500 justify-center py-8">No meetings yet. Schedule the first one above.</Row>}
          {rows.map((m) => <Item key={m.id} m={m} people={people} onDone={load} />)}
        </Panel>
      </Section>
    </Page>
  );
}

/** Search box, click-to-toggle list (no Ctrl needed) and the chosen names shown as removable chips below. */
function PeoplePicker({ people, ids, onChange }: { people: any[]; ids: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState("");
  const name = (p: any) => `${p.first_name} ${p.last_name}`.trim();
  const shown = people.filter((p) => name(p).toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: number) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const chosen = people.filter((p) => ids.includes(p.id));
  return (
    <div>
      <input className={field} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-300 dark:border-white/15">
        {shown.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No one matches.</div>}
        {shown.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/5">
            <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} />
            {name(p)}
          </label>
        ))}
      </div>
      {chosen.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected colleagues">
          {chosen.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-[#1F5C4E]/10 px-2.5 py-1 text-xs font-medium text-[#1F5C4E] dark:bg-[#1F5C4E]/30 dark:text-emerald-200">
              {name(p)}
              <button type="button" onClick={() => toggle(p.id)} aria-label={`Remove ${name(p)}`} className="cursor-pointer text-sm leading-none hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type Fields = { kind: string; title: string; start: string; end: string; location: string; agenda: string; emails: string };
const EMPTY: Fields = { kind: "internal", title: "", start: "", end: "", location: "", agenda: "", emails: "" };
// ISO (UTC) to the value a datetime-local input wants, in India time
const toLocalInput = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16).replace(" ", "T");

function Schedule({ people, onSaved }: { people: any[]; onSaved: () => void }) {
  // opened from a Sales lead (?lead_id=&title=&email=): start a client meeting for that lead
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const leadId = q.get("lead_id");
  const [n, setN] = useState(0); // bump to clear the form after saving
  const initial: Fields = { ...EMPTY, kind: leadId ? "client" : "internal", title: q.get("title") || "", emails: q.get("email") || "" };
  return <MeetingForm key={n} people={people} initial={initial} initialIds={[]} label="Schedule and send invites"
    onSubmit={async (body) => { await api.post("/meetings", { ...body, lead_id: leadId ? Number(leadId) : null }); setN(n + 1); onSaved(); }} />;
}

/** The form used both to schedule a new meeting and to change a scheduled one. */
function MeetingForm({ people, initial, initialIds, label, onSubmit, onCancel }: { people: any[]; initial: Fields; initialIds: number[]; label: string; onSubmit: (body: any) => Promise<void>; onCancel?: () => void }) {
  const [f, setF] = useState<Fields>(initial);
  const [ids, setIds] = useState<number[]>(initialIds);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setErr(null);
    try {
      await onSubmit({
        kind: f.kind, title: f.title, starts_at: f.start.replace("T", " "), ends_at: f.end.replace("T", " "), location: f.location || null, agenda: f.agenda || null,
        attendee_ids: ids, external_emails: f.emails.split(/[\s,;]+/).filter(Boolean),
      });
    } catch (e: any) { setErr(errMsg(e)); }
  };
  return (
    <Panel className="space-y-6">
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Details</h3>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div><Label>Type</Label><SelectCompat className={field} value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="internal">Internal</option><option value="client">Client</option></SelectCompat></div>
            <div><Label>Title</Label><input className={field} value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Starts</Label><input type="datetime-local" className={field} value={f.start} onChange={(e) => set("start", e.target.value)} /></div>
            <div><Label>Ends</Label><input type="datetime-local" className={field} value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
          </div>
          <div><Label>Room or meeting link</Label><input className={field} value={f.location} onChange={(e) => set("location", e.target.value)} /></div>
          <div><Label>Agenda</Label><input className={field} value={f.agenda} onChange={(e) => set("agenda", e.target.value)} /></div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Who to invite</h3>
          <div>
            <Label>Colleagues</Label>
            <PeoplePicker people={people} ids={ids} onChange={setIds} />
          </div>
          <div><Label>Client email addresses, separated by commas</Label><input className={field} value={f.emails} onChange={(e) => set("emails", e.target.value)} /></div>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 dark:border-white/10 pt-4">
        {onCancel && <Quiet onClick={onCancel}>Close without saving</Quiet>}
        <Primary disabled={!f.title || !f.start || !f.end} onClick={save}>{label}</Primary>
      </div>
    </Panel>
  );
}

function Item({ m, people, onDone }: { m: any; people: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
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
      <button className={`w-full text-left hover:bg-slate-50 dark:hover:bg-white/5 ${open ? "bg-slate-50 dark:bg-white/5" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className={`${COLS} grid items-center gap-x-4 gap-y-1 px-4 py-3 text-sm`}>
          <span className="font-medium text-slate-900 dark:text-white truncate">{m.title}</span>
          <span className="text-slate-500">{m.kind === "client" ? "Client" : "Internal"}</span>
          <span className="text-slate-600 dark:text-slate-300">{ist(m.starts_at)}</span>
          <span><Dot tone={tone}>{m.status}</Dot></span>
          <ChevronDown className={`hidden md:block h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && d && (
        <div className="px-4 py-4 space-y-4 border-t border-slate-200 dark:border-white/10">
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
              <SelectCompat className={field} value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Owner</option>{people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </SelectCompat>
              <Quiet disabled={!text} onClick={() => run(async () => { await api.post(`/meetings/${m.id}/actions`, { text, owner_id: owner ? Number(owner) : null }); setText(""); setOwner(""); })}>Add follow-up</Quiet>
            </div>
          </div>
          {d.status === "Scheduled" && !editing && (
            <div className="flex flex-wrap gap-2">
              <Primary onClick={() => setEditing(true)}>Change date, people or details</Primary>
              <Primary className="bg-red-600! hover:bg-red-700!" onClick={() => run(() => api.post(`/meetings/${m.id}/cancel`))}>Cancel meeting</Primary>
            </div>
          )}
          {d.status === "Scheduled" && editing && (
            <MeetingForm people={people} label="Save changes and resend invites" onCancel={() => setEditing(false)}
              initial={{ kind: d.kind, title: d.title, start: toLocalInput(d.starts_at), end: toLocalInput(d.ends_at), location: d.location || "", agenda: d.agenda || "", emails: (d.external_emails || []).join(", ") }}
              initialIds={d.attendees.map((a: any) => a.id)}
              onSubmit={async (body) => { await api.put(`/meetings/${m.id}`, { ...body, lead_id: d.lead_id ?? null, project_id: d.project_id ?? null }); setEditing(false); await reload(); onDone(); }} />
          )}
        </div>
      )}
    </div>
  );
}
