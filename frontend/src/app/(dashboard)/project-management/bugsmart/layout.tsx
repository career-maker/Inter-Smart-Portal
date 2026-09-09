"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bug,
  LayoutDashboard,
  ListOrdered,
  FolderTree,
  BarChart3,
  BookmarkCheck,
  Plus,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";
import { PageLoader } from "@/components/ui/PageLoader";
import { ReportBugDrawer, openReportBugDrawer } from "@/components/bugzilla/ReportBugDrawer";

const SUB_NAV_ITEMS = [
  { href: "/project-management/bugsmart/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/project-management/bugsmart/bugs", label: "Bugs", icon: ListOrdered },
  { href: "/project-management/bugsmart/projects", label: "Projects & Components", icon: FolderTree },
  { href: "/project-management/bugsmart/reports", label: "Reports", icon: BarChart3 },
  { href: "/project-management/bugsmart/saved-searches", label: "Saved Searches", icon: BookmarkCheck },
  { href: "/project-management/bugsmart/permissions", label: "Team Permissions", icon: ShieldCheck },
];

export default function BugzillaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, canView, canReport, capability, isSuperAdmin } = useBugzillaAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-12">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
          <h2 className="text-xl font-bold">bugSmart Access Restricted</h2>
          <p className="text-sm max-w-md mx-auto text-amber-800/90 dark:text-amber-300/90">
            bugSmart is either not enabled for your team, or your account does not have an active capability (Viewer, Reporter, or Developer).
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            Please contact a Super Administrator to enable the bugSmart add-on for your department in Add-ons → All Add-ons Directory.
          </p>
          <div className="pt-2">
            <Link
              href="/project-management"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 transition-colors"
            >
              Return to Project Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      {/* ── Top Header Banner ── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
            {/* Title & Capability */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/50 text-rose-600 dark:text-rose-400">
                <Bug className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    bugSmart Defect Management
                  </h1>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      isSuperAdmin
                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                        : capability === "Developer"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                        : capability === "Reporter"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {capability}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive bug tracking, lifecycle triage, component assignments, and issue history.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {canReport && (
                <button
                  type="button"
                  onClick={() => openReportBugDrawer()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Report Bug
                </button>
              )}
            </div>
          </div>

          {/* ── Sub Navigation Tabs ── */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {SUB_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/project-management/bugsmart/overview" && pathname === "/project-management/bugsmart") ||
                (item.href === "/project-management/bugsmart/bugs" && pathname.startsWith("/project-management/bugsmart/bugs"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-400 font-bold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>

      {/* ── Global Side Drawer for Report Bug ── */}
      <ReportBugDrawer />
    </div>
  );
}
