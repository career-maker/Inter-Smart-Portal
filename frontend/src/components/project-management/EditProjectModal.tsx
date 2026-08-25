"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Edit3, AlertCircle, Link2 } from "lucide-react";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { Project, ProjectStatus, PROJECT_STATUSES, UpdateProjectPayload } from "@/types/pm";

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Project) => void;
}

export function EditProjectModal({ project, isOpen, onClose, onSuccess }: EditProjectModalProps) {
  const [formData, setFormData] = useState<UpdateProjectPayload>({
    name: project.name,
    description: project.description || "",
    status: project.status,
    project_type: project.project_type || "",
    category: project.category || "",
    team_id: project.team_id || null,
    project_coordinator_id: project.project_coordinator_id || null,
    start_date: project.start_date || "",
    expected_end_date: project.expected_end_date || "",
    allotted_effort: project.allotted_effort || null,
    budget: project.budget || null,
    blockers: project.blockers || "",
    live_notes: project.live_notes || "",
    fixing_notes: project.fixing_notes || "",
  });

  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [coordinators, setCoordinators] = useState<
    { id: number; first_name: string; last_name: string; department?: string }[]
  >([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      project_type: project.project_type || "",
      category: project.category || "",
      team_id: project.team_id || null,
      project_coordinator_id: project.project_coordinator_id || null,
      start_date: project.start_date ? project.start_date.split("T")[0] : "",
      expected_end_date: project.expected_end_date ? project.expected_end_date.split("T")[0] : "",
      allotted_effort: project.allotted_effort || null,
      budget: project.budget || null,
      blockers: project.blockers || "",
      live_notes: project.live_notes || "",
      fixing_notes: project.fixing_notes || "",
    });

    const fetchMeta = async () => {
      setLoadingMeta(true);
      try {
        const [teamsRes, empsRes] = await Promise.allSettled([
          api.get("/teams"),
          api.get("/employees?per_page=200"),
        ]);

        if (teamsRes.status === "fulfilled") {
          const tData = teamsRes.value.data?.data || teamsRes.value.data || [];
          setTeams(Array.isArray(tData) ? tData : []);
        }

        if (empsRes.status === "fulfilled") {
          const rawEmps = empsRes.value.data?.data?.data || empsRes.value.data?.data || [];
          if (Array.isArray(rawEmps)) {
            const mapped = rawEmps.map((e: any) => ({
              id: e.id,
              first_name: e.first_name,
              last_name: e.last_name,
              department: e.team?.name || "General",
            }));
            setCoordinators(mapped);
          }
        }
      } catch (err) {
        console.warn("Failed to load metadata", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleChange = (field: keyof UpdateProjectPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      const payload: UpdateProjectPayload = {
        ...formData,
        name: formData.name?.trim() || project.name,
        description: formData.description?.trim() || null,
        category: formData.category?.trim() || null,
        project_type: formData.project_type?.trim() || null,
        team_id: formData.team_id ? Number(formData.team_id) : null,
        project_coordinator_id: formData.project_coordinator_id
          ? Number(formData.project_coordinator_id)
          : null,
        start_date: formData.start_date || null,
        expected_end_date: formData.expected_end_date || null,
        allotted_effort: formData.allotted_effort ? Number(formData.allotted_effort) : null,
        budget: formData.budget ? Number(formData.budget) : null,
        blockers: formData.blockers?.trim() || null,
        live_notes: formData.live_notes?.trim() || null,
        fixing_notes: formData.fixing_notes?.trim() || null,
      };

      const res = await pmApi.updateProject(project.id, payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update project. Please check permissions and input fields.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Project</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update planning details, coordinator, status, and notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {project.hubstaff_project_id && (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <Link2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Linked to Hubstaff project ID: <strong>{project.hubstaff_project_id}</strong></span>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Scope
            </label>
            <textarea
              rows={2}
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* 2-Column: Status & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Status
              </label>
              <select
                value={formData.status || "Planning"}
                onChange={(e) => handleChange("status", e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {PROJECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category || ""}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 2-Column: Owning Department & Coordinator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Owning Department / Team
              </label>
              <select
                value={formData.team_id || ""}
                onChange={(e) => handleChange("team_id", e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Cross-Team / Unassigned</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Coordinator
              </label>
              <select
                value={formData.project_coordinator_id || ""}
                onChange={(e) =>
                  handleChange(
                    "project_coordinator_id",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2-Column: Start Date & Target End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected End Date
              </label>
              <input
                type="date"
                value={formData.expected_end_date || ""}
                onChange={(e) => handleChange("expected_end_date", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Effort & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allotted Effort (Hours / Days)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.allotted_effort ?? ""}
                onChange={(e) =>
                  handleChange("allotted_effort", e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Budget (INR)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.budget ?? ""}
                onChange={(e) =>
                  handleChange("budget", e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Active Blockers / Risks
            </label>
            <input
              type="text"
              value={formData.blockers || ""}
              onChange={(e) => handleChange("blockers", e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Live Deployment Notes
              </label>
              <textarea
                rows={2}
                value={formData.live_notes || ""}
                onChange={(e) => handleChange("live_notes", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fixing / Patch Notes
              </label>
              <textarea
                rows={2}
                value={formData.fixing_notes || ""}
                onChange={(e) => handleChange("fixing_notes", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
