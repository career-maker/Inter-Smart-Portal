"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import { BugzillaProject, BugzillaComponent } from "@/types/bugzilla";
import { PageLoader } from "@/components/ui/PageLoader";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";

export default function BugSmartProjectsPage() {
  const { canDevelop } = useBugzillaAuth();

  // State
  const [projects, setProjects] = useState<BugzillaProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Components Modal state
  const [activeProjectForComponents, setActiveProjectForComponents] = useState<BugzillaProject | null>(null);
  const [components, setComponents] = useState<BugzillaComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentDesc, setNewComponentDesc] = useState("");
  const [addingComponent, setAddingComponent] = useState(false);

  // Fetch projects from bugSmart API (directly backed by Portal Projects)
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await bugzillaApi.getProjects({ per_page: 100 });
      setProjects(res.data || []);
    } catch (err: any) {
      console.error("Failed to fetch bugSmart projects", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open component manager for a project
  const handleOpenComponents = async (proj: BugzillaProject) => {
    setActiveProjectForComponents(proj);
    setLoadingComponents(true);
    setNewComponentName("");
    setNewComponentDesc("");

    try {
      const res = await bugzillaApi.getComponents(proj.id);
      setComponents(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load components.");
    } finally {
      setLoadingComponents(false);
    }
  };

  // Add a new component
  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectForComponents || !newComponentName.trim()) return;

    setAddingComponent(true);
    setError(null);

    try {
      const res = await bugzillaApi.createComponent(activeProjectForComponents.id, {
        name: newComponentName.trim(),
        description: newComponentDesc.trim() || undefined,
      });

      setComponents((prev) => [...prev, res.data]);
      setNewComponentName("");
      setNewComponentDesc("");
      setSuccess(`Component "${res.data.name}" added successfully.`);
      fetchData(); // update component count on cards
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to add component.");
    } finally {
      setAddingComponent(false);
    }
  };

  // Delete a component
  const handleDeleteComponent = async (compId: number) => {
    if (!confirm("Are you sure you want to delete this component?")) return;

    try {
      await bugzillaApi.deleteComponent(compId);
      setComponents((prev) => prev.filter((c) => c.id !== compId));
      setSuccess("Component deleted.");
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete component.");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-rose-600" />
            <span>bugSmart Projects & Components</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unified directly with Project Management. View defect metrics and manage project components.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
        {projects.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <FolderTree className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">No Projects Found</h3>
            <p className="text-xs max-w-sm mx-auto">
              Projects created or imported in Project Management will appear here automatically for defect tracking.
            </p>
          </div>
        ) : (
          projects.map((proj) => {
            const portalId = proj.portal_project_id || proj.id;
            return (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{proj.name}</h3>
                      <Link
                        href={`/project-management/projects/${portalId}`}
                        className="text-[11px] text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>Project #{portalId}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        String(proj.status).toUpperCase() === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description || "No project description provided."}
                  </p>

                  {/* Bug counts badges */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      <Bug className="w-3 h-3 text-slate-500" />
                      {proj.bugs_count || 0} Total
                    </span>
                    {(proj.open_bugs_count || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                        {proj.open_bugs_count} Open
                      </span>
                    )}
                    {(proj.critical_bugs_count || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold">
                        {proj.critical_bugs_count} Critical
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with Component count and actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{proj.components_count || proj.components?.length || 0} Components</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenComponents(proj)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Components
                    </button>
                    <Link
                      href={`/project-management/bugsmart/bugs?portal_project_id=${portalId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors"
                    >
                      View Bugs
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Manage Components Drawer / Modal ── */}
      {activeProjectForComponents && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Manage Components: {activeProjectForComponents.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Components group bugs into modular functional areas (e.g., UI, Backend, Auth).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveProjectForComponents(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of existing components */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingComponents ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading components…</div>
              ) : components.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No components defined yet for this project.
                </div>
              ) : (
                components.map((c) => (
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add new component form */}
            {canDevelop && (
              <form onSubmit={handleAddComponent} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Add New Component</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Component Name (e.g., UI, Auth)"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingComponent ? "Adding…" : "Add Component"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
