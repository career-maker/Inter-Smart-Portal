"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  X,
  Rocket,
  Calendar,
  Clock,
  Activity,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileText,
  Building2,
  User,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Loader2,
  FolderKanban,
} from "lucide-react";
import pmApi from "@/services/pm";
import { Project, ProjectStatusDetailsData, TaskStatus } from "@/types/pm";
import { ProjectStatusBadge } from "@/components/project-management/ProjectStatusBadge";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { RoyalAvatar } from "@/components/ui/RoyalAvatar";

interface ProjectStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number | null;
  onOpenMarkLive?: (project: Project) => void;
}

type DrawerTab = "overview" | "phases" | "tasks" | "members" | "deviations" | "after_live";

export function ProjectStatusDrawer({
  isOpen,
  onClose,
  projectId,
  onOpenMarkLive,
}: ProjectStatusDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectStatusDetailsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveTab("overview");

    pmApi.getProjectStatusDetails(projectId)
      .then((res) => {
        if (res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load project status details", err);
        setError(err?.response?.data?.message || err?.message || "Failed to load project details.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const project = data?.project;
  const stats = data?.stats;
  const subPhases = data?.sub_phases_analytics || [];
  const deviations = data?.deviations || [];
  const afterLiveTasks = data?.after_live_tasks || [];
  const hubstaff = data?.hubstaff_analytics;
  const allTasks = project?.tasks || [];

  const completionPct = stats && stats.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : project?.is_live || project?.status === "Completed" ? 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        style={{
          fontFamily: '"Proxima Nova", sans-serif',
        }}
        className="fixed inset-y-0 right-0 max-w-full flex pl-10 sm:pl-16 z-10"
      >
        <div className="w-screen max-w-3xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* ── Top Header ── */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-white dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#56348f]/10 text-[#56348f] dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-xs shrink-0">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {project ? project.name : "Loading Project Status..."}
                  </h2>
                  {project && <ProjectStatusBadge status={project.status} />}
                  {project?.is_live && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <Rocket className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Made Live</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
                  <span>{project?.team?.name || "General Department"}</span>
                  {project?.category && (
                    <>
                      <span>•</span>
                      <span>{project.category}</span>
                    </>
                  )}
                  {project?.coordinator && (
                    <>
                      <span>•</span>
                      <span>Coordinator: {project.coordinator.first_name} {project.coordinator.last_name}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {project && !project.is_live && onOpenMarkLive && (
                <button
                  type="button"
                  onClick={() => onOpenMarkLive(project)}
                  style={{
                    backgroundColor: "#56348f",
                    color: "rgb(255, 255, 255)",
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 400,
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] shadow-sm transition-colors cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 !text-white" />
                  <span className="!text-white">Mark Made Live</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            {[
              { id: "overview", label: "360° Overview", count: undefined },
              { id: "phases", label: "Phases", count: subPhases.length },
              { id: "tasks", label: "Tasks", count: stats?.total_tasks },
              { id: "deviations", label: "Deviations", count: deviations.length, badgeColor: deviations.length > 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" : undefined },
              { id: "members", label: "Team & Hubstaff", count: stats?.total_members },
              { id: "after_live", label: "After-Live Tests", count: afterLiveTasks.length },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DrawerTab)}
                  style={{
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 400,
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 text-[13px] leading-[20px] font-normal transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "border-[#56348f] text-[#56348f] dark:text-purple-300 font-bold"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        tab.badgeColor || (isSelected ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400")
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Drawer Body ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#56348f] dark:text-purple-400" />
                <p className="text-xs font-semibold">Loading 360° Project Status...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : !data || !project ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No project details found.
              </div>
            ) : (
              <>
                {/* ──────────────── TAB: OVERVIEW ──────────────── */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Live Status Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-slate-50 dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 border border-purple-200/60 dark:border-purple-800/40 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Production Status
                            </span>
                            {project.is_live ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Live Since {project.live_date ? format(parseISO(project.live_date), "dd MMM yyyy") : "N/A"}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                In Development / Pre-Live
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {project.is_live
                              ? "This project is live in production. Ongoing testing and client feedback tasks are tracked under After-Live Activity."
                              : "Project deliverables and phases are currently under active planning and execution."}
                          </p>
                        </div>

                        {!project.is_live && onOpenMarkLive && (
                          <button
                            type="button"
                            onClick={() => onOpenMarkLive(project)}
                            style={{
                              backgroundColor: "#56348f",
                              color: "rgb(255, 255, 255)",
                              fontFamily: '"Proxima Nova", sans-serif',
                              fontSize: "13px",
                              lineHeight: "20px",
                              fontWeight: 400,
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] shadow-sm transition-colors cursor-pointer shrink-0"
                          >
                            <Rocket className="w-4 h-4 !text-white" />
                            <span className="!text-white">Mark as Made Live</span>
                          </button>
                        )}
                      </div>

                      {project.live_notes && (
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                          <p className="font-bold text-slate-900 dark:text-white mb-0.5">Go-Live Release Notes:</p>
                          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{project.live_notes}</p>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-400">Deliverables Completion Rate</span>
                          <span className="text-[#56348f] dark:text-purple-300 font-bold">{completionPct}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#56348f] to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Tasks</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.total_tasks ?? 0}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.completed_tasks ?? 0}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Active / In Progress</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.active_tasks ?? 0}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Overdue</p>
                        <p className={`text-2xl font-bold ${(stats?.overdue_tasks ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                          {stats?.overdue_tasks ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Details Card */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Project Lifecycle & Dates
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Created On</p>
                            <p className="text-slate-900 dark:text-white font-semibold">
                              {project.created_at ? format(parseISO(project.created_at), "dd MMM yyyy, hh:mm a") : "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Timeline</p>
                            <p className="text-slate-900 dark:text-white font-semibold">
                              {project.start_date ? format(parseISO(project.start_date), "dd MMM yyyy") : "TBD"} → {project.expected_end_date ? format(parseISO(project.expected_end_date), "dd MMM yyyy") : "TBD"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Department</p>
                            <p className="text-slate-900 dark:text-white font-semibold">
                              {project.team?.name || "General"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Project Coordinator</p>
                            <p className="text-slate-900 dark:text-white font-semibold">
                              {project.coordinator ? `${project.coordinator.first_name} ${project.coordinator.last_name}` : "Not Assigned"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {project.description && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                          <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Project Scope / Summary:</p>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{project.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Hubstaff Snapshot */}
                    {hubstaff && (
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                              Hubstaff Work Tracking
                            </h3>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {hubstaff.avg_activity_percentage}% Avg Activity
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {hubstaff.total_tracked_formatted}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">computer tracked time on this project</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ──────────────── TAB: PHASES ──────────────── */}
                {activeTab === "phases" && (
                  <div className="space-y-4">
                    {subPhases.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No sub-phases configured for this project.
                      </div>
                    ) : (
                      subPhases.map((sp) => (
                        <div
                          key={sp.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-purple-100 text-[#56348f] dark:bg-purple-950/80 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                                {sp.order}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{sp.name}</h4>
                            </div>
                            <span className="text-xs font-bold text-[#56348f] dark:text-purple-300">
                              {sp.progress_percentage}% Completed
                            </span>
                          </div>

                          {/* Progress line */}
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${sp.progress_percentage}%` }}
                            />
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span>Total: <strong className="text-slate-800 dark:text-slate-200">{sp.total_tasks}</strong></span>
                            <span>Done: <strong className="text-emerald-600 dark:text-emerald-400">{sp.completed_tasks}</strong></span>
                            <span>Active: <strong className="text-purple-600 dark:text-purple-400">{sp.in_progress_tasks}</strong></span>
                            <span>Forecast: <strong className="text-slate-600 dark:text-slate-400">{sp.forecast_tasks}</strong></span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ──────────────── TAB: TASKS ──────────────── */}
                {activeTab === "tasks" && (
                  <div className="space-y-3">
                    {allTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No tasks created under this project yet.
                      </div>
                    ) : (
                      allTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {t.title}
                              </h5>
                              <TaskStatusBadge status={t.status} />
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              Phase: {t.sub_phase?.name || (t as any).subPhase?.name || "General"} • Assignees: {t.assignees?.map((a: any) => `${a.first_name} ${a.last_name || ""}`).join(", ") || "Unassigned"}
                            </p>
                          </div>

                          <div className="text-right shrink-0 text-xs">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              {t.due_date ? format(parseISO(t.due_date), "dd MMM") : "No date"}
                            </p>
                            {t.allotted_days && (
                              <p className="text-[11px] text-slate-400">{t.allotted_days} days allotted</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ──────────────── TAB: DEVIATIONS ──────────────── */}
                {activeTab === "deviations" && (
                  <div className="space-y-4">
                    {deviations.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">No Deviations Recorded</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto">
                          All tasks were delivered on schedule and within their allotted timeframe with zero deviation.
                        </p>
                      </div>
                    ) : (
                      deviations.map((d) => {
                        const isPositive = Number(d.deviation) > 0;
                        return (
                          <div
                            key={d.id}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">{d.title}</h5>
                                  <TaskStatusBadge status={d.status} />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Phase: <strong>{d.sub_phase_name}</strong>
                                </p>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 ${
                                  isPositive
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                }`}
                              >
                                {isPositive ? `+${d.deviation} days late` : `${d.deviation} days early`}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 py-1 bg-slate-50 dark:bg-slate-900/60 px-3 rounded-xl">
                              <span>Allotted: <strong>{d.allotted_days ?? "—"}d</strong></span>
                              <span>Days Taken: <strong>{d.days_taken ?? "—"}d</strong></span>
                              <span>Time Taken: <strong>{d.time_taken ?? "—"}h</strong></span>
                            </div>

                            {d.deviation_reason && (
                              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200">Deviation Reason: </span>
                                <span>{d.deviation_reason}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ──────────────── TAB: MEMBERS & HUBSTAFF ──────────────── */}
                {activeTab === "members" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Engaged Team Members & Hubstaff Activity
                      </h3>
                      {hubstaff && (
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          {hubstaff.members.length} Tracked Contributors
                        </span>
                      )}
                    </div>

                    {hubstaff && hubstaff.members.length > 0 ? (
                      <div className="space-y-2.5">
                        {hubstaff.members.map((m) => (
                          <div
                            key={m.hubstaff_user_id}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <RoyalAvatar name={m.name} size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {m.name}
                                  </h5>
                                  {m.is_linked && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      Portal Employee
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {m.employee_code ? `Code: ${m.employee_code} • ` : ""}
                                  {m.team_name ? `${m.team_name} • ` : ""}
                                  {m.designation || "Member"}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{m.tracked_formatted}</p>
                              <span
                                className={`text-[11px] font-semibold ${
                                  m.activity_percentage >= 50
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {m.activity_percentage}% Avg Activity
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {project.members && project.members.length > 0 ? (
                          project.members.map((mem) => (
                            <div
                              key={mem.id}
                              className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <RoyalAvatar name={`${mem.first_name} ${mem.last_name}`} size="sm" />
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                    {mem.first_name} {mem.last_name}
                                  </h5>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {mem.employee_code ? `Code: ${mem.employee_code}` : "Team Member"}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {mem.pivot?.project_role || "Member"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            No Hubstaff work activity or roster members recorded for this project yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ──────────────── TAB: AFTER-LIVE TESTS ──────────────── */}
                {activeTab === "after_live" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#56348f] dark:text-purple-300">
                        <Sparkles className="w-4 h-4" />
                        <span>Post-Launch Testing & Warranty Tasks</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[13px] leading-[18px]">
                        Tasks created or active after the project went live on production. Used for post-deployment smoke tests, warranty period tweaks, and client change requests.
                      </p>
                    </div>

                    {afterLiveTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        {project.is_live
                          ? "No after-live tasks created yet for this project."
                          : "Project is not yet marked as Made Live. After-live tasks will appear here once live."}
                      </div>
                    ) : (
                      afterLiveTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">{t.title}</h5>
                              <TaskStatusBadge status={t.status} />
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Created: {t.created_at ? format(parseISO(t.created_at), "dd MMM yyyy") : "N/A"} • Phase: {t.sub_phase?.name || (t as any).subPhase?.name || "General"}
                            </p>
                          </div>

                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t.due_date ? format(parseISO(t.due_date), "dd MMM") : "No due date"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
