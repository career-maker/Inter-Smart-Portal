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
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"leave" | "wfh">(initialType);

  const [formData, setFormData] = useState({
    user_id: selectedEmployeeId || "",
    leave_type_id: "",
    wfh_type: "Full",
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

      // Filter Leave types - exclude any accidental WFH entries from leave dropdown
      const leaves = all.filter((lt: LeaveType) => {
        const name = (lt.name || "").toLowerCase();
        return !name.includes("work from home") && !name.includes("wfh");
      });

      setLeaveTypes(leaves);
    } catch (err) {
      console.error("Failed to load leave types", err);
      setError("Failed to load leave types");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "wfh_type" && value !== "Full") {
      setFormData(prev => ({
        ...prev,
        wfh_type: value,
        end_date: prev.start_date,
      }));
      return;
    }

    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "start_date") {
        if (prev.wfh_type !== "Full" && type === "wfh") {
          next.end_date = value;
        } else if (!prev.end_date || prev.end_date < value) {
          next.end_date = value;
        }
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
      const isHalfDay = type === "wfh" && formData.wfh_type !== "Full";
      const endDate = isHalfDay ? formData.start_date : formData.end_date;

      if (!formData.start_date || (!isHalfDay && !formData.end_date)) {
        throw new Error("Dates are required");
      }
      if (!formData.reason.trim()) {
        throw new Error("Reason is required");
      }

      if (type === "leave" && !formData.leave_type_id) {
        throw new Error("Please select a leave type");
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
            duration_type: formData.wfh_type || "Full",
            start_date: formData.start_date,
            end_date: endDate,
            reason: formData.reason.trim(),
          };

      await api.post(endpoint, payload);

      // Reset form
      setFormData({
        user_id: selectedEmployeeId || "",
        leave_type_id: "",
        wfh_type: "Full",
        start_date: "",
        end_date: "",
        reason: "",
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        `Failed to mark ${type === "leave" ? "leave" : "WFH"}`;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Direct {type === "leave" ? "Add Leave" : "Add WFH"}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Super Admin
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setType("leave");
                setError(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === "leave"
                  ? "bg-[#56348f] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🏖️ Mark Leave
            </button>
            <button
              type="button"
              onClick={() => {
                setType("wfh");
                setError(null);
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === "wfh"
                  ? "bg-[#56348f] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🏠 Mark WFH
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Employee Selector (if not preselected) */}
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

            {/* Leave Type OR WFH Type */}
            {type === "leave" ? (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="leave_type_id"
                  value={formData.leave_type_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
                >
                  <option value="">Select leave type...</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  WFH Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="wfh_type"
                  value={formData.wfh_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
                >
                  <option value="Full">Full Day WFH</option>
                  <option value="Half-Morning">Half Day – Morning Session</option>
                  <option value="Half-Afternoon">Half Day – Afternoon Session</option>
                </select>
              </div>
            )}

            {/* Date Selection */}
            {type === "wfh" && formData.wfh_type !== "Full" ? (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, start_date: val, end_date: val }));
                  }}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Single day for half-day session</p>
              </div>
            ) : (
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
            )}

            {/* Reason */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
                rows={2}
                placeholder="Specify reason for marking this record..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 text-xs resize-none"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-2.5">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
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
