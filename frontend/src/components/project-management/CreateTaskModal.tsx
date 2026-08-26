"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Plus, AlertCircle, Sparkles, FolderKanban, Users, ShieldCheck, Calendar, Clock, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { SearchableProjectSelect } from "@/components/project-management/SearchableProjectSelect";
import {
  Project,
  ProjectTask,
  ProjectTaskCatalog,
  StoreProjectTaskPayload,
  TaskStatus,
  TaskPriority,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/types/pm";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTask: ProjectTask) => void;
  defaultProjectId?: number;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
}: CreateTaskModalProps) {
  const { user } = useAuthStore();

  const [projectId, setProjectId] = useState<number | "">(defaultProjectId || "");
  const [formData, setFormData] = useState<StoreProjectTaskPayload>({
    title: "",
    catalog_task_id: null,
    description: "",
    status: "Yet to Start",
    priority: "Medium",
    start_date: new Date().toISOString().split("T")[0],
    due_date: "",
    include_saturday: false,
    include_sunday: false,
    allotted_days: null,
    sprint: "",
    sprint_link: "",
    current_updates: "",
    assignee_ids: [],
    coordinator_id: null,
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [catalogs, setCatalogs] = useState<ProjectTaskCatalog[]>([]);
  const [employees, setEmployees] = useState<
    { id: number; first_name: string; last_name: string; employee_code?: string; team_id?: number | null; department?: string }[]
  >([]);
  const [coordinators, setCoordinators] = useState<
    { id: number; first_name: string; last_name: string; department?: string }[]
  >([]);

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load auxiliary data when opened
  useEffect(() => {
    if (!isOpen) return;

    const loadFormData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const [projRes, catRes, empRes, teamsRes] = await Promise.allSettled([
          pmApi.getProjects({ per_page: -1 } as any),
          pmApi.getTaskCatalog({ is_active: true, all: true }),
          api.get("/employees?per_page=all"),
          api.get("/teams"),
        ]);

        if (projRes.status === "fulfilled") {
          setProjects(projRes.value.data || []);
        }

        if (catRes.status === "fulfilled") {
          const raw = catRes.value;
          const catList = Array.isArray(raw) ? raw : (raw as any)?.data || [];
          setCatalogs(Array.isArray(catList) ? catList : []);
        }

        let teamsList: any[] = [];
        if (teamsRes.status === "fulfilled") {
          teamsList = teamsRes.value.data?.data || teamsRes.value.data || [];
        }

        if (empRes.status === "fulfilled") {
          const raw = empRes.value.data?.data?.data || empRes.value.data?.data || [];
          if (Array.isArray(raw)) {
            const mapped = raw.map((e: any) => ({
              id: e.id,
              first_name: e.first_name,
              last_name: e.last_name,
              employee_code: e.employee_code,
              team_id: e.team_id || e.team?.id,
              department: e.team?.name || e.department || "General",
            }));
            setEmployees(mapped);
            setCoordinators(mapped);
          }
        }
      } catch (err) {
        console.warn("Failed to load task creation form data", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadFormData();
  }, [isOpen]);

  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    }
  }, [defaultProjectId]);

  const handleChange = (field: keyof StoreProjectTaskPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCatalogSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setFormData((prev) => ({ ...prev, catalog_task_id: null }));
      return;
    }

    const catId = Number(val);
    const selected = catalogs.find((c) => c.id === catId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        catalog_task_id: catId,
        title: prev.title.trim() === "" ? selected.name : prev.title,
        description: prev.description ? prev.description : (selected.description || ""),
      }));
    }
  };

  // Resolve current user's team ID robustly
  const roleLower = (user?.role || "").toLowerCase();
  const isSuperAdmin = roleLower.includes("super admin") || roleLower === "admin";
  const isTeamLead = roleLower.includes("team lead") || roleLower.includes("lead") || !isSuperAdmin;

  // Find user's assigned team ID across user.team_id, user.team.id, or team matching team_lead_id
  const resolvedTeamId = user?.team_id || (user as any)?.team?.id;
  const userDept = (user as any)?.department || (user as any)?.team?.name;

  // Filter assignees: Team Leads see their own team members; Super Admins see all
  const availableAssignees = useMemo(() => {
    if (isSuperAdmin) return employees;

    // Filter by team_id
    if (resolvedTeamId) {
      const byTeam = employees.filter((e) => e.team_id === resolvedTeamId || e.id === user?.id);
      if (byTeam.length > 0) return byTeam;
    }

    // Filter by department matching if team_id not explicit
    if (userDept) {
      const byDept = employees.filter(
        (e) => (e.department && e.department.toLowerCase() === userDept.toLowerCase()) || e.id === user?.id
      );
      if (byDept.length > 0) return byDept;
    }

    // Fallback: If no explicit team matched, return all employees rather than empty
    return employees;
  }, [employees, isSuperAdmin, resolvedTeamId, userDept, user?.id]);

  const toggleAssignee = (userId: number) => {
    setFormData((prev) => {
      const current = prev.assignee_ids || [];
      if (current.includes(userId)) {
        return { ...prev, assignee_ids: current.filter((id) => id !== userId) };
      } else {
        return { ...prev, assignee_ids: [...current, userId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a target project.");
      return;
    }
    if (!formData.title.trim()) {
      setError("Task title/name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: StoreProjectTaskPayload = {
        title: formData.title.trim(),
        catalog_task_id: formData.catalog_task_id || null,
        description: formData.description || null,
        status: formData.status || "Yet to Start",
        priority: formData.priority || "Medium",
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        include_saturday: formData.include_saturday,
        include_sunday: formData.include_sunday,
        allotted_days: formData.allotted_days ? Number(formData.allotted_days) : null,
        sprint: formData.sprint || null,
        sprint_link: formData.sprint_link || null,
        current_updates: formData.current_updates || null,
        assignee_ids: formData.assignee_ids,
        coordinator_id: formData.coordinator_id || null,
      };

      const res = await pmApi.createProjectTask(Number(projectId), payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create task. Please check authorization and input.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Project Task</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define a deliverable task with dual custom or predefined catalog templates
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Project Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Target Project <span className="text-rose-500">*</span></span>
              {projects.length > 0 && (
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {projects.length} available projects
                </span>
              )}
            </label>
            <SearchableProjectSelect
              projects={projects}
              value={projectId}
              onChange={(val) => setProjectId(val)}
              disabled={!!defaultProjectId}
              required
              placeholder="Search and select target project..."
            />
          </div>

          {/* Predefined Template Dropdown (Optional Helper) */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Optional: Select Predefined Task Template</span>
            </div>
            <select
              value={formData.catalog_task_id || ""}
              onChange={handleCatalogSelect}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Custom Task (No Catalog Template)</option>
              {catalogs.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  [{cat.category || "General"}] {cat.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-blue-700/80 dark:text-blue-400 block">
              Selecting a template pre-fills task specifications while leaving the title independently editable.
            </span>
          </div>

          {/* Task Title / Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Implement header responsive navigation"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Task scope, acceptance criteria, or technical details..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* 3-Column: Priority, Status & Allotted Days */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allotted Days
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={formData.allotted_days || ""}
                onChange={(e) =>
                  handleChange("allotted_days", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 2.5"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 2-Column: Start Date & Due Date */}
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
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date || ""}
                onChange={(e) => handleChange("due_date", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Assignees Selection (Team Lead restricted to own team) */}
          {(isSuperAdmin || isTeamLead) && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assignees ({formData.assignee_ids?.length || 0} selected)
                </label>
                <span className="text-[10px] text-slate-400">
                  {isTeamLead ? "Showing members of your HR team only" : "All organization employees"}
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {availableAssignees.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No assignees available</div>
                ) : (
                  availableAssignees.map((emp: any) => {
                    const isSelected = formData.assignee_ids?.includes(emp.id);
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => toggleAssignee(emp.id)}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                            : "hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div>
                          <span>
                            {emp.first_name} {emp.last_name}
                            {emp.employee_code ? ` (${emp.employee_code})` : ""}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{emp.department}</span>
                        </div>
                        {isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                        ) : (
                          <span className="text-[10px] text-slate-400">+ Add</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

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
              disabled={submitting || !formData.title.trim() || !projectId}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
