"use client";

import { useEffect, useState } from "react";
import { ToggleRight } from "lucide-react";
import api from "@/services/api";

/** Super Admin: switch each module on or off for everyone. */
export default function ModuleSwitchesCard() {
  const [mods, setMods] = useState<any[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { api.get("/module-switches").then((r) => setMods(r.data.modules)).catch(() => setMods(null)); }, []);
  if (!mods) return null;
  const set = async (key: string, enabled: boolean) => {
    setMsg(null);
    try { await api.post("/module-switches", { key, enabled }); setMods((cur) => cur!.map((m) => (m.key === key ? { ...m, enabled } : m))); setMsg("Saved. The menu updates for people on their next page load."); } catch (e: any) { setMsg(e?.response?.data?.message || "Could not save."); }
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><ToggleRight className="h-5 w-5 text-amber-500" /> Module switches</div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Switch a module off to hide it from everyone, including its screens and data access. Nothing is deleted; switch it back on any time.</p>
      <div className="divide-y rounded-md border">
        {mods.map((m) => (
          <label key={m.key} className="flex items-center gap-3 px-3 py-2 cursor-pointer text-sm">
            <input type="checkbox" checked={m.enabled} onChange={(e) => set(m.key, e.target.checked)} />
            <span className="font-medium text-slate-900 dark:text-white">{m.label}</span><span className="text-slate-500">{m.description}</span>
          </label>
        ))}
      </div>
      {msg && <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    </div>
  );
}
