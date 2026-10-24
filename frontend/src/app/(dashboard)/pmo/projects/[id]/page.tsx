"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import api from "@/services/api";
import { SALES_SHEET } from "@/lib/salesSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Handover from "@/components/work/Handover";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
const BA_FIELDS: [string, string][] = [["purpose", "Purpose"], ["about_company", "About the company"], ["competitors", "Competitors"], ["audience", "Audience"], ["usp", "USP"], ["conclusion", "Conclusion"]];
const KINDS = ["Brand book", "Logo", "Domain", "Brochure", "Proposal", "Other"];
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";

export default function PmoProjectPage() {
  const id = useParams<{ id: string }>().id;
  const [d, setD] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([api.get(`/pmo/projects/${id}`), api.get("/pmo/meta")]);
      setD(p.data); setMeta(m.data);
    } catch (e: any) { if ([403, 404].includes(e?.response?.status)) setDenied(true); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Run an action, show a friendly error, then refresh.
  const run = async (fn: () => Promise<any>) => { try { await fn(); await load(); } catch (e: any) { alert(errMsg(e)); } };

  if (denied) return <p className="text-slate-600 dark:text-slate-300">This project is not available to you.</p>;
  if (!d || !meta) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const g = d.gate;
  const tabs = g.tabs as any[];
  const current = tabs.find((t) => t.key === tab) || tabs[0];

  return (
    <div className="space-y-5 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div>
        <Link href="/pmo" className="text-sm text-slate-500 flex items-center gap-1 hover:underline"><ArrowLeft className="h-4 w-4" /> Project Office</Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">{d.project.name}</h1>
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <Badge variant="outline">{d.project.status}</Badge>
          <Badge className="bg-slate-100 text-slate-700">{g.payment.state}</Badge>
          {d.hold && <Badge className="bg-amber-100 text-amber-800">On hold: {meta.hold_reasons.find((h: any) => h.code === d.hold.reason_code)?.label}</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm rounded-t-md flex items-center gap-1 ${tab === t.key ? "bg-white dark:bg-slate-800 font-semibold border border-b-0 border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>
            {!t.enabled && <Lock className="h-3 w-3" />}{t.label}
          </button>
        ))}
      </div>

      {!current.enabled && (
        <Card><CardContent className="p-4 space-y-2">
          <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2"><Lock className="h-4 w-4" /> {current.locked_reason}</p>
          {d.is_super_admin && !g.payment.open && <OverrideForm label="Override payment lock (Super Admin)" onSubmit={(reason) => run(() => api.post(`/pmo/projects/${id}/overrides`, { type: "payment", reason }))} />}
          {d.can_manage && g.payment.open && !g.budget.open && <OverrideForm label="Override budget lock (PMO)" onSubmit={(reason) => run(() => api.post(`/pmo/projects/${id}/overrides`, { type: "budget", reason }))} />}
        </CardContent></Card>
      )}

      {current.enabled && tab === "overview" && <Overview d={d} meta={meta} run={run} id={id} />}
      {current.enabled && tab === "business_analysis" && <BusinessAnalysis d={d} run={run} id={id} />}
      {current.enabled && tab === "resources" && <Resources d={d} run={run} id={id} />}
      {current.enabled && tab === "budget" && <Budget d={d} meta={meta} run={run} id={id} />}
      {current.enabled && current.ready && ["ui", "ux", "dev", "qa", "bugs"].includes(tab) && (
        <Card><CardContent className="p-4 text-sm space-y-2">
          <p>The {current.label} work is done in the project work view, where the department team can also see it.</p>
          <Link href={`/work/projects/${id}`}><Button>Open the work view</Button></Link>
        </CardContent></Card>
      )}
      {current.enabled && !current.ready && (
        <Card><CardContent className="p-4 text-sm text-slate-600 dark:text-slate-300">The {current.label} tab is open for this project. Its working screens arrive in the next phase.</CardContent></Card>
      )}
    </div>
  );
}

function OverrideForm({ label, onSubmit }: { label: string; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="grid sm:grid-cols-3 gap-2 items-end">
      <div className="sm:col-span-2"><Label>{label}: reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      <Button variant="outline" disabled={!reason} onClick={() => onSubmit(reason)}>Open this tab anyway</Button>
    </div>
  );
}

function Overview({ d, meta, run, id }: any) {
  const [coord, setCoord] = useState("");
  const [hold, setHold] = useState({ reason_code: "content", note: "" });
  const [oos, setOos] = useState({ description: "", effort_days: "", amount_estimate: "" });
  const acc = d.acceptance;
  const intake = d.intake;

  return (
    <div className="space-y-4">
      <Handover projectId={id} />
      {intake && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Project details from Sales</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-4 gap-3 text-sm pt-3">
            {[["Client", intake.client_name], ["Type", `${intake.site_category}${intake.cms_variant ? ` (${intake.cms_variant})` : ""}`], ["Platform", intake.platform], ["Pages", intake.pages_count ?? "-"], ["Quality", intake.quality_level ?? "-"], ["Budget", money(intake.budget)], ["Client email", intake.client_email ?? "-"], ["Client phone", intake.client_phone ?? "-"]].map(([k, v]) => (
              <div key={k as string}><div className="text-xs text-slate-500">{k}</div><div className="font-medium break-words">{v}</div></div>
            ))}
            {intake.overview && <div className="sm:col-span-4"><div className="text-xs text-slate-500">Scope</div><div>{intake.overview}</div></div>}
          </CardContent></Card>
      )}
      {intake?.details && Object.keys(intake.details).length > 0 && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Sales sheet</CardTitle></CardHeader>
          <CardContent className="pt-3 space-y-4 text-sm">
            {SALES_SHEET.map((sec) => {
              const filled = sec.fields.filter((f) => intake.details[f.key]);
              return filled.length === 0 ? null : (
                <div key={sec.title}><div className="font-semibold mb-1">{sec.title}</div>
                  <div className="grid sm:grid-cols-3 gap-x-4 gap-y-2">
                    {filled.map((f) => <div key={f.key}><div className="text-xs text-slate-500">{f.label}</div><div>{intake.details[f.key]}</div></div>)}
                  </div>
                </div>
              );
            })}
          </CardContent></Card>
      )}

      <Card><CardHeader className="pb-0"><CardTitle className="text-base">Coordinator</CardTitle></CardHeader>
        <CardContent className="pt-3 space-y-3 text-sm">
          <p>{acc ? (acc.accepted_at ? "Accepted by the coordinator." : "Assigned. Waiting for the coordinator to accept.") : "No coordinator assigned yet."}</p>
          {d.can_manage && (
            <div className="grid sm:grid-cols-3 gap-2 items-end">
              <div className="sm:col-span-2"><Label>Assign coordinator</Label>
                <select className={SELECT} value={coord} onChange={(e) => setCoord(e.target.value)}>
                  <option value="">Select</option>
                  {meta.coordinators.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.team})</option>)}
                </select></div>
              <Button disabled={!coord} onClick={() => run(() => api.post(`/pmo/projects/${id}/assign`, { coordinator_id: Number(coord) }))}>Assign</Button>
            </div>
          )}
          {acc && !acc.accepted_at && <Button onClick={() => run(() => api.post(`/pmo/projects/${id}/accept`))}>Accept this project</Button>}
        </CardContent></Card>

      {d.can_manage && (
        <Card><CardHeader className="pb-0"><CardTitle className="text-base">Hold or resume</CardTitle></CardHeader>
          <CardContent className="pt-3 grid sm:grid-cols-4 gap-2 items-end">
            {d.hold ? (
              <><p className="sm:col-span-3 text-sm">On hold: {meta.hold_reasons.find((h: any) => h.code === d.hold.reason_code)?.label}{d.hold.note ? ` (${d.hold.note})` : ""}</p>
                <Button onClick={() => run(() => api.post(`/pmo/projects/${id}/resume`))}>Resume project</Button></>
            ) : (
              <><div><Label>Reason</Label>
                <select className={SELECT} value={hold.reason_code} onChange={(e) => setHold({ ...hold, reason_code: e.target.value })}>
                  {meta.hold_reasons.map((h: any) => <option key={h.code} value={h.code}>{h.label}</option>)}
                </select></div>
                <div className="sm:col-span-2"><Label>Note{hold.reason_code === "other" ? " (required)" : ""}</Label><Input value={hold.note} onChange={(e) => setHold({ ...hold, note: e.target.value })} /></div>
                <Button variant="outline" onClick={() => run(() => api.post(`/pmo/projects/${id}/hold`, { reason_code: hold.reason_code, note: hold.note || null }))}>Put on hold</Button></>
            )}
          </CardContent></Card>
      )}

      <Card><CardHeader className="pb-0"><CardTitle className="text-base">Out-of-scope work</CardTitle></CardHeader>
        <CardContent className="pt-3 space-y-3">
          {d.out_of_scope.map((o: any) => (
            <div key={o.id} className="text-sm border rounded-lg p-2 flex flex-wrap gap-2 items-center">
              <Badge variant="outline">{o.status}</Badge><span>{o.description}</span><span className="ml-auto text-slate-500">{o.effort_days} day(s)</span>
            </div>
          ))}
          <div className="grid sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-2"><Label>What does the client want added?</Label><Input value={oos.description} onChange={(e) => setOos({ ...oos, description: e.target.value })} /></div>
            <div><Label>Effort (days)</Label><Input type="number" min="0" step="0.5" value={oos.effort_days} onChange={(e) => setOos({ ...oos, effort_days: e.target.value })} /></div>
            <Button disabled={!oos.description || !oos.effort_days} onClick={() => run(async () => {
              await api.post(`/pmo/projects/${id}/out-of-scope`, { description: oos.description, effort_days: Number(oos.effort_days), amount_estimate: oos.amount_estimate ? Number(oos.amount_estimate) : null });
              setOos({ description: "", effort_days: "", amount_estimate: "" });
            })}>Request approval</Button>
          </div>
        </CardContent></Card>
    </div>
  );
}

function BusinessAnalysis({ d, run, id }: any) {
  const [f, setF] = useState<Record<string, string>>(Object.fromEntries(BA_FIELDS.map(([k]) => [k, d.business_analysis?.[k] ?? ""])));
  return (
    <Card><CardContent className="pt-5 space-y-3">
      {BA_FIELDS.map(([k, label]) => (
        <div key={k}><Label>{label}</Label>
          <textarea className="w-full min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
      ))}
      <Button onClick={() => run(() => api.put(`/pmo/projects/${id}/business-analysis`, f))}>Save business analysis</Button>
    </CardContent></Card>
  );
}

function Resources({ d, run, id }: any) {
  const [r, setR] = useState({ kind: "Logo", title: "", url: "" });
  return (
    <Card><CardContent className="pt-5 space-y-3">
      {d.resources.length === 0 && <p className="text-sm text-slate-500">No resources added yet.</p>}
      {d.resources.map((x: any) => (
        <div key={x.id} className="flex flex-wrap items-center gap-2 text-sm border rounded-lg p-2">
          <Badge variant="outline">{x.kind}</Badge>
          {x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{x.title}</a> : <span>{x.title}</span>}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => run(() => api.delete(`/pmo/projects/${id}/resources/${x.id}`))}>Remove</Button>
        </div>
      ))}
      <div className="grid sm:grid-cols-4 gap-2 items-end pt-2 border-t">
        <div><Label>Type</Label><select className={SELECT} value={r.kind} onChange={(e) => setR({ ...r, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
        <div><Label>Title</Label><Input value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} /></div>
        <div><Label>Link</Label><Input placeholder="https://" value={r.url} onChange={(e) => setR({ ...r, url: e.target.value })} /></div>
        <Button disabled={!r.title} onClick={() => run(async () => { await api.post(`/pmo/projects/${id}/resources`, { ...r, url: r.url || null }); setR({ kind: "Logo", title: "", url: "" }); })}>Add</Button>
      </div>
    </CardContent></Card>
  );
}

function Budget({ d, meta, run, id }: any) {
  const initial: Record<number, string> = {};
  d.allocations.forEach((a: any) => { initial[a.team_id] = String(a.amount); });
  const [amounts, setAmounts] = useState<Record<number, string>>(initial);
  const contract = d.gate.payment.contract_value;
  const limit = d.intake?.budget_cap != null ? Number(d.intake?.budget_cap) : contract;
  const total = Object.values(amounts).reduce((s, v) => s + Number(v || 0), 0);

  const [reason, setReason] = useState("");
  const [needReason, setNeedReason] = useState<string | null>(null);

  const save = async () => {
    const allocations = meta.departments.filter((t: any) => amounts[t.id] !== undefined && amounts[t.id] !== "").map((t: any) => ({ team_id: t.id, amount: Number(amounts[t.id]) }));
    try { await api.put(`/pmo/projects/${id}/budget`, { allocations, reason: reason.trim() || undefined }); setNeedReason(null); setReason(""); await run(async () => {}); }
    catch (e: any) { setNeedReason(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[[d.intake?.budget_cap != null ? "Max budget cap (Sales)" : "Contract value", money(limit)], ["Allocated", money(total)], ["Unallocated", money(limit - total)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"><div className="text-xs text-slate-500">{k}</div><div className="font-semibold">{v}</div></div>
        ))}
      </div>
      <Card><CardContent className="pt-5 space-y-3">
        {d.can_manage ? (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              {meta.departments.map((t: any) => (
                <div key={t.id}><Label>{t.name}</Label><Input type="number" min="0" value={amounts[t.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [t.id]: e.target.value })} /></div>
              ))}
            </div>
            {needReason && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">{needReason}</div>}
            {needReason && <div><Label>Reason for the increase</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>}
            <Button onClick={() => save()}>Save department budgets</Button>
          </>
        ) : (
          d.allocations.length === 0 ? <p className="text-sm text-slate-500">No department budget yet.</p> :
            d.allocations.map((a: any) => <div key={a.id} className="flex justify-between text-sm border-b py-1"><span>{a.team?.name}</span><span className="font-medium">{money(a.amount)}</span></div>)
        )}
        {d.overrides.map((o: any) => (
          <p key={o.id} className="text-xs text-amber-700">Lock override ({o.type}): {o.reason}</p>
        ))}
      </CardContent></Card>
    </div>
  );
}
