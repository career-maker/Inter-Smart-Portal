"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState, useCallback } from "react";
import { Target, Trash2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SalesTargetsPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api.get("/accounts/targets", { params: { period } });
    setTargets(res.data.data);
  }, [period]);

  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => {
    api.get("/accounts/sales-people").then((r) => setEmployees(r.data?.data ?? [])).catch(() => {});
  }, []);

  const save = async () => {
    setError("");
    try {
      await api.post("/accounts/targets", { user_id: Number(userId), period, target_amount: Number(amount) });
      setAmount("");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not save the target.");
    }
  };

  return (
    <div className="space-y-6 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="h-7 w-7 text-amber-500" /> Sales Targets
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Set one target per person per month. Saving again updates it.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Set a target</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2 items-end">
          <div><Label>Month</Label><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div><Label>Person</Label>
            <SelectCompat className="w-full h-10 rounded-md border bg-transparent px-2 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select</option>
              {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </SelectCompat></div>
          <div><Label>Target amount</Label><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <Button disabled={!userId || !amount} onClick={save}>Save target</Button>
          {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Targets for {period}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {targets.length === 0 && <p className="text-sm text-slate-500">No targets set for this month.</p>}
          {targets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border rounded-lg p-2 text-sm">
              <span className="font-medium text-slate-900 dark:text-white">{t.user?.first_name} {t.user?.last_name}</span>
              <span className="ml-auto font-semibold">{money(t.target_amount)}</span>
              <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete this target?")) { await api.delete(`/accounts/targets/${t.id}`); load(); } }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
