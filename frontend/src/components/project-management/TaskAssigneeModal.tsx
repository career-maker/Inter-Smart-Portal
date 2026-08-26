"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Loader2, UserPlus, Trash2, AlertCircle, Users, Check } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { ProjectTask, ProjectTaskAssigneeSummary } from "@/types/pm";

interface TaskAssigneeModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProjectTask;
  onSuccess: (updatedTask: ProjectTask) => void;
}

export function TaskAssigneeModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: TaskAssigneeModalProps) {
  const { user } = useAuthStore();
  const roleLower = (user?.role || "").toLowerCase();
  const isSuperAdmin = roleLower.includes("super admin") || roleLower === "admin";
  const isTeamLead = roleLower.includes("team lead") || roleLower.includes("lead") || !isSuperAdmin;

  const [employees, setEmployees] = useState<
    { id: number; first_name: string; last_name: string; employee_code?: string; team_id?: number | null; department?: string }[]
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [isPrimary, setIsPrimary] = useState(false);

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadEmployees = async () => {
      setLoadingEmployees(true);
      setError(null);
      try {
        const res = await (pmApi as any).getTeamMembers();
        if (res && res.members) {
          setEmployees(res.members);
        }
      } catch (err) {
        console.warn("Failed to load employees for assignee modal", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [isOpen]);

  const availableEmployees = employees;

  const existingAssigneeIds = (task.assignees || []).map((a) => a.id);

  const handleAddAssignee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    setError(null);

    try {
      await pmApi.addTaskAssignee(task.id, {
        user_id: Number(selectedUserId),
        is_primary: isPrimary,
      });

      // Reload updated task
      const res = await pmApi.getTask(task.id);
      onSuccess(res.data);
      setSelectedUserId("");
      setIsPrimary(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add task assignee.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignee = async (userId: number) => {
    setRemovingId(userId);
    setError(null);

    try {
      await pmApi.removeTaskAssignee(task.id, userId);
      const res = await pmApi.getTask(task.id);
      onSuccess(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to remove assignee.";
      setError(msg);
    } finally {
      setRemovingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Task Assignees</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTeamLead
                  ? "Assign members of your HR team to this task"
                  : "Assign team members to collaborate on this deliverable"}
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

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Current Assignees List */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Current Assignees ({task.assignees?.length || 0})
            </h3>

            {!task.assignees || task.assignees.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                No assignees currently allocated to this task.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {task.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="p-3 flex items-center justify-between bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                        {assignee.first_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {assignee.first_name} {assignee.last_name}
                          </span>
                          {assignee.pivot?.is_primary && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                              Primary Lead
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(assignee.id)}
                      disabled={removingId === assignee.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                      title="Remove Assignee"
                    >
                      {removingId === assignee.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignee Form */}
          <form onSubmit={handleAddAssignee} className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Add New Assignee
            </h3>

            <div className="space-y-3">
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
                disabled={loadingEmployees || submitting}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Employee to Assign</option>
                {availableEmployees
                  .filter((emp) => !existingAssigneeIds.includes(emp.id))
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ""} — {emp.department}
                    </option>
                  ))}
              </select>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Set as Primary Assignee</span>
              </label>

              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding Assignee…</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Add Assignee</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
