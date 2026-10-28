"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Panel, Row, Section } from "@/components/clean";

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
    <Section title="Module switches">
      <p className="text-sm text-slate-600 dark:text-slate-300">Switch a module off to hide it from everyone, including its screens and data access. Nothing is deleted; switch it back on any time.</p>
      <Panel className="p-0">
        {mods.map((m) => (
          <label key={m.key} className="cursor-pointer block">
            <Row>
              <input type="checkbox" checked={m.enabled} onChange={(e) => set(m.key, e.target.checked)} />
              <span className="font-medium text-slate-900 dark:text-white">{m.label}</span>
              <span className="text-slate-500">{m.description}</span>
              <span className="ml-auto text-xs text-slate-500">{m.enabled ? "On" : "Off"}</span>
            </Row>
          </label>
        ))}
      </Panel>
      {msg && <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    </Section>
  );
}
