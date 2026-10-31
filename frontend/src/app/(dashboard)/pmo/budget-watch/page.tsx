"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Page, Section, Panel, Row, Dot, Spinner, money } from "@/components/clean";

/** Project managers: projects whose approved work costs more than the department budgets, and those nearing the limit. */
export default function BudgetWatchPage() {
  const [d, setD] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { api.get("/pmo/budget-watch").then((r) => setD(r.data)).catch(() => setUnavailable(true)); }, []);

  if (unavailable) return <Page title="Out of budget" hint="The out-of-budget list is for the project manager." children={null} />;
  if (!d) return <Spinner />;

  return (
    <Page title="Out of budget" hint="Approved sprints and changes compared with the department budgets.">
      <List title="Over the limit" rows={d.over} empty="No project is over its budget." tone="bad" />
      <List title={`Nearing the limit, ${d.near_percent}% or more`} rows={d.near} empty="No project is close to its limit." tone="warn" />
    </Page>
  );
}

function List({ title, rows, empty, tone }: { title: string; rows: any[]; empty: string; tone: "bad" | "warn" }) {
  return (
    <Section title={title} count={rows.length}>
      <Panel className="p-0">
        {rows.length === 0 && <Row className="text-slate-500">{empty}</Row>}
        {rows.map((r) => (
          <div key={r.id} className="border-b border-slate-200 dark:border-white/10 last:border-0">
            <Row className="border-b-0">
              <a href={`/pmo/projects/${r.id}`} className="font-medium text-slate-900 dark:text-white hover:underline">{r.name}</a>
              <Dot tone={tone}>{r.percent}%</Dot>
              <span className="ml-auto text-slate-600 dark:text-slate-300">{money(r.used)} of {money(r.budget)} days{r.overrun > 0 ? `, over by ${money(r.overrun)}` : ""}</span>
            </Row>
            <ul className="px-4 pb-2 text-xs text-slate-500 flex gap-x-4 flex-wrap">
              {r.departments.map((x: any) => <li key={x.team} className={x.over ? "text-red-700 dark:text-red-300" : ""}>{x.team}: {money(x.used)} of {money(x.budget)} days</li>)}
            </ul>
          </div>
        ))}
      </Panel>
    </Section>
  );
}
