"use client";

import { useEffect, useState, useCallback } from "react";
import { KeyRound } from "lucide-react";
import api from "@/services/api";

type Priv = { key: string; label: string; description: string; customised: boolean; users: number[]; teams: number[] };

/** Super Admin: assign every module privilege (Accounts, Sales, Project Office, project manager, QA, system administrator, HR ...) to people and/or teams. */
export default function AccessSettingsCard() {
  const [d, setD] = useState<{ privileges: Priv[]; people: any[]; teams: any[] } | null>(null);
  const load = useCallback(() => { api.get("/access-settings").then((r) => setD(r.data)).catch(() => setD(null)); }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><KeyRound className="h-5 w-5 text-amber-500" /> Module privileges</div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        The only login roles are Super Admin, Employee and Team Lead. Everything below is a privilege you give to named people and/or whole teams. Until you save a choice, the built-in rule applies.
      </p>
      {d.privileges.map((p) => <Row key={p.key} p={p} people={d.people} teams={d.teams} onChanged={load} />)}
    </div>
  );
}

function Row({ p, people, teams, onChanged }: { p: Priv; people: any[]; teams: any[]; onChanged: () => void }) {
  const [users, setUsers] = useState<number[]>(p.users);
  const [tms, setTms] = useState<number[]>(p.teams);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const flip = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const shown = people.filter((x) => `${x.first_name} ${x.last_name} ${x.email}`.toLowerCase().includes(q.toLowerCase()));
  const names = [...people.filter((x) => users.includes(x.id)).map((x) => `${x.first_name} ${x.last_name}`), ...teams.filter((t) => tms.includes(t.id)).map((t) => `${t.name} (team)`)];

  const save = async () => { setMsg(null); try { await api.post("/access-settings", { key: p.key, users, teams: tms }); setMsg("Saved."); onChanged(); } catch (e: any) { setMsg(e?.response?.data?.message || "Could not save."); } };
  const reset = async () => { setMsg(null); try { await api.post("/access-settings/reset", { key: p.key }); setMsg("Back to the default rule."); onChanged(); } catch (e: any) { setMsg(e?.response?.data?.message || "Could not reset."); } };

  return (
    <details className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-slate-900 dark:text-white">
        {p.label} <span className="font-normal text-slate-500">{p.customised ? "· set by you" : "· default rule"} · {names.length ? names.join(", ") : "nobody"}</span>
      </summary>
      <div className="mt-2 space-y-2 text-sm">
        <p className="text-slate-600 dark:text-slate-300">{p.description}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">People</div>
            <input className="w-full h-8 rounded-md border bg-transparent px-2" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
              {shown.map((x) => (
                <label key={x.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={users.includes(x.id)} onChange={() => flip(users, setUsers, x.id)} />
                  <span>{x.first_name} {x.last_name}</span><span className="text-slate-500 truncate">{x.email}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Whole teams (everyone in the team)</div>
            <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
              {teams.map((t) => (
                <label key={t.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={tms.includes(t.id)} onChange={() => flip(tms, setTms, t.id)} /><span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-md bg-amber-500 text-white font-medium" onClick={save}>Save</button>
          {p.customised && <button className="h-8 px-3 rounded-md border" onClick={reset}>Back to default rule</button>}
          {msg && <span className="text-slate-600 dark:text-slate-300">{msg}</span>}
        </div>
        <p className="text-xs text-slate-500">Super Admins always keep access. Saving with nobody ticked means only Super Admins have it.</p>
      </div>
    </details>
  );
}
