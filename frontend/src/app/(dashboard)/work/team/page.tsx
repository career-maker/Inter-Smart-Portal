"use client";

import { SelectCompat } from "@/components/ui/SelectCompat";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Users } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const errMsg = (e: any) => (e?.response?.data?.errors ? Object.values(e.response.data.errors as Record<string, string[]>)[0]?.[0] : e?.response?.data?.message) || "Something went wrong. Please try again.";
const SELECT = "w-full h-10 rounded-md border bg-transparent px-2 text-sm";

/** Team lead's list: open and late work, days spent and leave this month, and this month's feedback (four fixed questions). */
export default function TeamPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [member, setMember] = useState<any>(null);

  const load = useCallback(() => {
    api.get("/work/team").then((r) => setD(r.data)).catch((e) => { if ([403, 404].includes(e?.response?.status)) setUnavailable(true); });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">The team list is for team leads only.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><Users className="h-7 w-7 text-amber-500" /> My team</h1>
        <p className="text-slate-600 dark:text-slate-300">Work, time and leave for {d.month}. Give each person their monthly feedback here.</p>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">Name</th><th className="p-3">Open tasks</th><th className="p-3">Late</th><th className="p-3">Days spent</th><th className="p-3">Leave days</th><th className="p-3">Rating</th><th className="p-3" /></tr></thead>
          <tbody>
            {d.members.map((m: any) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="p-3 font-medium text-slate-900 dark:text-white">{m.name}<div className="text-xs text-slate-500">{m.team}</div></td>
                <td className="p-3">{m.open_tasks}</td>
                <td className="p-3"><span className={m.late_tasks ? "text-red-600 font-semibold" : ""}>{m.late_tasks}</span></td>
                <td className="p-3">{m.days_spent_month}</td>
                <td className="p-3">{m.leave_days_month}</td>
                <td className="p-3">{m.average_rating ?? "-"}</td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setMember(m)}>{m.feedback_this_month ? "Edit feedback" : "Give feedback"}</Button></td>
              </tr>
            ))}
            {d.members.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No one else is on your team yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
      {member && <FeedbackDialog member={member} questions={d.questions} onClose={() => setMember(null)} onSaved={() => { setMember(null); load(); }} />}
    </div>
  );
}

function FeedbackDialog({ member, questions, onClose, onSaved }: { member: any; questions: Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const prev = member.feedback_this_month || {};
  const [scores, setScores] = useState<Record<string, string>>(Object.fromEntries(Object.keys(questions).map((k) => [k, prev[k] ? String(prev[k]) : ""])));
  const [comment, setComment] = useState(prev.comment || "");
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    try { await api.post(`/work/team/${member.id}/feedback`, { ...Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Number(v)])), comment: comment || null }); onSaved(); }
    catch (e: any) { setErr(errMsg(e)); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 py-4 pr-14 border-b border-slate-200 dark:border-slate-800"><DialogTitle className="text-lg">Feedback for {member.name}</DialogTitle></DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-slate-500 [&>*]:shrink-0">
          {err && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2">{err}</div>}
          {Object.entries(questions).map(([k, q]) => (
            <div key={k}><Label>{q} (1 = poor, 5 = excellent)</Label>
              <SelectCompat className={SELECT} value={scores[k]} onChange={(e) => setScores({ ...scores, [k]: e.target.value })}>
                <option value="">Choose</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </SelectCompat></div>
          ))}
          <div><Label>Comment (optional)</Label><Input value={comment} onChange={(e) => setComment(e.target.value)} /></div>
          <Button className="w-full" disabled={Object.values(scores).some((v) => !v)} onClick={save}>Save feedback</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
