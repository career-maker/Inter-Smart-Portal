"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  FolderKanban,
  Search,
  RefreshCw,
  Rocket,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  Building2,
  Calendar,
  Users,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { Project, ProjectStatus, PROJECT_STATUSES } from "@/types/pm";
import { ProjectStatusBadge } from "@/components/project-management/ProjectStatusBadge";
import { TeamFilterSelector } from "@/components/project-management/TeamFilterSelector";
import { ProjectStatusDrawer } from "@/components/project-management/ProjectStatusDrawer";
import { MarkLiveModal } from "@/components/project-management/MarkLiveModal";

export default function ProjectStatusPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";
  const isAdmin = userRoleStr === "admin";
  const isTeamLead = userRoleStr === "team lead";

  // Data & Loading state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [liveFilter, setLiveFilter] = useState<"all" | "live" | "pre_live">("all");

  // Modals / Drawers
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [markLiveProject, setMarkLiveProject] = useState<Project | null>(null);
  const [isMarkLiveOpen, setIsMarkLiveOpen] = useState(false);

  const fetchProjects = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      setLoading(true);
      setError(null);

      try {
        const params: any = { per_page: "all", all: true };
        if (selectedTeamId !== "all") {
          params.team_id = selectedTeamId;
        }

        const res = await pmApi.getProjects(params);
        const list = res.data || [];
        setProjects(Array.isArray(list) ? list : []);
      } catch (err: any) {
        console.error("Failed to load project status list", err);
        setError(err?.response?.data?.message || err?.message || "Failed to load projects list.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedTeamId]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Client-side filtering
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Department filter check
      if (selectedTeamId !== "all" && p.team_id !== selectedTeamId) {
        return false;
      }

      // Search check
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const coordMatch = p.coordinator
          ? `${p.coordinator.first_name} ${p.coordinator.last_name}`.toLowerCase().includes(q)
          : false;
        const liveNotesMatch = p.live_notes?.toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !catMatch && !coordMatch && !liveNotesMatch) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "All" && p.status !== statusFilter) {
        return false;
      }

      // Live filter
      if (liveFilter === "live" && !p.is_live) return false;
      if (liveFilter === "pre_live" && p.is_live) return false;

      return true;
    });
  }, [projects, selectedTeamId, searchTerm, statusFilter, liveFilter]);

  const handleOpenDrawer = (proj: Project) => {
    setSelectedProjectId(proj.id);
    setIsDrawerOpen(true);
  };

  const handleOpenMarkLiveModal = (proj: Project) => {
    setMarkLiveProject(proj);
    setIsMarkLiveOpen(true);
  };

  const handleMarkLiveSuccess = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
    );
    fetchProjects(true);
  };

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = filteredProjects.length;
    const liveCount = filteredProjects.filter((p) => p.is_live).length;
    const activeCount = filteredProjects.filter((p) => p.status === "Active" || p.status === "Planning").length;
    const completedCount = filteredProjects.filter((p) => p.status === "Completed").length;
    return { total, liveCount, activeCount, completedCount };
  }, [filteredProjects]);

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", sans-serif',
      }}
      className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
    >
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Project Status</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span>Project Status</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              360° Lifecycle & Live Tracking
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive project progress, phase completions, active deliverables, member engagement, and production Go-Live milestones.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {(isSuperAdmin || isAdmin || isTeamLead) && (
            <TeamFilterSelector
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
            />
          )}

          <button
            onClick={() => fetchProjects(true)}
            disabled={refreshing || loading}
            aria-label="Refresh Projects Status"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh status list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#56348f]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Summary KPI Ribbon (Keka Style) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 border-l-[3px] border-l-indigo-600 shadow-xs space-y-1">
          <p className="text-[13px] leading-[20px] font-medium text-slate-600 dark:text-slate-400">Total Monitored Projects</p>
          <p className="kpi-number text-slate-900 dark:text-white">{metrics.total}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 border-l-[3px] border-l-emerald-500 shadow-xs space-y-1">
          <p className="text-[13px] leading-[20px] font-medium text-slate-600 dark:text-slate-400">Made Live (In Production)</p>
          <div className="flex items-center gap-2">
            <p className="kpi-number text-emerald-600 dark:text-emerald-400">{metrics.liveCount}</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Live
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 border-l-[3px] border-l-sky-500 shadow-xs space-y-1">
          <p className="text-[13px] leading-[20px] font-medium text-slate-600 dark:text-slate-400">Active Deliverables</p>
          <p className="kpi-number text-sky-600 dark:text-sky-400">{metrics.activeCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 border-l-[3px] border-l-purple-500 shadow-xs space-y-1">
          <p className="text-[13px] leading-[20px] font-medium text-slate-600 dark:text-slate-400">Completed Lifecycle</p>
          <p className="kpi-number text-slate-900 dark:text-white">{metrics.completedCount}</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Status Pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["All", ...PROJECT_STATUSES].map((status) => {
              const isSelected = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    backgroundColor: isSelected ? "#56348f" : undefined,
                    color: isSelected ? "rgb(255, 255, 255)" : undefined,
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontSize: "13px",
                    lineHeight: "20px",
                    fontWeight: 400,
                  }}
                  className={`px-3 py-1 rounded-xl text-[13px] leading-[20px] font-normal whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#56348f] !text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800/60 !text-slate-800 dark:!text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>

          {/* Live Filter Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLiveFilter("all")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                liveFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-[#56348f] dark:text-purple-300 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Projects
            </button>
            <button
              type="button"
              onClick={() => setLiveFilter("live")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                liveFilter === "live"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Made Live
            </button>
            <button
              type="button"
              onClick={() => setLiveFilter("pre_live")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                liveFilter === "pre_live"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Pre-Live
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, category, department, coordinator, or go-live notes..."
            style={{
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: 400,
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-[13px] leading-[20px] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* ── Projects Table / List ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#56348f] dark:text-purple-400" />
            <p className="text-xs font-semibold">Loading projects status...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 dark:text-rose-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No projects match the selected filters.</p>
            <p className="text-xs text-slate-400">Try changing your search keywords or switching department filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
                  <th className="py-3.5 px-4 sm:px-6 whitespace-nowrap">Project Name & Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Department & Coordinator</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Lifecycle Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Deliverables Progress</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Go-Live Date</th>
                  <th className="py-3.5 px-4 text-right pr-6 whitespace-nowrap min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {filteredProjects.map((p) => {
                  const tasksTotal = p.tasks_count ?? 0;
                  const tasksCompleted = p.completed_tasks_count ?? 0;
                  const progressPct = tasksTotal > 0
                    ? Math.round((tasksCompleted / tasksTotal) * 100)
                    : p.is_live || p.status === "Completed" ? 100 : 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenDrawer(p)}
                      className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      {/* Name & Category */}
                      <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors flex items-center gap-2">
                          <span>{p.name}</span>
                          {p.is_live && (
                            <span title="Made Live in Production" className="inline-flex items-center">
                              <Rocket className="w-3.5 h-3.5 text-emerald-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                          {p.category || "Standard Deliverable"} • Created {p.created_at ? format(parseISO(p.created_at), "dd MMM yyyy") : "N/A"}
                        </p>
                      </td>

                      {/* Department & Coordinator */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.team?.name || "General"}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                          PC: {p.coordinator ? `${p.coordinator.first_name} ${p.coordinator.last_name}` : "Not Assigned"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ProjectStatusBadge status={p.status} />
                          {p.is_live && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Live
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-4 px-4 min-w-[160px] whitespace-nowrap">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          <span>{tasksCompleted}/{tasksTotal} Tasks</span>
                          <span className="text-[#56348f] dark:text-purple-300 font-bold">{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-[#56348f] rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Go-Live Date */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {p.is_live && p.live_date ? (
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              {format(parseISO(p.live_date), "dd MMM yyyy")}
                            </span>
                            {p.liveMarker && (
                              <p className="text-[10px] text-slate-400">
                                by {p.liveMarker.first_name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right pr-6 whitespace-nowrap min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap flex-nowrap shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(p)}
                            style={{
                              fontFamily: '"Proxima Nova", sans-serif',
                              fontSize: "13px",
                              lineHeight: "20px",
                              fontWeight: 400,
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[#56348f] dark:text-purple-300 text-[13px] leading-[20px] font-normal border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            title="View full 360° Project Status Drawer"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">View Status</span>
                          </button>

                          {!p.is_live && (
                            <button
                              type="button"
                              onClick={() => handleOpenMarkLiveModal(p)}
                              style={{
                                backgroundColor: "#56348f",
                                color: "rgb(255, 255, 255)",
                                fontFamily: '"Proxima Nova", sans-serif',
                                fontSize: "13px",
                                lineHeight: "20px",
                                fontWeight: 400,
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-[13px] leading-[20px] shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              title="Mark as Made Live"
                            >
                              <Rocket className="w-3.5 h-3.5 !text-white shrink-0" />
                              <span className="!text-white whitespace-nowrap">Made Live</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 360° Project Status Side Drawer ── */}
      <ProjectStatusDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        projectId={selectedProjectId}
        onOpenMarkLive={(proj) => {
          setIsDrawerOpen(false);
          handleOpenMarkLiveModal(proj);
        }}
      />

      {/* ── Mark Made Live Modal ── */}
      <MarkLiveModal
        isOpen={isMarkLiveOpen}
        onClose={() => setIsMarkLiveOpen(false)}
        project={markLiveProject}
        onSuccess={handleMarkLiveSuccess}
      />
    </div>
  );
}
