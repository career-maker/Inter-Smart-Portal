"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Panel, Section, Primary, Quiet, field } from "@/components/clean";

type Priv = { key: string; label: string; description: string; follows: string | null; customised: boolean; users: number[]; teams: number[] };

/** Super Admin: assign every module privilege (Accounts, Sales, Project Office, project manager and its powers, QA, system administrator, HR ...) to people and/or teams. */
export default function AccessSettingsCard() {
  const [d, setD] = useState<{ privileges: Priv[]; people: any[]; teams: any[] } | null>(null);
  const load = useCallback(() => { api.get("/access-settings").then((r) => setD(r.data)).catch(() => setD(null)); }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;

  return (
    <Section title="Module privileges">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The only login roles are Super Admin, Employee and Team Lead. Everything below is a privilege you give to named people and/or whole teams. Until you save a choice, the built-in rule applies.
      </p>
      <Panel className="p-0">
        {d.privileges.map((p) => <Item key={p.key} p={p} people={d.people} teams={d.teams} onChanged={load} />)}
      </Panel>
    </Section>
  );
}

function Item({ p, people, teams, onChanged }: { p: Priv; people: any[]; teams: any[]; onChanged: () => void }) {
  const [users, setUsers] = useState<number[]>(p.users);
  const [tms, setTms] = useState<number[]>(p.teams);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const flip = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const shown = people.filter((x) => `${x.first_name} ${x.last_name} ${x.email}`.toLowerCase().includes(q.toLowerCase()));
  const names = [...people.filter((x) => users.includes(x.id)).map((x) => `${x.first_name} ${x.last_name}`), ...teams.filter((t) => tms.includes(t.id)).map((t) => `${t.name} team`)];

  const save = async () => { setMsg(null); try { await api.post("/access-settings", { key: p.key, users, teams: tms }); setMsg("Saved."); onChanged(); } catch (e: any) { setMsg(e?.response?.data?.message || "Could not save."); } };
  const reset = async () => { setMsg(null); try { await api.post("/access-settings/reset", { key: p.key }); setMsg("Back to the default."); onChanged(); } catch (e: any) { setMsg(e?.response?.data?.message || "Could not reset."); } };

  return (
    <details className="border-b border-slate-200 dark:border-white/10 last:border-0">
      <summary className="min-h-11 flex items-center gap-4 px-4 py-2 text-sm cursor-pointer">
        <span className="font-medium text-slate-900 dark:text-white">{p.label}</span>
        <span className="text-slate-500">{p.customised ? "Set by you" : p.follows ? `Same as ${p.follows}` : "Default rule"}</span>
        <span className="ml-auto text-slate-600 dark:text-slate-300 truncate max-w-md">{names.length ? names.join(", ") : "Nobody"}</span>
      </summary>
      <div className="px-4 pb-4 space-y-4 text-sm">
        <p className="text-slate-600 dark:text-slate-300">{p.description}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-slate-500">People</div>
            <input className={field} placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10">
              {shown.map((x) => (
                <label key={x.id} className="flex items-center gap-2 px-4 min-h-11 border-b border-slate-200 dark:border-white/10 last:border-0 cursor-pointer">
                  <input type="checkbox" checked={users.includes(x.id)} onChange={() => flip(users, setUsers, x.id)} />
                  <span>{x.first_name} {x.last_name}</span><span className="text-slate-500 truncate">{x.email}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Whole teams, everyone in the team</div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10">
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-2 px-4 min-h-11 border-b border-slate-200 dark:border-white/10 last:border-0 cursor-pointer">
                  <input type="checkbox" checked={tms.includes(t.id)} onChange={() => flip(tms, setTms, t.id)} /><span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Primary onClick={save}>Save</Primary>
          {p.customised && <Quiet onClick={reset}>{p.follows ? `Back to same as ${p.follows}` : "Back to the default rule"}</Quiet>}
          {msg && <span className="text-slate-600 dark:text-slate-300">{msg}</span>}
        </div>
        <p className="text-xs text-slate-500">Super Admins always keep access. Saving with nobody ticked means only Super Admins have it.</p>
      </div>
    </details>
  );
}
