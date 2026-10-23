"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarClock } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS_COLOR: Record<string, string> = {
  Active: "bg-green-100 text-green-800", Expired: "bg-red-100 text-red-800",
  Renewed: "bg-blue-100 text-blue-800", Cancelled: "bg-slate-100 text-slate-700",
};

export default function AmcPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [expiring, setExpiring] = useState(false);
  const [form, setForm] = useState({ project_id: "", client_name: "", start_date: "", end_date: "", amount: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api.get("/accounts/amc", { params: { expiring_in: expiring ? 30 : undefined } });
    setRows(res.data.data);
  }, [expiring]);

  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => { api.get("/accounts/projects").then((r) => setProjects(r.data.data)).catch(() => {}); }, []);

  const add = async () => {
    setError("");
    try {
      await api.post("/accounts/amc", { ...form, project_id: Number(form.project_id), amount: Number(form.amount || 0), client_name: form.client_name || null });
      setForm({ project_id: "", client_name: "", start_date: "", end_date: "", amount: "" });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not save the AMC.");
    }
  };

  const setStatus = async (id: number, status: string) => {
    await api.put(`/accounts/amc/${id}`, { status });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarClock className="h-7 w-7 text-amber-500" /> AMC List
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Annual maintenance contracts. Contracts past their end date show as Expired.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Add AMC</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-6 gap-2 items-end">
          <div className="sm:col-span-2"><Label>Project</Label>
            <select className="w-full h-9 rounded-md border bg-transparent px-2 text-sm" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">Select</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><Label>Client</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
          <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          <div><Label>Amount</Label><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <Button className="sm:col-span-6 sm:w-40" disabled={!form.project_id || !form.start_date || !form.end_date} onClick={add}>Add AMC</Button>
          {error && <p className="sm:col-span-6 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button size="sm" variant={expiring ? "outline" : "default"} onClick={() => setExpiring(false)}>All</Button>
        <Button size="sm" variant={expiring ? "default" : "outline"} onClick={() => setExpiring(true)}>Expiring in 30 days</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="p-3">Project</th><th className="p-3">Client</th><th className="p-3">Period</th>
                <th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-slate-900 dark:text-white">{a.project?.name}</td>
                  <td className="p-3">{a.client_name || "-"}</td>
                  <td className="p-3">{a.start_date} to {a.end_date}</td>
                  <td className="p-3 text-right">{money(a.amount)}</td>
                  <td className="p-3"><Badge className={STATUS_COLOR[a.effective_status]}>{a.effective_status}</Badge></td>
                  <td className="p-3 text-right space-x-1">
                    {a.status === "Active" && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "Renewed")}>Mark renewed</Button>}
                    {a.status === "Active" && <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "Cancelled")}>Cancel</Button>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No AMC contracts.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
