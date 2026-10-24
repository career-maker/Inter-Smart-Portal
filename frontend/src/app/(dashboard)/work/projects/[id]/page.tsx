"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import UiPages from "@/components/work/UiPages";
import Sprints from "@/components/work/Sprints";
import QaReviews from "@/components/work/QaReviews";

// Tabs are added here as each department's work screens are built.
const TABS = [{ key: "ui", label: "UI pages" }, { key: "sprints", label: "UX / Dev sprints" }, { key: "qa", label: "QA" }];

export default function WorkProjectPage() {
  const id = useParams<{ id: string }>().id;
  const [tab, setTab] = useState("ui");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/work" className="text-sm text-slate-500 flex items-center gap-1 hover:underline"><ArrowLeft className="h-4 w-4" /> My Work</Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Project work</h1>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm rounded-t-md ${tab === t.key ? "bg-white dark:bg-slate-800 font-semibold border border-b-0 border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "ui" && <UiPages projectId={id} />}
      {tab === "sprints" && <Sprints projectId={id} />}
      {tab === "qa" && <QaReviews projectId={id} />}
    </div>
  );
}
