"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, Search, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATES = ["Advance awaiting", "Pending payment", "Paid in full", "No finance record"];
const STATE_COLOR: Record<string, string> = {
  "Advance awaiting": "bg-amber-100 text-amber-800",
  "Pending payment": "bg-blue-100 text-blue-800",
  "Paid in full": "bg-green-100 text-green-800",
  "No finance record": "bg-slate-100 text-slate-700",
};
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const errMsg = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";

export default function AccountsProjectsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/accounts/projects", { params: { payment_state: state || undefined, search: search || undefined } });
      setRows(res.data.data);
      setUnavailable(false);
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.response?.status === 403) setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [state, search]);

  useEffect(() => { load(); }, [load]);

  if (unavailable) {
    return <p className="text-slate-600 dark:text-slate-300">The Accounts module is not switched on for your account.</p>;
  }

  return (
    <div className="space-y-6 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-7 w-7 text-amber-500" /> Projects &amp; Payments
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Payment state of every project. Approve payments, raise budgets, hold or terminate.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["", ...STATES].map((s) => (
          <Button key={s || "all"} size="sm" variant={state === s ? "default" : "outline"} onClick={() => setState(s)}>
            {s || "All"}
          </Button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search project" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="p-3">Project</th><th className="p-3">Status</th>
                  <th className="p-3 text-right">Contract</th><th className="p-3 text-right">Received</th>
                  <th className="p-3 text-right">Balance</th><th className="p-3">Payment state</th><th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                    <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                    <td className="p-3 text-right">{money(r.contract_value)}</td>
                    <td className="p-3 text-right">{money(r.received)}</td>
                    <td className="p-3 text-right">{money(r.balance)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATE_COLOR[r.state]}`}>{r.state}</span>
                      {r.awaiting_payments > 0 && <span className="ml-2 text-xs text-amber-600">{r.awaiting_payments} to approve</span>}
                    </td>
                    <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Manage</Button></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No projects found.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {openId !== null && <ProjectDialog id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function ProjectDialog({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [contract, setContract] = useState("");
  const [pay, setPay] = useState({ kind: "advance", amount: "", due_date: "", reference: "" });
  const [budget, setBudget] = useState({ new_value: "", reason: "" });
  const [status, setStatus] = useState({ status: "On Hold", reason: "" });
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const res = await api.get(`/accounts/projects/${id}`);
    setD(res.data);
    setContract(String(res.data.finance?.contract_value ?? ""));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Run an action, show a friendly error, refresh this dialog and the list behind it.
  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); await load(); onChanged(); } catch (e: any) { alert(errMsg(e)); } finally { setBusy(false); }
  };

  if (!d) return null;
  const s = d.summary;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 py-4 pr-14 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg">{d.project.name}</DialogTitle>
          <p className="text-xs text-slate-500">{d.project.status}</p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500 [&>*]:shrink-0">

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[["Contract", money(s.contract_value)], ["Received", money(s.received)], ["Balance", money(s.balance)], ["Payment state", s.state]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
              <div className="text-xs text-slate-500">{k}</div>
              <div className="font-semibold break-words">{v}</div>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-base">Contract value</CardTitle></CardHeader>
          <CardContent className="flex gap-2 items-end pt-0">
            <div className="flex-1"><Label>Amount</Label><Input type="number" min="0" value={contract} onChange={(e) => setContract(e.target.value)} /></div>
            <Button disabled={busy || contract === ""} onClick={() => run(() => api.put(`/accounts/projects/${id}/finance`, { contract_value: Number(contract) }))}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-base">Payments</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            {d.payments.length === 0 && <p className="text-sm text-slate-500">No payments yet.</p>}
            {d.payments.map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm border rounded-lg p-2">
                <Badge variant="outline">{p.kind}</Badge>
                <span className="font-semibold">{money(p.amount)}</span>
                <span className="text-slate-500">{p.due_date ? `due ${p.due_date}` : ""} {p.reference || ""}</span>
                <Badge className="ml-auto">{p.status}</Badge>
                {p.status === "Awaiting" && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => run(() => api.post(`/accounts/payments/${p.id}/approve`))}>Approve</Button>
                    <Input className="w-40 h-8" placeholder="Reject reason" value={rejectReason[p.id] || ""} onChange={(e) => setRejectReason({ ...rejectReason, [p.id]: e.target.value })} />
                    <Button size="sm" variant="outline" disabled={busy || !rejectReason[p.id]} onClick={() => run(() => api.post(`/accounts/payments/${p.id}/reject`, { reason: rejectReason[p.id] }))}>Reject</Button>
                  </>
                )}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 items-end pt-3 border-t">
              <div><Label>Type</Label>
                <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={pay.kind} onChange={(e) => setPay({ ...pay, kind: e.target.value })}>
                  <option value="advance">Advance</option><option value="installment">Installment</option><option value="final">Final</option>
                </select></div>
              <div><Label>Amount</Label><Input type="number" min="0" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
              <div><Label>Due date</Label><Input type="date" value={pay.due_date} onChange={(e) => setPay({ ...pay, due_date: e.target.value })} /></div>
              <div><Label>Reference</Label><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></div>
              <Button disabled={busy || !pay.amount} onClick={() => run(async () => {
                await api.post(`/accounts/projects/${id}/payments`, { ...pay, amount: Number(pay.amount), due_date: pay.due_date || null, reference: pay.reference || null });
                setPay({ kind: "installment", amount: "", due_date: "", reference: "" });
              })}>Add payment</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-base">Increase budget</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 pt-0">
            <div><Label>New total</Label><Input type="number" min="0" value={budget.new_value} onChange={(e) => setBudget({ ...budget, new_value: e.target.value })} /></div>
            <div><Label>Reason</Label><Input value={budget.reason} onChange={(e) => setBudget({ ...budget, reason: e.target.value })} /></div>
            <Button disabled={busy || !budget.new_value || !budget.reason} onClick={() => run(async () => {
              await api.post(`/accounts/projects/${id}/budget-increase`, { new_value: Number(budget.new_value), reason: budget.reason });
              setBudget({ new_value: "", reason: "" });
            })}>Increase &amp; notify</Button>
            {d.budget_changes.length > 0 && (
              <ul className="text-xs text-slate-500 list-disc pl-4">
                {d.budget_changes.map((b: any) => <li key={b.id}>{money(b.old_value)} to {money(b.new_value)}: {b.reason}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-base">Project status ({d.project.status})</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 pt-0">
            <div><Label>Action</Label>
              <select className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={status.status} onChange={(e) => setStatus({ ...status, status: e.target.value })}>
                <option value="On Hold">Hold</option><option value="Cancelled">Terminate</option><option value="Active">Resume</option>
              </select></div>
            <div><Label>Reason (required)</Label><Input value={status.reason} onChange={(e) => setStatus({ ...status, reason: e.target.value })} /></div>
            <Button variant="outline" disabled={busy || !status.reason} onClick={() => {
              if (status.status === "Cancelled" && !confirm("Terminate this project?")) return;
              run(async () => { await api.post(`/accounts/projects/${id}/status`, status); setStatus({ ...status, reason: "" }); });
            }}>Apply</Button>
          </CardContent>
        </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
