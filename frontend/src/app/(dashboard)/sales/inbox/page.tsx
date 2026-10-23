"use client";

import { useEffect, useState, useCallback } from "react";
import { Inbox } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const KINDS = [["", "All"], ["followup", "Follow-up"], ["proposal", "Proposal"], ["meeting", "Meeting"], ["other", "Other"]];
const today = () => new Date().toISOString().slice(0, 10);

export default function SalesInboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [kind, setKind] = useState("");
  const [outcome, setOutcome] = useState<Record<number, string>>({});
  const [next, setNext] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const r = await api.get("/sales/inbox", { params: { kind: kind || undefined } });
    setItems(r.data.data);
  }, [kind]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const update = async (id: number, status: "Done" | "Cancelled") => {
    try {
      await api.put(`/sales/activities/${id}`, { status, outcome: outcome[id] || null, next_followup_at: next[id] || null });
      load();
    } catch (e: any) { alert(e?.response?.data?.message || "Could not update."); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Inbox className="h-7 w-7 text-amber-500" /> Sales Inbox
        </h1>
        <p className="text-slate-600 dark:text-slate-300">Follow-ups, proposals and meetings waiting for a status update.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {KINDS.map(([k, label]) => <Button key={k || "all"} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{label}</Button>)}
      </div>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">Nothing waiting. 🎉</p>}
        {items.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{a.kind}</Badge>
                <span className="font-medium text-slate-900 dark:text-white">{a.title}</span>
                <span className="text-sm text-slate-500">{a.lead?.name}</span>
                {a.due_at && <span className={`ml-auto text-xs ${a.due_at <= today() ? "text-red-600 font-semibold" : "text-slate-500"}`}>due {a.due_at}</span>}
              </div>
              <div className="grid sm:grid-cols-4 gap-2 items-center">
                <Input className="sm:col-span-2" placeholder="Outcome / status update" value={outcome[a.id] || ""} onChange={(e) => setOutcome({ ...outcome, [a.id]: e.target.value })} />
                <Input type="date" min={today()} title="Next follow-up" value={next[a.id] || ""} onChange={(e) => setNext({ ...next, [a.id]: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => update(a.id, "Done")}>Done</Button>
                  <Button size="sm" variant="ghost" onClick={() => update(a.id, "Cancelled")}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
