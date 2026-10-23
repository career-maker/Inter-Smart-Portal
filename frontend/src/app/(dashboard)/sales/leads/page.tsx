"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Search } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUSES = ["New", "Follow up", "Hot", "Ready to close", "Won", "Lost"];
const COLOR: Record<string, string> = {
  New: "bg-slate-100 text-slate-700", "Follow up": "bg-blue-100 text-blue-800", Hot: "bg-red-100 text-red-800",
  "Ready to close": "bg-amber-100 text-amber-800", Won: "bg-green-100 text-green-800", Lost: "bg-slate-200 text-slate-600",
};
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
const EMPTY = { name: "", contact_name: "", email: "", phone: "", source: "", expected_value: "", next_followup_at: "" };

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState<number | null>(null);
  const [act, setAct] = useState({ kind: "followup", title: "", due_at: "" });

  const load = useCallback(async () => {
    const r = await api.get("/sales/leads", { params: { status: status || undefined, search: search || undefined } });
    setLeads(r.data.data);
  }, [status, search]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const add = async () => {
    try {
      await api.post("/sales/leads", { ...form, expected_value: Number(form.expected_value || 0), next_followup_at: form.next_followup_at || null, email: form.email || null });
      setForm(EMPTY);
      load();
    } catch (e: any) { alert(errMsg(e)); }
  };

  const setLeadStatus = async (l: any, next: string) => {
    let lost_reason: string | undefined;
    if (next === "Lost") {
      lost_reason = prompt("Why was this lead lost?") || undefined;
      if (!lost_reason) return;
    }
    try { await api.put(`/sales/leads/${l.id}`, { status: next, lost_reason }); load(); } catch (e: any) { alert(errMsg(e)); }
  };

  const addActivity = async (id: number) => {
    try {
      await api.post(`/sales/leads/${id}/activities`, { ...act, due_at: act.due_at || null });
      setAct({ kind: "followup", title: "", due_at: "" });
      setOpen(null);
      load();
    } catch (e: any) { alert(errMsg(e)); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-7 w-7 text-amber-500" /> Leads
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Track every lead from first contact to a signed project.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Add a lead</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-6 gap-2 items-end">
          <div className="sm:col-span-2"><Label>Company / client</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Contact</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Expected value</Label><Input type="number" min="0" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value })} /></div>
          <div><Label>Next follow-up</Label><Input type="date" value={form.next_followup_at} onChange={(e) => setForm({ ...form, next_followup_at: e.target.value })} /></div>
          <Button className="sm:w-32" disabled={!form.name} onClick={add}>Add lead</Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        {["", ...STATUSES].map((s) => (
          <Button key={s || "all"} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s || "All"}</Button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="p-3">Lead</th><th className="p-3">Status</th><th className="p-3 text-right">Value</th>
                <th className="p-3">Next follow-up</th><th className="p-3">Open items</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b last:border-0 align-top">
                  <td className="p-3"><div className="font-medium text-slate-900 dark:text-white">{l.name}</div><div className="text-xs text-slate-500">{l.contact_name} {l.phone}</div></td>
                  <td className="p-3">
                    <select className={`rounded-full px-2 py-1 text-xs font-semibold border-0 ${COLOR[l.status]}`} value={l.status} onChange={(e) => setLeadStatus(l, e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-right">{money(l.expected_value)}</td>
                  <td className="p-3">{l.next_followup_at || "-"}</td>
                  <td className="p-3">{l.open_activities > 0 ? <Badge>{l.open_activities}</Badge> : "-"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setOpen(open === l.id ? null : l.id)}>Add to inbox</Button>
                    {open === l.id && (
                      <div className="mt-2 grid gap-2 text-left">
                        <select className="h-9 rounded-md border bg-transparent px-2 text-sm" value={act.kind} onChange={(e) => setAct({ ...act, kind: e.target.value })}>
                          <option value="followup">Follow-up</option><option value="proposal">Proposal</option><option value="meeting">Meeting</option><option value="other">Other</option>
                        </select>
                        <Input placeholder="What needs doing?" value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} />
                        <Input type="date" value={act.due_at} onChange={(e) => setAct({ ...act, due_at: e.target.value })} />
                        <Button size="sm" disabled={!act.title} onClick={() => addActivity(l.id)}>Save</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No leads yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
