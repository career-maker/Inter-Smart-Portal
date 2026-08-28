"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Clock, Calendar, TrendingUp, FileText, Bug, Link2, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import {
  ProjectTask,
  TaskStatus,
  UpdateProjectTaskPayload,
  TASK_STATUSES,
} from "@/types/pm";

interface TaskExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProjectTask;
  onSuccess: (updatedTask: ProjectTask) => void;
  onDelete?: (taskId: number) => void;
}

export function TaskExecutionModal({
  isOpen,
  onClose,
  task,
  onSuccess,
  onDelete,
}: TaskExecutionModalProps) {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const userDesignationStr = ((user as any)?.designation || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin" || userRoleStr === "admin";
  const isTeamLead =
    userRoleStr === "team lead" ||
    userRoleStr.includes("lead") ||
    userRoleStr.includes("manager") ||
    userDesignationStr.includes("lead") ||
    userDesignationStr.includes("manager") ||
    Boolean((user as any)?.is_lead);
  const canManage = isSuperAdmin || isTeamLead;

  const [hasBugTrackerAddon, setHasBugTrackerAddon] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<UpdateProjectTaskPayload>({
    status: task.status,
    actual_start_date: task.actual_start_date || "",
    actual_completion_date: task.actual_completion_date || "",
    days_taken: task.days_taken ?? null,
    time_taken: task.time_taken ?? null,
    deviation_reason: task.deviation_reason || "",
    current_updates: task.current_updates || "",
    activity_percentage: task.activity_percentage ?? null,
    html_bugs: task.html_bugs ?? 0,
    functional_bugs: task.functional_bugs ?? 0,
    total_bugs: task.total_bugs ?? 0,
    bug_tracker_link: task.bug_tracker_link || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check addon permissions
  useEffect(() => {
    if (!isOpen) return;
    const checkAddons = async () => {
      try {
        const res = await pmApi.getMyAddons();
        const active = res.is_super_admin || (res.active_addons && res.active_addons.includes("bug_tracker"));
        setHasBugTrackerAddon(active);
      } catch {
        // Fallback if API fails: enable for Super Admin, QA members, or existing bug tasks
        const isQa = userDesignationStr.includes("qa") || userRoleStr.includes("qa") || isSuperAdmin;
        setHasBugTrackerAddon(isQa || Boolean(task.total_bugs || task.html_bugs || task.functional_bugs || task.bug_tracker_link));
      }
    };
    checkAddons();
  }, [isOpen, isSuperAdmin, userDesignationStr, userRoleStr, task]);

  useEffect(() => {
    if (task) {
      setFormData({
        status: task.status,
        actual_start_date: task.actual_start_date || "",
        actual_completion_date: task.actual_completion_date || "",
        days_taken: task.days_taken ?? null,
        time_taken: task.time_taken ?? null,
        deviation_reason: task.deviation_reason || "",
        current_updates: task.current_updates || "",
        activity_percentage: task.activity_percentage ?? null,
        html_bugs: task.html_bugs ?? 0,
        functional_bugs: task.functional_bugs ?? 0,
        total_bugs: (Number(task.html_bugs || 0) + Number(task.functional_bugs || 0)),
        bug_tracker_link: task.bug_tracker_link || "",
      });
      setShowDeleteConfirm(false);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof UpdateProjectTaskPayload, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-calculate total bugs
      if (field === "html_bugs" || field === "functional_bugs") {
        const html = Number(field === "html_bugs" ? value : prev.html_bugs) || 0;
        const func = Number(field === "functional_bugs" ? value : prev.functional_bugs) || 0;
        next.total_bugs = html + func;
      }

      // Auto-fill actual_completion_date with today when status transitions to Completed
      if (field === "status" && value === "Completed" && !prev.actual_completion_date) {
        next.actual_completion_date = new Date().toISOString().split("T")[0];
      }
      return next;
    });
  };

  // Compute live estimated deviation
  const allotted = task.allotted_days ?? 0;
  const taken = formData.days_taken ?? 0;
  const deviation = taken > 0 && allotted > 0 ? Number((taken - allotted).toFixed(2)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: UpdateProjectTaskPayload = {
        status: formData.status,
        actual_start_date: formData.actual_start_date || null,
        actual_completion_date: formData.actual_completion_date || null,
        days_taken: formData.days_taken !== null && formData.days_taken !== undefined && formData.days_taken !== ("" as any) ? Number(formData.days_taken) : null,
        time_taken: formData.time_taken !== null && formData.time_taken !== undefined && formData.time_taken !== ("" as any) ? Number(formData.time_taken) : null,
        deviation_reason: formData.deviation_reason || null,
        current_updates: formData.current_updates || null,
        activity_percentage: formData.activity_percentage !== null && formData.activity_percentage !== undefined && formData.activity_percentage !== ("" as any) ? Number(formData.activity_percentage) : null,
        html_bugs: formData.html_bugs !== null && formData.html_bugs !== undefined && formData.html_bugs !== ("" as any) ? Number(formData.html_bugs) : 0,
        functional_bugs: formData.functional_bugs !== null && formData.functional_bugs !== undefined && formData.functional_bugs !== ("" as any) ? Number(formData.functional_bugs) : 0,
        total_bugs: (Number(formData.html_bugs || 0) + Number(formData.functional_bugs || 0)),
        bug_tracker_link: formData.bug_tracker_link ? String(formData.bug_tracker_link).trim() : null,
      };

      const res = await pmApi.updateTask(task.id, payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update task execution state.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!canManage) return;
    setDeleting(true);
    setError(null);
    try {
      await pmApi.deleteTask(task.id);
      if (onDelete) {
        onDelete(task.id);
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete task.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const calculatedTotalBugs = (Number(formData.html_bugs || 0) + Number(formData.functional_bugs || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Task & Execution</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log real-time task progress, status transitions, QA bugs, and deviation tracking
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

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status & Progress % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {TASK_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Activity Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.activity_percentage ?? ""}
                onChange={(e) =>
                  handleChange("activity_percentage", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 85"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Current Updates Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Updates & Work Notes
            </label>
            <textarea
              rows={2}
              value={formData.current_updates || ""}
              onChange={(e) => handleChange("current_updates", e.target.value)}
              placeholder="Provide a summary of the latest progress, testing output, or milestone updates..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Actual Start & Completion Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Actual Start Date
              </label>
              <input
                type="date"
                value={formData.actual_start_date || ""}
                onChange={(e) => handleChange("actual_start_date", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Actual Completion Date
              </label>
              <input
                type="date"
                value={formData.actual_completion_date || ""}
                onChange={(e) => handleChange("actual_completion_date", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Days Taken & Time Taken */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Days Taken
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={formData.days_taken ?? ""}
                onChange={(e) =>
                  handleChange("days_taken", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 3.0"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Time Taken (Hours / Minutes)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.time_taken ?? ""}
                onChange={(e) =>
                  handleChange("time_taken", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 24.5"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* ── QA Bug Tracking Section (Add-on Feature) ── */}
          {hasBugTrackerAddon && (
            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                  <Bug className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>QA Bug Tracker Metrics</span>
                </div>
                <span className="text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-700">
                  Add-on Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    HTML Bug Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={!canManage && !hasBugTrackerAddon}
                    value={formData.html_bugs ?? ""}
                    onChange={(e) =>
                      handleChange("html_bugs", e.target.value ? Number(e.target.value) : 0)
                    }
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Functional Bug Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={!canManage && !hasBugTrackerAddon}
                    value={formData.functional_bugs ?? ""}
                    onChange={(e) =>
                      handleChange("functional_bugs", e.target.value ? Number(e.target.value) : 0)
                    }
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Bugs (Auto)
                  </label>
                  <div className="w-full px-3 py-1.5 rounded-xl bg-purple-100/70 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-bold text-sm flex items-center justify-between">
                    <span>{calculatedTotalBugs}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">Calculated</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bug Tracker Link (URL)
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    disabled={!canManage && !hasBugTrackerAddon}
                    value={formData.bug_tracker_link || ""}
                    onChange={(e) => handleChange("bug_tracker_link", e.target.value)}
                    placeholder="https://tracker.example.com/tickets/123"
                    className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Deviation Summary Preview */}
          {deviation !== null && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                deviation > 0
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Estimated Schedule Deviation:</span>
              </div>
              <span className="font-bold text-sm">
                {deviation > 0 ? `+${deviation} days (Delayed)` : `${deviation} days (On Time)`}
              </span>
            </div>
          )}

          {/* Deviation Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deviation Reason {formData.status === "Rejected" && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={formData.deviation_reason || ""}
              onChange={(e) => handleChange("deviation_reason", e.target.value)}
              placeholder="e.g. Additional client requirements or QA bug fixes"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              {canManage && (
                <>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2 p-1.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl">
                      <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold pl-1.5">
                        Confirm delete task?
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteTask}
                        disabled={deleting}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? "Deleting…" : "Yes, Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Task</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                style={{ backgroundColor: "#56348f", color: "#ffffff", fontFamily: '"Proxima Nova", sans-serif' }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin !text-white" />
                    <span className="!text-white">Saving Updates…</span>
                  </>
                ) : (
                  <span className="!text-white">Save Updates</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
