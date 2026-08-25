"use client";

import { useState, useEffect } from "react";
import { X, Loader2, FolderPlus, AlertCircle, Calendar, Building2, User } from "lucide-react";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { Project, ProjectStatus, PROJECT_STATUSES, StoreProjectPayload } from "@/types/pm";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProject: Project) => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<StoreProjectPayload>({
    name: "",
    description: "",
    status: "Planning",
    project_type: "Client",
    category: "",
    team_id: null,
    project_coordinator_id: null,
    start_date: new Date().toISOString().split("T")[0],
    expected_end_date: "",
    allotted_effort: null,
    budget: null,
    blockers: "",
    live_notes: "",
    fixing_notes: "",
  });

  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [coordinators, setCoordinators] = useState<
    { id: number; first_name: string; last_name: string; employee_code?: string; department?: string }[]
  >([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

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
            // Filter or flag candidates from the "Project Coordinators" department
            const mapped = rawEmps.map((e: any) => ({
              id: e.id,
              first_name: e.first_name,
              last_name: e.last_name,
              employee_code: e.employee_code,
              department: e.team?.name || "General",
            }));
            setCoordinators(mapped);
          }
        }
      } catch (err) {
        console.warn("Failed to load teams/coordinators metadata", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof StoreProjectPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setSubmitting(true);
    try {
      // Clean empty string dates and nulls
      const payload: StoreProjectPayload = {
        ...formData,
        name: formData.name.trim(),
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

      const res = await pmApi.createProject(payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create project. Please check the form fields.";
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
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Project</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Initialize a new project deliverable and assign coordinator
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
          {/* Project Name (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Website Redesign & Portal Upgrade"
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
              placeholder="Summary of project goals and specifications..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* 2-Column: Status & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
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
                placeholder="e.g. Web App, Mobile, QA"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 2-Column: Owning Department & Project Coordinator */}
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
                <option value="">Select Coordinator (Optional)</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.department})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Validated server-side against &quot;Project Coordinators&quot; department.
              </span>
            </div>
          </div>

          {/* 2-Column: Start Date & Target End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
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
                placeholder="e.g. 120"
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
                placeholder="e.g. 50000"
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
              placeholder="Any current impediments or client dependencies..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
                  <span>Creating Project…</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
