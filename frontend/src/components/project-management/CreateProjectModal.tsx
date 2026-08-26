"use client";

import { useState, useEffect } from "react";
import { X, Loader2, FolderPlus, AlertCircle, Calendar, Building2, User, Link2, Unlink } from "lucide-react";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { Project, ProjectStatus, PROJECT_STATUSES, StoreProjectPayload, HubstaffProject } from "@/types/pm";
import { SearchableCoordinatorSelect } from "./SearchableCoordinatorSelect";

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
    confirmed_effort: null,
    expected_effort: null,
    committed_effort: null,
    hubstaff_project_id: null,
    budget: null,
    blockers: "",
    live_notes: "",
    fixing_notes: "",
  });

  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [coordinators, setCoordinators] = useState<
    { id: number; first_name: string; last_name: string; employee_code?: string; department?: string }[]
  >([]);
  const [hubstaffProjects, setHubstaffProjects] = useState<HubstaffProject[]>([]);
  const [loadingHubstaff, setLoadingHubstaff] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMeta = async () => {
      setLoadingMeta(true);
      setLoadingHubstaff(true);
      try {
        const [teamsRes, empsRes, hsRes] = await Promise.allSettled([
          api.get("/teams"),
          api.get("/employees?per_page=all"),
          pmApi.getHubstaffProjects(),
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
              employee_code: e.employee_code,
              department: e.team?.name || "General",
            }));
            setCoordinators(mapped);
          }
        }

        if (hsRes.status === "fulfilled") {
          const hsData = hsRes.value;
          if (hsData?.projects && Array.isArray(hsData.projects)) {
            setHubstaffProjects(hsData.projects);
          }
        }
      } catch (err) {
        console.warn("Failed to load metadata/Hubstaff projects", err);
      } finally {
        setLoadingMeta(false);
        setLoadingHubstaff(false);
      }
    };

    fetchMeta();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof StoreProjectPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHubstaffSelect = (hubstaffId: string) => {
    if (!hubstaffId) {
      handleChange("hubstaff_project_id", null);
      return;
    }

    const selected = hubstaffProjects.find((p) => p.id === hubstaffId);
    if (selected) {
      handleChange("hubstaff_project_id", selected.id);
      handleChange("name", selected.name);
    }
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
        confirmed_effort: formData.confirmed_effort ? Number(formData.confirmed_effort) : null,
        expected_effort: formData.expected_effort ? Number(formData.expected_effort) : null,
        committed_effort: formData.committed_effort ? Number(formData.committed_effort) : null,
        hubstaff_project_id: formData.hubstaff_project_id || null,
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
          {/* Optional Hubstaff Linking */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Link2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Link with Hubstaff Project (Optional)</span>
              </label>
              <div className="flex items-center gap-2">
                {formData.hubstaff_project_id && (
                  <button
                    type="button"
                    onClick={() => handleChange("hubstaff_project_id", null)}
                    className="text-[11px] text-slate-400 hover:text-rose-500 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Unlink</span>
                  </button>
                )}
              </div>
            </div>

            {loadingHubstaff ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Connecting to Hubstaff API & loading projects…</span>
              </div>
            ) : hubstaffProjects.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={formData.hubstaff_project_id || ""}
                  onChange={(e) => handleHubstaffSelect(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Select Hubstaff Project to Autofill --</option>
                  {hubstaffProjects.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={p.is_already_linked && p.id !== formData.hubstaff_project_id}
                    >
                      {p.name} {p.is_already_linked ? "(Already Linked)" : ""}
                    </option>
                  ))}
                </select>
                {formData.hubstaff_project_id && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    ✓ Authoritative Hubstaff project linked (ID: {formData.hubstaff_project_id})
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-400 bg-slate-900/30 p-2.5 rounded-lg border border-slate-800">
                <span>Hubstaff projects ready. Select manual entry or refresh to load Hubstaff list.</span>
                <button
                  type="button"
                  onClick={async () => {
                    setLoadingHubstaff(true);
                    try {
                      const hsData = await pmApi.getHubstaffProjects();
                      if (hsData?.projects) setHubstaffProjects(hsData.projects);
                    } catch (e) {
                      console.warn(e);
                    } finally {
                      setLoadingHubstaff(false);
                    }
                  }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
                >
                  Reload Hubstaff
                </button>
              </div>
            )}
          </div>

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
                value={formData.status}
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
                placeholder="e.g. Web Development, Mobile App, SEO"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 2-Column: Owning Team & Project Coordinator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Owning HR Team
              </label>
              <select
                value={formData.team_id || ""}
                onChange={(e) => handleChange("team_id", e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- No Team (Cross-functional) --</option>
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
              <SearchableCoordinatorSelect
                value={formData.project_coordinator_id}
                onChange={(val) => handleChange("project_coordinator_id", val)}
                coordinators={coordinators}
                placeholder="-- Unassigned Coordinator --"
              />
            </div>
          </div>

          {/* 2-Column: Dates */}
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

          {/* 2-Column: Effort & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allotted Effort (Days/Hours)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.allotted_effort ?? ""}
                onChange={(e) =>
                  handleChange("allotted_effort", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder="e.g. 45"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Budget (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.budget ?? ""}
                onChange={(e) =>
                  handleChange("budget", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder="e.g. 50000"
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
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating…</span>
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
