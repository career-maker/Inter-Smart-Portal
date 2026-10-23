"use client";

import { useEffect, useState, useCallback } from "react";
import { FolderPlus } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORIES = ["CMS", "Ecom", "Custom web", "Mobile app"];
const PLATFORMS: Record<string, string[]> = {
  CMS: ["WordPress", "Strapi", "PHP", "Node", "AI/Custom"],
  Ecom: ["WooCommerce", "Shopify", "PHP", "Node", "AI/Custom"],
  "Custom web": ["PHP", "Node", "AI/Custom"],
  "Mobile app": ["PHP", "Node"],
};
const STATE_COLOR: Record<string, string> = {
  "Advance awaiting": "bg-amber-100 text-amber-800", "Pending payment": "bg-blue-100 text-blue-800",
  "Paid in full": "bg-green-100 text-green-800", "No finance record": "bg-slate-100 text-slate-700",
};
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
const EMPTY = { name: "", client_name: "", client_email: "", client_phone: "", site_category: "CMS", cms_variant: "", platform: "WordPress", pages_count: "", quality_level: "Standard", budget: "", overview: "", lead_id: "" };

export default function SalesProjectsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get("/sales/projects");
    setRows(r.data.data);
  }, []);
  useEffect(() => {
    load().catch(() => {});
    api.get("/sales/leads").then((r) => setLeads(r.data.data.filter((l: any) => l.status !== "Won" && l.status !== "Lost"))).catch(() => {});
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      await api.post("/sales/projects", {
        ...form, budget: Number(form.budget), pages_count: form.pages_count ? Number(form.pages_count) : null,
        cms_variant: form.cms_variant || null, lead_id: form.lead_id ? Number(form.lead_id) : null,
        client_email: form.client_email || null, client_phone: form.client_phone || null, overview: form.overview || null,
      });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (e: any) { alert(errMsg(e)); } finally { setBusy(false); }
  };

  const changeStatus = async (p: any, status: string) => {
    const reason = prompt(`Reason for ${status === "Active" ? "resuming" : status === "On Hold" ? "holding" : "terminating"} "${p.name}"?`);
    if (!reason) return;
    try { await api.post(`/sales/projects/${p.id}/status`, { status, reason }); load(); } catch (e: any) { alert(errMsg(e)); }
  };

  return (
    <div className="space-y-6 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FolderPlus className="h-7 w-7 text-amber-500" /> Sales Projects
          </h1>
          <p className="text-slate-600 dark:text-slate-300">Create projects and follow payment and progress.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close" : "New project"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">New project</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-2"><Label>Project name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>From lead (optional)</Label>
              <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={form.lead_id} onChange={(e) => {
                const l = leads.find((x) => String(x.id) === e.target.value);
                setForm({ ...form, lead_id: e.target.value, client_name: l?.name || form.client_name, client_email: l?.email || form.client_email, client_phone: l?.phone || form.client_phone, budget: l?.expected_value || form.budget });
              }}>
                <option value="">None</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
            <div><Label>Client</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Client email</Label><Input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></div>
            <div><Label>Client phone</Label><Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} /></div>
            <div><Label>Budget</Label><Input type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={form.site_category} onChange={(e) => setForm({ ...form, site_category: e.target.value, platform: PLATFORMS[e.target.value][0], cms_variant: "" })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div><Label>Platform</Label>
              <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORMS[form.site_category].map((p) => <option key={p}>{p}</option>)}
              </select></div>
            {form.site_category === "CMS" && (
              <div><Label>CMS kind</Label>
                <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={form.cms_variant} onChange={(e) => setForm({ ...form, cms_variant: e.target.value })}>
                  <option value="">Standard</option><option>Copy of other website</option><option>AI/Custom</option>
                </select></div>
            )}
            <div><Label>Number of pages{form.cms_variant === "Copy of other website" ? " (required)" : ""}</Label><Input type="number" min="1" value={form.pages_count} onChange={(e) => setForm({ ...form, pages_count: e.target.value })} /></div>
            <div><Label>Quality level</Label>
              <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={form.quality_level} onChange={(e) => setForm({ ...form, quality_level: e.target.value })}>
                <option>Basic</option><option>Standard</option><option>Premium</option>
              </select></div>
            <div className="sm:col-span-4"><Label>Scope / overview</Label><Input value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} /></div>
            <Button disabled={busy || !form.name || !form.client_name || form.budget === ""} onClick={create}>Create project</Button>
            <p className="sm:col-span-3 text-xs text-slate-500">Accounts is told an advance payment is awaiting. You are told when it is approved.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="p-3">Project</th><th className="p-3">Status</th><th className="p-3">Type</th>
                <th className="p-3 text-right">Contract</th><th className="p-3 text-right">Received</th>
                <th className="p-3">Payment</th><th className="p-3">Progress</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3"><div className="font-medium text-slate-900 dark:text-white">{p.name}</div><div className="text-xs text-slate-500">{p.client_name}</div></td>
                  <td className="p-3"><Badge variant="outline">{p.status}</Badge></td>
                  <td className="p-3">{p.site_category} / {p.platform}{p.pages_count ? ` / ${p.pages_count} pages` : ""}</td>
                  <td className="p-3 text-right">{money(p.contract_value)}</td>
                  <td className="p-3 text-right">{money(p.received)}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATE_COLOR[p.state]}`}>{p.state}</span></td>
                  <td className="p-3">{p.progress_percent === null ? "-" : `${p.progress_percent}%`}</td>
                  <td className="p-3 text-right space-x-1 whitespace-nowrap">
                    {p.status !== "On Hold" && p.status !== "Cancelled" && <Button size="sm" variant="outline" onClick={() => changeStatus(p, "On Hold")}>Hold</Button>}
                    {p.status === "On Hold" && <Button size="sm" variant="outline" onClick={() => changeStatus(p, "Active")}>Resume</Button>}
                    {p.status !== "Cancelled" && <Button size="sm" variant="ghost" onClick={() => confirm(`Terminate "${p.name}"?`) && changeStatus(p, "Cancelled")}>Terminate</Button>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">No projects yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
