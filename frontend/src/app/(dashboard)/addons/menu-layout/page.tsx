"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Loader2, RotateCcw, Save } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { NAV_GROUPS, applyMenuLayout, navItemKey, type MenuLayout, type NavGroup } from "@/lib/navGroups";

const ROLES = ["Team Lead", "Employee"] as const;
type Role = (typeof ROLES)[number];

const move = <T,>(list: T[], i: number, d: -1 | 1): T[] => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const c = [...list];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

/** Groups and items a person with this role can be shown by default (before the arrangement). */
function groupsForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.filter((g) => !g.webOnly && (!g.roles || g.roles.includes(role)))
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}

export default function MenuLayoutPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const [role, setRole] = useState<Role>("Team Lead");
  const [layouts, setLayouts] = useState<Record<string, MenuLayout>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({});
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get("/menu-layout")
      .then((r) => setLayouts(r.data?.layouts || {}))
      .catch(() => setMsg({ ok: false, text: "Could not load the saved menu." }))
      .finally(() => setLoading(false));
  }, []);

  const base = useMemo(() => groupsForRole(role), [role]);

  // load the saved arrangement (or the default) whenever the role or saved data changes
  useEffect(() => {
    const saved = layouts[role];
    const ordered = applyMenuLayout(base, saved ? { ...saved, hiddenGroups: [], hiddenItems: [] } : null);
    setGroupOrder(ordered.map((g) => g.id));
    setItemOrder(Object.fromEntries(ordered.map((g) => [g.id, g.items.map(navItemKey)])));
    setHiddenGroups(new Set(saved?.hiddenGroups || []));
    setHiddenItems(new Set(saved?.hiddenItems || []));
  }, [role, layouts, base]);

  const groupById = useMemo(() => Object.fromEntries(base.map((g) => [g.id, g])), [base]);
  const labelOf = (gid: string, key: string) => groupById[gid]?.items.find((i) => navItemKey(i) === key)?.label || key;

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, k: string) => {
    const c = new Set(set);
    c.has(k) ? c.delete(k) : c.add(k);
    setter(c);
  };

  const put = async (layout: MenuLayout | null) => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api.put("/menu-layout", { role, layout });
      setLayouts(r.data?.layouts || {});
      setMsg({ ok: true, text: layout ? `Menu saved for ${role}. They see it after their next page load.` : `${role} menu reset to the default.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const save = () =>
    put({
      groups: groupOrder,
      items: itemOrder,
      hiddenGroups: Array.from(hiddenGroups),
      hiddenItems: Array.from(hiddenItems),
    });

  if (!isSuperAdmin) {
    return <p className="p-6 text-sm text-slate-600">Only the Super Admin can arrange the side menu.</p>;
  }

  const btn = "p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer";

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/addons" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Add-ons
      </Link>
      <div>
        <h1>Side Menu Arrangement</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set the order of the side menu and switch entries off for Team Leads and Employees. This only changes what the menu shows. It does not
          change who can open a page.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50" role="tablist" aria-label="Role">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => setRole(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer ${role === r ? "bg-[var(--portal-primary-color,#56348f)] text-white" : "text-slate-600 hover:bg-slate-200/60"}`}
          >
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : (
        <div className="space-y-3">
          {groupOrder.map((gid, gi) => {
            const g = groupById[gid];
            if (!g) return null;
            const gHidden = hiddenGroups.has(gid);
            const items = itemOrder[gid] || [];
            return (
              <div key={gid} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
                  <g.icon className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className={`font-semibold text-sm flex-1 ${gHidden ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {g.label}
                    {g.feature && <span className="ml-2 text-[11px] font-normal text-slate-400">only shown to people who have this module</span>}
                  </span>
                  <button type="button" className={btn} disabled={gi === 0} onClick={() => setGroupOrder(move(groupOrder, gi, -1))} aria-label={`Move ${g.label} up`}>
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button type="button" className={btn} disabled={gi === groupOrder.length - 1} onClick={() => setGroupOrder(move(groupOrder, gi, 1))} aria-label={`Move ${g.label} down`}>
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button type="button" className={btn} onClick={() => toggle(hiddenGroups, setHiddenGroups, gid)} aria-label={gHidden ? `Show ${g.label}` : `Hide ${g.label}`} title={gHidden ? "Hidden" : "Visible"}>
                    {gHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <ul className={gHidden ? "opacity-50" : ""}>
                  {items.map((k, ii) => {
                    const iHidden = hiddenItems.has(k);
                    const label = labelOf(gid, k);
                    return (
                      <li key={k} className="flex items-center gap-2 pl-10 pr-3 py-1.5 border-b border-slate-100 last:border-0">
                        <span className={`text-sm flex-1 ${iHidden ? "line-through text-slate-400" : "text-slate-700"}`}>{label}</span>
                        <button type="button" className={btn} disabled={ii === 0} onClick={() => setItemOrder({ ...itemOrder, [gid]: move(items, ii, -1) })} aria-label={`Move ${label} up`}>
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button type="button" className={btn} disabled={ii === items.length - 1} onClick={() => setItemOrder({ ...itemOrder, [gid]: move(items, ii, 1) })} aria-label={`Move ${label} down`}>
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button type="button" className={btn} onClick={() => toggle(hiddenItems, setHiddenItems, k)} aria-label={iHidden ? `Show ${label}` : `Hide ${label}`}>
                          {iHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`} role="status">{msg.text}</p>}

      <div className="flex items-center gap-2 pb-6">
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--portal-primary-color,#56348f)] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save for {role}
        </button>
        <button
          type="button"
          onClick={() => confirm(`Reset the ${role} menu to the default order and show everything?`) && put(null)}
          disabled={saving || loading || !layouts[role]}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Reset to default
        </button>
      </div>
    </div>
  );
}
