"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const COLOR: Record<string, string> = { Pending: "bg-amber-100 text-amber-800", Approved: "bg-green-100 text-green-800", Rejected: "bg-red-100 text-red-800" };
const money = (n: number | string) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function OutOfScopePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("Pending");
  const [isManager, setIsManager] = useState(false);
  const [note, setNote] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const r = await api.get("/pmo/out-of-scope", { params: { status: status || undefined } });
    setRows(r.data.data);
  }, [status]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => { api.get("/pmo/meta").then((r) => setIsManager(r.data.is_manager)).catch(() => {}); }, []);

  const decide = async (id: number, decision: "approve" | "reject") => {
    try { await api.post(`/pmo/out-of-scope/${id}/decide`, { decision, note: note[id] || null }); load(); }
    catch (e: any) { alert(e?.response?.data?.message || "Could not save the decision."); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck2 className="h-7 w-7 text-amber-500" /> Out-of-scope requests
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Extra work asked for by clients. Approval tells Sales to agree the extra cost with the client.</p>
      </div>

      <div className="flex gap-2">
        {["Pending", "Approved", "Rejected", ""].map((s) => <Button key={s || "all"} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s || "All"}</Button>)}
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-500">Nothing here.</p>}
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/pmo/projects/${r.project_id}`} className="font-semibold text-slate-900 dark:text-white hover:underline">{r.project_name}</Link>
                <Badge className={COLOR[r.status]}>{r.status}</Badge>
                <span className="ml-auto text-sm text-slate-500">{r.effort_days} day(s){r.amount_estimate ? `, about ${money(r.amount_estimate)}` : ""} · asked by {r.requested_by_name}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{r.description}</p>
              {r.decision_note && <p className="text-xs text-slate-500">Decision note: {r.decision_note}</p>}
              {r.can_decide && r.status === "Pending" && (
                <div className="grid sm:grid-cols-4 gap-2 items-center">
                  <Input className="sm:col-span-2" placeholder="Note (required to reject)" value={note[r.id] || ""} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} />
                  <Button size="sm" onClick={() => decide(r.id, "approve")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "reject")}>Reject</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
