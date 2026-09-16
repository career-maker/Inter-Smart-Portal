"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

interface LeaveType {
  id: number;
  name: string;
  is_paid?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedEmployeeId?: number;
  initialType?: "leave" | "wfh";
}

export function AdminLeaveWfhModal({
  isOpen,
  onClose,
  onSuccess,
  selectedEmployeeId,
  initialType = "leave",
}: Props) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [wfhTypes, setWfhTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"leave" | "wfh">(initialType);

  const [formData, setFormData] = useState({
    user_id: selectedEmployeeId || "",
    leave_type_id: "",
    wfh_type_id: "",
    duration_type: "full",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialType) {
        setType(initialType);
      }
      fetchLeaveTypes();
      if (!selectedEmployeeId) {
        fetchEmployees();
      }
    }
  }, [isOpen, initialType, selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId) {
      setFormData(prev => ({ ...prev, user_id: selectedEmployeeId }));
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await api.get("/employees?per_page=all").catch(async () => {
        return api.get("/employees?per_page=300");
      });
      const list = res.data?.data || res.data || [];
      list.sort((a: any, b: any) => (a.first_name || "").localeCompare(b.first_name || ""));
      setEmployees(list);
    } catch (err) {
      console.error("Failed to load employees", err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get("/leave-types");
      const all = res.data?.data || res.data || [];

      // Filter WFH types - includes any WFH or Work From Home keyword
      const wfh = all.filter((lt: LeaveType) => {
        const name = (lt.name || "").toLowerCase();
        return name.includes("work from home") || name.includes("wfh");
      });

      // Filter Leave types - exclude WFH to avoid duplication
      const leaves = all.filter((lt: LeaveType) => {
        const name = (lt.name || "").toLowerCase();
        return !name.includes("work from home") && !name.includes("wfh");
      });

      setLeaveTypes(leaves);
      setWfhTypes(wfh.length > 0 ? wfh : all);
    } catch (err) {
      console.error("Failed to load leave types", err);
      setError("Failed to load leave types");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "start_date" && (!prev.end_date || prev.end_date < value)) {
        next.end_date = value;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.user_id) {
        throw new Error("Please select an employee");
      }
      if (!formData.start_date || !formData.end_date) {
        throw new Error("Start and end dates are required");
      }
      if (!formData.reason.trim()) {
        throw new Error("Reason is required");
      }

      if (type === "leave" && !formData.leave_type_id) {
        throw new Error("Please select a leave type");
      }
      let chosenWfhId = formData.wfh_type_id;
      if (type === "wfh" && !chosenWfhId) {
        chosenWfhId = wfhTypes[0]?.id ? String(wfhTypes[0].id) : (leaveTypes[0]?.id ? String(leaveTypes[0].id) : "");
        if (!chosenWfhId) {
          throw new Error("Please select a WFH type");
        }
      }

      const endpoint = type === "leave" ? "/admin/mark-leave" : "/admin/mark-wfh";
      const payload = type === "leave"
        ? {
            employee_id: parseInt(String(formData.user_id)),
            leave_type_id: parseInt(formData.leave_type_id),
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason.trim(),
          }
        : {
            employee_id: parseInt(String(formData.user_id)),
            wfh_type_id: parseInt(chosenWfhId),
            duration_type: formData.duration_type || "full",
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason.trim(),
          };

      await api.post(endpoint, payload);

      // Reset form
      setFormData({
        user_id: selectedEmployeeId || "",
        leave_type_id: "",
        wfh_type_id: "",
        duration_type: "full",
        start_date: "",
        end_date: "",
        reason: "",
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create request";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Direct Add {type === "leave" ? "Leave" : "Work From Home"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Directly create and approve a {type === "leave" ? "leave" : "work-from-home"} record for an employee without pending approval steps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Type Selector (Pill Style) */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType("leave")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === "leave"
                  ? "bg-white dark:bg-slate-700 text-[#56348f] dark:text-purple-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🌴 Leave
            </button>
            <button
              type="button"
              onClick={() => setType("wfh")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === "wfh"
                  ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🏠 Work From Home
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Picker */}
            {!selectedEmployeeId && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleInputChange}
                  required
                  disabled={isLoadingEmployees}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
                >
                  <option value="">{isLoadingEmployees ? "Loading employee directory..." : "Select Employee..."}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name || ""} {emp.employee_code ? `(${emp.employee_code})` : ""} {emp.designation ? `• ${emp.designation}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Leave or WFH Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {type === "leave" ? "Leave Type" : "WFH Type"} <span className="text-red-500">*</span>
                </label>
                <select
                  name={type === "leave" ? "leave_type_id" : "wfh_type_id"}
                  value={type === "leave" ? formData.leave_type_id : formData.wfh_type_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
                >
                  <option value="">Select {type === "leave" ? "leave type" : "WFH type"}...</option>
                  {(type === "leave" ? leaveTypes : wfhTypes).map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>

              {type === "wfh" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Duration
                  </label>
                  <select
                    name="duration_type"
                    value={formData.duration_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
                  >
                    <option value="full">Full Day</option>
                    <option value="first_half">First Half</option>
                    <option value="second_half">Second Half</option>
                  </select>
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  min={formData.start_date}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason / Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
                rows={2}
                placeholder="Enter reason or note for this entry..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
              />
            </div>

            {/* Direct Admin Banner */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl">
              <p className="text-purple-800 dark:text-purple-300 text-[11px] leading-relaxed">
                <span className="font-bold">⚡ Direct Entry:</span> This record will be created in <span className="font-semibold text-emerald-600 dark:text-emerald-400">Approved</span> status immediately on behalf of the selected employee.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#56348f] hover:bg-[#452875] text-white rounded-xl text-xs font-bold shadow-xs px-5 cursor-pointer"
              >
                {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create & Approve
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminLeaveWfhModal;
