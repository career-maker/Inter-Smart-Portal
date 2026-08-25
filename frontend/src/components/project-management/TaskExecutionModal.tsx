"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Clock, Calendar, TrendingUp, FileText } from "lucide-react";
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
}

export function TaskExecutionModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: TaskExecutionModalProps) {
  const [formData, setFormData] = useState<UpdateProjectTaskPayload>({
    status: task.status,
    actual_start_date: task.actual_start_date || "",
    actual_completion_date: task.actual_completion_date || "",
    days_taken: task.days_taken ?? null,
    time_taken: task.time_taken ?? null,
    deviation_reason: task.deviation_reason || "",
    current_updates: task.current_updates || "",
    activity_percentage: task.activity_percentage ?? null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof UpdateProjectTaskPayload, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Update Task Execution</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log real-time task progress, status transitions, and deviation tracking
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
                Current Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                Progress Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.activity_percentage ?? ""}
                onChange={(e) =>
                  handleChange(
                    "activity_percentage",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="e.g. 75"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Current Live Updates / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Updates & Notes
            </label>
            <textarea
              rows={3}
              value={formData.current_updates || ""}
              onChange={(e) => handleChange("current_updates", e.target.value)}
              placeholder="What was completed today? Any blockers or technical progress..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

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
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Updates…</span>
                </>
              ) : (
                <span>Save Execution Updates</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
