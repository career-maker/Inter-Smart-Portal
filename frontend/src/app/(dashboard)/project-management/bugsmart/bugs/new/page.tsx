"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bug, ArrowLeft } from "lucide-react";
import { ReportBugDrawer } from "@/components/bugzilla/ReportBugDrawer";

export default function NewBugzillaBugPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPortalProjectId = searchParams.get("portal_project_id");
  const initialTaskId = searchParams.get("task_id");

  const handleClose = () => {
    router.push("/project-management/bugsmart/bugs");
  };

  const handleSuccess = (newBug: any) => {
    if (newBug?.id) {
      router.push(`/project-management/bugsmart/bugs/${newBug.id}`);
    } else {
      router.push("/project-management/bugsmart/bugs");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/project-management/bugsmart/bugs"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-rose-600" />
              <span>Report Defect</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The bug report drawer has opened on the right.
            </p>
          </div>
        </div>
      </div>

      <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <Bug className="w-10 h-10 mx-auto text-rose-500/40 mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Side Drawer Open
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          Complete the defect fields in the drawer on the right. Your selected Project and Task will remain pre-filled for consecutive defect reporting.
        </p>
      </div>

      {/* Side popup drawer */}
      <ReportBugDrawer
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        defaultProjectId={initialPortalProjectId ? Number(initialPortalProjectId) : undefined}
        defaultTaskId={initialTaskId ? Number(initialTaskId) : undefined}
      />
    </div>
  );
}
