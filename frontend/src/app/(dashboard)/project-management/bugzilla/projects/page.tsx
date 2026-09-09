"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  RefreshCw,
  FolderPlus,
  ExternalLink,
  Layers,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import { pmApi } from "@/services/pm";
import { BugzillaProject, BugzillaComponent } from "@/types/bugzilla";
import { Project } from "@/types/pm";
import { PageLoader } from "@/components/ui/PageLoader";
import { useBugzillaAuth } from "@/hooks/useBugzillaAuth";

export default function BugzillaProjectsPage() {
  const { isSuperAdmin, canDevelop } = useBugzillaAuth();

  // State
  const [projects, setProjects] = useState<BugzillaProject[]>([]);
  const [portalProjects, setPortalProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-create state
  const [autoCreating, setAutoCreating] = useState(false);

  // Manual Mapping Modal state
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedPortalId, setSelectedPortalId] = useState<number | "">("");
  const [mappingName, setMappingName] = useState("");
  const [mappingDesc, setMappingDesc] = useState("");
  const [submittingMap, setSubmittingMap] = useState(false);

  // Components Modal state
  const [activeProjectForComponents, setActiveProjectForComponents] = useState<BugzillaProject | null>(null);
  const [components, setComponents] = useState<BugzillaComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentDesc, setNewComponentDesc] = useState("");
  const [addingComponent, setAddingComponent] = useState(false);

  // Fetch Bugzilla projects & Portal projects
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [bzRes, pmRes] = await Promise.all([
        bugzillaApi.getProjects({ per_page: 100 }),
        pmApi.getProjects({ per_page: 100 }),
      ]);
      setProjects(bzRes.data || []);
      setPortalProjects(pmRes.data || []);
    } catch (err: any) {
      console.error("Failed to fetch Bugzilla projects", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Auto Create
  const handleAutoCreate = async () => {
    setAutoCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res: any = await bugzillaApi.autoCreateProjects();
      const created = res?.data?.created ?? res?.created ?? 0;
      const skipped = res?.data?.skipped ?? res?.skipped ?? 0;
      const failed = res?.data?.failed ?? res?.failed ?? 0;
      setSuccess(`Auto-create completed: ${created} created, ${skipped} skipped, ${failed} failed.`);
      await fetchData(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to auto-create projects.");
    } finally {
      setAutoCreating(false);
    }
  };

  // Open manual mapping modal
  const handleOpenMapModal = () => {
    const unmapped = unmappedPortalProjects;
    if (unmapped.length > 0) {
      setSelectedPortalId(unmapped[0].id);
      setMappingName(unmapped[0].name);
    } else {
      setSelectedPortalId("");
      setMappingName("");
    }
    setMappingDesc("");
    setMapModalOpen(true);
  };

  // Submit manual mapping
  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortalId) return;

    setSubmittingMap(true);
    setError(null);

    try {
      await bugzillaApi.createProject({
        portal_project_id: Number(selectedPortalId),
        name: mappingName.trim() || undefined,
        description: mappingDesc.trim() || undefined,
      });

      setSuccess("Project successfully mapped to Bugzilla.");
      setMapModalOpen(false);
      await fetchData(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to map project.");
    } finally {
      setSubmittingMap(false);
    }
  };

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
      console.warn("Failed to load components", err);
    } finally {
      setLoadingComponents(false);
    }
  };

  // Add component
  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectForComponents || !newComponentName.trim()) return;

    setAddingComponent(true);
    try {
      const res = await bugzillaApi.createComponent(activeProjectForComponents.id, {
        name: newComponentName.trim(),
        description: newComponentDesc.trim() || undefined,
      });
      setComponents((prev) => [...prev, res.data]);
      setNewComponentName("");
      setNewComponentDesc("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create component.");
    } finally {
      setAddingComponent(false);
    }
  };

  // Delete component
  const handleDeleteComponent = async (compId: number) => {
    if (!confirm("Are you sure you want to delete this component?")) return;
    try {
      await bugzillaApi.deleteComponent(compId);
      setComponents((prev) => prev.filter((c) => c.id !== compId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete component.");
    }
  };

  // Unmapped portal projects list
  const mappedPortalIds = new Set(projects.map((p) => p.portal_project_id));
  const unmappedPortalProjects = portalProjects.filter((p) => !mappedPortalIds.has(p.id));

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* ── Top Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-rose-600" />
            <span>bugSmart Project Mappings & Components</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Portal Projects serve as the single source of truth. Each bugSmart project represents a mapped Portal Project with modular components.
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

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={handleAutoCreate}
                disabled={autoCreating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${autoCreating ? "animate-spin" : ""}`} />
                {autoCreating ? "Auto-creating…" : "Auto Create bugSmart Projects"}
              </button>

              <button
                type="button"
                onClick={handleOpenMapModal}
                disabled={unmappedPortalProjects.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Map Portal Project
              </button>
            </>
          )}
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
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">No bugSmart Projects Mapped Yet</h3>
            <p className="text-xs max-w-sm mx-auto">
              Super Admins can click "Auto Create bugSmart Projects" to automatically map all existing Portal Projects into bugSmart.
            </p>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleAutoCreate}
                disabled={autoCreating}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto Create bugSmart Projects
              </button>
            )}
          </div>
        ) : (
          projects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{proj.name}</h3>
                    <Link
                      href={`/project-management/projects/${proj.portal_project_id}`}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>Portal Project #{proj.portal_project_id}</span>
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
              </div>

              {/* Footer with Component count and actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{proj.components?.length || 0} Components</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenComponents(proj)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Manage Components
                  </button>
                  <Link
                    href={`/project-management/bugzilla/bugs?portal_project_id=${proj.portal_project_id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors"
                  >
                    View Bugs
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Manual Mapping Modal ── */}
      {mapModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Map Portal Project to bugSmart</h3>
              <button type="button" onClick={() => setMapModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateMapping} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Portal Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPortalId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedPortalId(id);
                    const found = portalProjects.find((p) => p.id === id);
                    if (found) setMappingName(found.name);
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Select an unmapped project…</option>
                  {unmappedPortalProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  bugSmart Project Name
                </label>
                <input
                  type="text"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={mappingDesc}
                  onChange={(e) => setMappingDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMapModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMap || !selectedPortalId}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingMap ? "Mapping…" : "Create Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Components Modal ── */}
      {activeProjectForComponents && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Components: {activeProjectForComponents.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Manage functional components / sub-modules for bug categorisation.
                </p>
              </div>
              <button type="button" onClick={() => setActiveProjectForComponents(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Add component form */}
            {(canDevelop || isSuperAdmin) && (
              <form onSubmit={handleAddComponent} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Add New Component</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Component Name (e.g. Authentication, Checkout)"
                    value={newComponentName}
                    onChange={(e) => setNewComponentName(e.target.value)}
                    required
                    className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={newComponentDesc}
                    onChange={(e) => setNewComponentDesc(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingComponent || !newComponentName.trim()}
                    className="px-3.5 py-1 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                  >
                    {addingComponent ? "Adding…" : "Add Component"}
                  </button>
                </div>
              </form>
            )}

            {/* Component list */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loadingComponents ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading components…</div>
              ) : components.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No components created yet.</div>
              ) : (
                components.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{comp.name}</div>
                      {comp.description && (
                        <div className="text-[11px] text-slate-400">{comp.description}</div>
                      )}
                    </div>

                    {(canDevelop || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(comp.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveProjectForComponents(null)}
                className="px-4 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
