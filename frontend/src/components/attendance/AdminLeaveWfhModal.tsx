"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
}

export function AdminLeaveWfhModal({ isOpen, onClose, onSuccess, selectedEmployeeId }: Props) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [wfhTypes, setWfhTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"leave" | "wfh">("leave");

  const [formData, setFormData] = useState({
    user_id: selectedEmployeeId || "",
    leave_type_id: "",
    wfh_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    duration_type: "Full",
    auto_approve: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchLeaveTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedEmployeeId) {
      setFormData(prev => ({ ...prev, user_id: selectedEmployeeId }));
    }
  }, [selectedEmployeeId]);

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get("/leave-types");
      const all = res.data?.data || res.data || [];

      const wfh = all.filter((lt: LeaveType) =>
        lt.name && lt.name.toLowerCase().includes('work from home')
      );
      const leaves = all.filter((lt: LeaveType) =>
        !lt.name.toLowerCase().includes('work from home')
      );

      setLeaveTypes(leaves);
      setWfhTypes(wfh);
    } catch (err) {
      console.error("Failed to load leave types", err);
      setError("Failed to load leave types");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "auto_approve" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = type === "leave" ? "/api/admin/leaves" : "/api/admin/wfh";
      const payload = type === "leave"
        ? {
            user_id: formData.user_id,
            leave_type_id: formData.leave_type_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason,
            duration_type: formData.duration_type,
            auto_approve: formData.auto_approve,
          }
        : {
            user_id: formData.user_id,
            wfh_type_id: formData.wfh_type_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason,
            duration_type: formData.duration_type,
            auto_approve: formData.auto_approve,
          };

      await api.post(endpoint, payload);

      // Reset form
      setFormData({
        user_id: selectedEmployeeId || "",
        leave_type_id: "",
        wfh_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
        duration_type: "Full",
        auto_approve: true,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create leave/WFH");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Leave / WFH</DialogTitle>
          <DialogDescription>Create and manage leave or work-from-home requests for employees</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="leave"
                checked={type === "leave"}
                onChange={(e) => setType(e.target.value as "leave" | "wfh")}
                className="w-4 h-4"
              />
              <span>Leave</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="wfh"
                checked={type === "wfh"}
                onChange={(e) => setType(e.target.value as "leave" | "wfh")}
                className="w-4 h-4"
              />
              <span>Work From Home</span>
            </label>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID */}
            {!selectedEmployeeId && (
              <div>
                <label className="text-sm font-medium text-white">Employee ID</label>
                <input
                  type="number"
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  placeholder="Enter employee ID"
                />
              </div>
            )}

            {/* Leave/WFH Type */}
            <div>
              <label className="text-sm font-medium text-white">
                {type === "leave" ? "Leave Type" : "WFH Type"}
              </label>
              <select
                name={type === "leave" ? "leave_type_id" : "wfh_type_id"}
                value={type === "leave" ? formData.leave_type_id : formData.wfh_type_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
              >
                <option value="">Select {type === "leave" ? "leave" : "WFH"} type</option>
                {(type === "leave" ? leaveTypes : wfhTypes).map(lt => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>
            </div>

            {/* Duration Type */}
            <div>
              <label className="text-sm font-medium text-white">Duration</label>
              <select
                name="duration_type"
                value={formData.duration_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
              >
                <option value="Full">Full Day</option>
                <option value="Half-Morning">Half Day (Morning)</option>
                <option value="Half-Afternoon">Half Day (Afternoon)</option>
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium text-white">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                placeholder="Enter reason"
                rows={3}
              />
            </div>

            {/* Auto Approve */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="auto_approve"
                checked={formData.auto_approve}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm text-white">Auto-approve this request</span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
