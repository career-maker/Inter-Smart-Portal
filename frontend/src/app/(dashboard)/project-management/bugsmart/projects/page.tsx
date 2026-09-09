"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  RefreshCw,
  ExternalLink,
  Layers,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Bug,
  CheckSquare,
  Search,
  User,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Loader2,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import pmApi from "@/services/pm";
import { BugzillaProject, BugzillaComponent, BugzillaBug } from "@/types/bugzilla";
import { Project, ProjectTask } from "@/types/pm";
import { PageLoader } from "@/components/ui/PageLoader";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";
import { BugzillaStatusBadge } from "@/components/bugzilla/BugzillaStatusBadge";
import { BugzillaSeverityBadge } from "@/components/bugzilla/BugzillaSeverityBadge";
import { BugzillaPriorityBadge } from "@/components/bugzilla/BugzillaPriorityBadge";
import { openReportBugDrawer } from "@/components/bugzilla/ReportBugDrawer";
import { TaskPriorityBadge } from "@/components/project-management/TaskPriorityBadge";
import { TaskStatusBadge } from "@/components/project-management/TaskStatusBadge";
import { ProjectStatusBadge } from "@/components/project-management/ProjectStatusBadge";

interface UnifiedProjectCard {
  id: number;
  portal_project_id: number;
  name: string;
  description?: string | null;
  status: string;
  category?: string | null;
  project_type?: string | null;
  team?: { id: number; name: string; code?: string } | null;
  coordinator?: { id: number; first_name: string; last_name: string; email?: string } | null;
  tasks_count?: number;
  active_tasks_count?: number;
  completed_tasks_count?: number;
  bugs_count?: number;
  open_bugs_count?: number;
  critical_bugs_count?: number;
  components_count?: number;
}

export default function BugSmartProjectsPage() {
  const { canDevelop, canReport } = useBugzillaAuth();

  // State
  const [projects, setProjects] = useState<UnifiedProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Project for Drawer (Tasks & Bugs)
  const [selectedProject, setSelectedProject] = useState<UnifiedProjectCard | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "bugs" | "components">("bugs");

  // Drawer details state
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectBugs, setProjectBugs] = useState<BugzillaBug[]>([]);
  const [projectComponents, setProjectComponents] = useState<BugzillaComponent[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [bugSearch, setBugSearch] = useState("");

  // Adding component state
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentDesc, setNewComponentDesc] = useState("");
  const [addingComponent, setAddingComponent] = useState(false);

  // Fetch projects from Project Management AND bugSmart metrics
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [pmRes, bzRes] = await Promise.allSettled([
        pmApi.getProjects({ all: true } as any),
        bugzillaApi.getProjects({ per_page: 100 }),
      ]);

      let portalList: Project[] = [];
      if (pmRes.status === "fulfilled" && pmRes.value) {
        portalList = (pmRes.value as any).data || (Array.isArray(pmRes.value) ? pmRes.value : []);
      }

      // If all=true returned empty, fallback to standard paginated projects
      if (portalList.length === 0) {
        try {
          const fallbackRes = await pmApi.getProjects({ per_page: 100 } as any);
          portalList = (fallbackRes as any).data || (Array.isArray(fallbackRes) ? fallbackRes : []);
        } catch {
          // Keep empty if failed
        }
      }

      let bugzillaProjects: BugzillaProject[] = [];
      if (bzRes.status === "fulfilled" && bzRes.value) {
        bugzillaProjects = (bzRes.value as any).projects || (bzRes.value as any).data || [];
      }

      // Map bugzilla metrics by portal_project_id
      const bzMap = new Map<number, BugzillaProject>();
      for (const bz of bugzillaProjects) {
        const pId = bz.portal_project_id || bz.id;
        bzMap.set(pId, bz);
      }

      // Build unified cards
      const unified: UnifiedProjectCard[] = portalList.map((p) => {
        const bz = bzMap.get(p.id);
        return {
          id: p.id,
          portal_project_id: p.id,
          name: p.name,
          description: p.description,
          status: p.status || "active",
          category: p.category,
          project_type: p.project_type,
          team: (p as any).team || null,
          coordinator: (p as any).coordinator || null,
          tasks_count: (p as any).tasks_count || 0,
          active_tasks_count: (p as any).active_tasks_count || 0,
          completed_tasks_count: (p as any).completed_tasks_count || 0,
          bugs_count: bz?.bugs_count ?? 0,
          open_bugs_count: bz?.open_bugs_count ?? 0,
          critical_bugs_count: bz?.critical_bugs_count ?? 0,
          components_count: bz?.components_count ?? bz?.components?.length ?? 0,
        };
      });

      // Also include any bugzilla projects not found in portalList
      for (const bz of bugzillaProjects) {
        const pId = bz.portal_project_id || bz.id;
        if (!unified.some((u) => u.portal_project_id === pId)) {
          unified.push({
            id: pId,
            portal_project_id: pId,
            name: bz.name,
            description: bz.description,
            status: bz.status || "active",
            team: bz.portal_project?.team || null,
            coordinator: (bz.portal_project as any)?.coordinator || null,
            tasks_count: 0,
            bugs_count: bz.bugs_count || 0,
            open_bugs_count: bz.open_bugs_count || 0,
            critical_bugs_count: bz.critical_bugs_count || 0,
            components_count: bz.components_count || bz.components?.length || 0,
          });
        }
      }

      setProjects(unified);
    } catch (err: any) {
      console.error("Failed to load projects:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load project details (tasks, bugs, components) when a project is clicked
  const handleOpenProjectDrawer = async (proj: UnifiedProjectCard, initialTab: "tasks" | "bugs" | "components" = "bugs") => {
    setSelectedProject(proj);
    setActiveTab(initialTab);
    setDrawerLoading(true);
    setTaskSearch("");
    setBugSearch("");
    setNewComponentName("");
    setNewComponentDesc("");

    try {
      const [tasksRes, bugsRes, compRes] = await Promise.allSettled([
        pmApi.getTasks({ project_id: proj.portal_project_id, per_page: 100 }),
        bugzillaApi.getBugs({ portal_project_id: proj.portal_project_id, per_page: 100 }),
        bugzillaApi.getComponents(proj.portal_project_id),
      ]);

      if (tasksRes.status === "fulfilled" && tasksRes.value) {
        const taskList = (tasksRes.value as any).data || (Array.isArray(tasksRes.value) ? tasksRes.value : []);
        setProjectTasks(taskList);
      } else {
        setProjectTasks([]);
      }

      if (bugsRes.status === "fulfilled" && bugsRes.value) {
        const bugList = (bugsRes.value as any).data || (bugsRes.value as any).bugs || [];
        setProjectBugs(bugList);
      } else {
        setProjectBugs([]);
      }

      if (compRes.status === "fulfilled" && compRes.value) {
        const compList = (compRes.value as any).data || (compRes.value as any).components || [];
        setProjectComponents(compList);
      } else {
        setProjectComponents([]);
      }
    } catch (err: any) {
      console.error("Error loading project details:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Add Component in Drawer
  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newComponentName.trim()) return;

    setAddingComponent(true);
    try {
      const res = await bugzillaApi.createComponent(selectedProject.portal_project_id, {
        name: newComponentName.trim(),
        description: newComponentDesc.trim() || undefined,
      });

      const added = res.data || res;
      setProjectComponents((prev) => [...prev, added]);
      setNewComponentName("");
      setNewComponentDesc("");
      setSuccess(`Component "${added.name}" added successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to add component.");
    } finally {
      setAddingComponent(false);
    }
  };

  // Delete Component in Drawer
  const handleDeleteComponent = async (compId: number) => {
    if (!confirm("Are you sure you want to delete this component?")) return;

    try {
      await bugzillaApi.deleteComponent(compId);
      setProjectComponents((prev) => prev.filter((c) => c.id !== compId));
      setSuccess("Component deleted.");
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete component.");
    }
  };

  // Filtered lists
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.team?.name.toLowerCase().includes(q) ||
        `${p.coordinator?.first_name} ${p.coordinator?.last_name}`.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!taskSearch.trim()) return projectTasks;
    const q = taskSearch.toLowerCase();
    return projectTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        t.assignees?.some((a) => `${a.first_name} ${a.last_name}`.toLowerCase().includes(q))
    );
  }, [projectTasks, taskSearch]);

  const filteredBugs = useMemo(() => {
    if (!bugSearch.trim()) return projectBugs;
    const q = bugSearch.toLowerCase();
    return projectBugs.filter(
      (b) =>
        b.bug_number.toLowerCase().includes(q) ||
        b.summary.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        b.severity.toLowerCase().includes(q) ||
        b.priority.toLowerCase().includes(q)
    );
  }, [projectBugs, bugSearch]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-rose-600" />
            <span>bugSmart Projects & Components</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unified directly with Project Management. Click any project to inspect its tasks, defects, and components.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 w-48 sm:w-60"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Projects Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <FolderTree className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">No Projects Found</h3>
            <p className="text-xs max-w-sm mx-auto">
              {searchQuery ? "No projects match your search query." : "Projects created or imported in Project Management will appear here automatically for defect tracking."}
            </p>
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const portalId = proj.portal_project_id || proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => handleOpenProjectDrawer(proj, "bugs")}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-rose-300 dark:hover:border-rose-700/60 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {proj.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Project #{portalId}</span>
                        {proj.team && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {proj.team.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ProjectStatusBadge status={proj.status as any} />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description || "No project description provided."}
                  </p>

                  {/* Badges row: Tasks & Bugs counts */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      <CheckSquare className="w-3 h-3 text-indigo-500" />
                      {proj.tasks_count || 0} Tasks
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold">
                      <Bug className="w-3 h-3 text-rose-500" />
                      {proj.bugs_count || 0} Bugs
                    </span>
                    {(proj.critical_bugs_count || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold">
                        {proj.critical_bugs_count} Critical
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with Actions */}
                <div
                  className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenProjectDrawer(proj, "components")}
                    className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{proj.components_count || 0} Components</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenProjectDrawer(proj, "tasks")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                      Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenProjectDrawer(proj, "bugs")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <Bug className="w-3.5 h-3.5 text-rose-600" />
                      Bugs
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Project Tasks & Bugs Drawer ── */}
      {selectedProject && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedProject.name}
                  </h3>
                  <ProjectStatusBadge status={selectedProject.status as any} />
                  {selectedProject.category && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {selectedProject.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  {selectedProject.team && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Team: <strong className="text-slate-700 dark:text-slate-300">{selectedProject.team.name}</strong>
                    </span>
                  )}
                  {selectedProject.coordinator && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Coordinator: <strong className="text-slate-700 dark:text-slate-300">{selectedProject.coordinator.first_name} {selectedProject.coordinator.last_name}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canReport && (
                  <button
                    type="button"
                    onClick={() => openReportBugDrawer(selectedProject.portal_project_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Report Bug
                  </button>
                )}
                <Link
                  href={`/project-management/projects/${selectedProject.portal_project_id}`}
                  target="_blank"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Open Project Management overview"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setActiveTab("bugs")}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "bugs"
                    ? "border-rose-600 text-rose-600 dark:text-rose-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Bugs / Defects</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono">
                  {projectBugs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "tasks"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tasks</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  {projectTasks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("components")}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "components"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Components</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                  {projectComponents.length}
                </span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                  <span className="text-xs">Loading project details…</span>
                </div>
              ) : activeTab === "bugs" ? (
                /* ── BUGS TAB ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search bugs by ID, summary, status…"
                        value={bugSearch}
                        onChange={(e) => setBugSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    {canReport && (
                      <button
                        type="button"
                        onClick={() => openReportBugDrawer(selectedProject.portal_project_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Report Bug
                      </button>
                    )}
                  </div>

                  {filteredBugs.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <Bug className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {bugSearch ? "No bugs match your search." : "No defects reported for this project yet."}
                      </div>
                      {canReport && !bugSearch && (
                        <button
                          type="button"
                          onClick={() => openReportBugDrawer(selectedProject.portal_project_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Report First Bug
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredBugs.map((b) => (
                        <Link
                          key={b.id}
                          href={`/project-management/bugsmart/bugs/${b.id}`}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-rose-400 dark:hover:border-rose-700 flex flex-col gap-2 transition-all block group"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
                                {b.bug_number}
                              </span>
                              <BugzillaStatusBadge status={b.status} size="sm" />
                              <BugzillaSeverityBadge severity={b.severity} showIcon={false} />
                              <BugzillaPriorityBadge priority={b.priority} />
                            </div>

                            <span className="text-[10px] text-slate-400">
                              {new Date(b.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                            {b.summary}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-2">
                              {b.component && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">
                                  {b.component.name}
                                </span>
                              )}
                              <span>Reporter: {b.reporter ? `${b.reporter.first_name} ${b.reporter.last_name}` : "—"}</span>
                            </div>
                            <div>
                              Assignee: <strong className="text-slate-700 dark:text-slate-300">{b.assignee ? `${b.assignee.first_name} ${b.assignee.last_name}` : "Unassigned"}</strong>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "tasks" ? (
                /* ── TASKS TAB ── */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tasks by title, status, assignee…"
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {filteredTasks.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {taskSearch ? "No tasks match your search." : "No tasks found for this project in Project Management."}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTasks.map((t) => (
                        <Link
                          key={t.id}
                          href={`/project-management/tasks/${t.id}`}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-700 flex flex-col gap-2 transition-all block group"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400">#{t.id}</span>
                              <TaskStatusBadge status={t.status} />
                              <TaskPriorityBadge priority={t.priority} />
                            </div>

                            {t.due_date && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Due: {t.due_date}
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                            {t.title}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>
                                {t.assignees && t.assignees.length > 0
                                  ? t.assignees.map((a) => `${a.first_name} ${a.last_name}`).join(", ")
                                  : "Unassigned"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {(t.bugs_count || 0) > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                                  <Bug className="w-2.5 h-2.5" />
                                  {t.bugs_count} defects
                                </span>
                              )}
                              {canReport && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openReportBugDrawer(selectedProject.portal_project_id, t.id);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="Report defect for this task"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Bug</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── COMPONENTS TAB ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Modular Components</h4>
                      <p className="text-[11px] text-slate-500">
                        Classify defects into subsystem areas (e.g. Frontend, Auth, Checkout).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {projectComponents.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No custom components added yet. Defects will default to "General".
                      </div>
                    ) : (
                      projectComponents.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</div>
                            {c.description && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {c.description}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-1">
                              {c.bugs_count || 0} defects linked
                            </div>
                          </div>

                          {canDevelop && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComponent(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Delete component"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {canDevelop && (
                    <form onSubmit={handleAddComponent} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Add New Component</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Component Name (e.g. UI, Auth, API)"
                          value={newComponentName}
                          onChange={(e) => setNewComponentName(e.target.value)}
                          required
                          className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={newComponentDesc}
                          onChange={(e) => setNewComponentDesc(e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={addingComponent || !newComponentName.trim()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {addingComponent ? "Adding…" : "Add Component"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
