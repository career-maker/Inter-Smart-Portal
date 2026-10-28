"use client";

import { useEffect, useState } from "react";
import { Loader2, BarChart3 } from "lucide-react";
import api from "@/services/api";

const dash = (v: any, suffix = "") => (v === null || v === undefined ? "-" : `${v}${suffix}`);

/** HR: the raw performance figures per person. No rating is calculated until HR approves a formula. */
export default function HrPerformancePage() {
  const [d, setD] = useState<any>(null);
  const [team, setTeam] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { setD(null); api.get("/hr/performance", { params: team ? { team_id: team } : {} }).then((r) => setD(r.data)).catch(() => setUnavailable(true)); }, [team]);

  if (unavailable) return <p className="text-slate-600 dark:text-slate-300">Performance figures are for HR.</p>;
  if (!d) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="h-7 w-7 text-amber-500" /> Performance figures</h1>
        <p className="text-slate-600 dark:text-slate-300">{d.note} Customer feedback does not count here.</p>
      </div>
      <select className="h-9 rounded-md border bg-transparent px-2 text-sm" value={team} onChange={(e) => setTeam(e.target.value)}>
        <option value="">All departments</option>
        {d.teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 text-left"><tr>
            {["Person", "Department", "Tasks done / assigned", "On time", "Effort spent vs estimate (days)", "QA bugs (serious)", "Latest feedback (1-5)", "Feedback average"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
          </tr></thead>
          <tbody>
            {d.data.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-200 dark:border-white/10">
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="px-3 py-2">{dash(r.team)}</td>
                <td className="px-3 py-2">{r.tasks_done} / {r.tasks_assigned}</td>
                <td className="px-3 py-2">{dash(r.on_time_percent, "%")}{r.tasks_done_late ? ` (${r.tasks_done_late} late)` : ""}</td>
                <td className="px-3 py-2">{r.effort_spent_days} vs {r.effort_estimated_days} ({r.effort_variance_days > 0 ? "+" : ""}{r.effort_variance_days})</td>
                <td className="px-3 py-2">{r.qa_bugs} ({r.qa_bugs_serious})</td>
                <td className="px-3 py-2">{dash(r.feedback_latest_avg)}{r.feedback_latest_month ? ` (${r.feedback_latest_month})` : ""}</td>
                <td className="px-3 py-2">{dash(r.feedback_overall_avg)}{r.feedback_count ? ` over ${r.feedback_count}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
