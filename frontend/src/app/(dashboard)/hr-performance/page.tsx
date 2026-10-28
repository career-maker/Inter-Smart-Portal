"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Page, Panel, Spinner, field } from "@/components/clean";

const dash = (v: any, suffix = "") => (v === null || v === undefined ? "-" : `${v}${suffix}`);

/** HR: the raw performance figures per person. No rating is calculated until HR approves a formula. */
export default function HrPerformancePage() {
  const [d, setD] = useState<any>(null);
  const [team, setTeam] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { setD(null); api.get("/hr/performance", { params: team ? { team_id: team } : {} }).then((r) => setD(r.data)).catch(() => setUnavailable(true)); }, [team]);

  if (unavailable) return <Page title="Performance figures" hint="Performance figures are for HR." children={null} />;
  if (!d) return <Spinner />;

  const heads = ["Person", "Department", "Tasks done of assigned", "On time", "Effort spent against estimate, days", "QA bugs, serious", "Latest feedback, 1 to 5", "Feedback average"];
  return (
    <Page title="Performance figures" hint={`${d.note} Customer feedback does not count here.`}>
      <div className="max-w-xs">
        <select className={field} value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">All departments</option>
          {d.teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <Panel className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500">{heads.map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {d.data.map((r: any) => (
              <tr key={r.id} className="h-11 border-t border-slate-200 dark:border-white/10">
                <td className="px-4 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="px-4">{dash(r.team)}</td>
                <td className="px-4">{r.tasks_done} of {r.tasks_assigned}</td>
                <td className="px-4">{dash(r.on_time_percent, "%")}{r.tasks_done_late ? `, ${r.tasks_done_late} late` : ""}</td>
                <td className="px-4">{r.effort_spent_days} against {r.effort_estimated_days}, {r.effort_variance_days > 0 ? "+" : ""}{r.effort_variance_days}</td>
                <td className="px-4">{r.qa_bugs}, {r.qa_bugs_serious}</td>
                <td className="px-4">{dash(r.feedback_latest_avg)}{r.feedback_latest_month ? `, ${r.feedback_latest_month}` : ""}</td>
                <td className="px-4">{dash(r.feedback_overall_avg)}{r.feedback_count ? `, over ${r.feedback_count}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </Page>
  );
}
