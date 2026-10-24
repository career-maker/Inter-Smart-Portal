"use client";

import { ShieldCheck } from "lucide-react";
import QaReviews from "@/components/work/QaReviews";

export default function QaQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-amber-500" /> QA queue</h1>
        <p className="text-slate-600 dark:text-slate-300">Finished tasks waiting to be tested. Take a review, list the bugs, then pass it or send it back.</p>
      </div>
      <QaReviews />
    </div>
  );
}
