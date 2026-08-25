"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserPlus, AlertCircle, Search } from "lucide-react";
import api from "@/services/api";
import pmApi from "@/services/pm";
import { ProjectMember, ProjectRole, PROJECT_ROLES, AddProjectMemberPayload } from "@/types/pm";

interface AddProjectMemberModalProps {
  projectId: number;
  existingMemberUserIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: ProjectMember) => void;
}

export function AddProjectMemberModal({
  projectId,
  existingMemberUserIds,
  isOpen,
  onClose,
  onSuccess,
}: AddProjectMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [role, setRole] = useState<ProjectRole>("Member");
  const [employees, setEmployees] = useState<
    { id: number; first_name: string; last_name: string; employee_code?: string; department?: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await api.get("/employees?per_page=300");
        const raw = res.data?.data?.data || res.data?.data || [];
        if (Array.isArray(raw)) {
          const mapped = raw.map((e: any) => ({
            id: e.id,
            first_name: e.first_name,
            last_name: e.last_name,
            employee_code: e.employee_code,
            department: e.team?.name || "General",
          }));
          setEmployees(mapped);
        }
      } catch (err) {
        console.warn("Failed to load employees list", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredEmployees = employees
    .filter((e) => !existingMemberUserIds.includes(e.id))
    .filter((e) => {
      const q = search.toLowerCase();
      return (
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q))
      );
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Please select an employee to add.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: AddProjectMemberPayload = {
        user_id: selectedUserId,
        project_role: role,
      };

      const res = await pmApi.addProjectMember(projectId, payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add project member. Please check authorization.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Project Member</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grant team participant access to this project
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Search & Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>

            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, code or department..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              {loadingEmployees ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading employees…</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No matching employees found</div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedUserId === emp.id;
                  return (
                    <button
                      type="button"
                      key={emp.id}
                      onClick={() => setSelectedUserId(emp.id)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                          : "hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div>
                        <div>
                          {emp.first_name} {emp.last_name}
                          {emp.employee_code ? ` (${emp.employee_code})` : ""}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{emp.department}</span>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Project Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project Participation Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectRole)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {PROJECT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Member (standard participant), Lead (sub-lead), Reviewer (QA/Review), Observer (read-only).
            </span>
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
              disabled={submitting || !selectedUserId}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding…</span>
                </>
              ) : (
                <span>Add Member</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
