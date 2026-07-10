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

      // Filter WFH types - only include base WFH types (Morning, Afternoon)
      const wfh = all.filter((lt: LeaveType) =>
        lt.name && lt.name.toLowerCase().includes('work from home')
      );

      // Filter Leave types - exclude WFH and Half-Day variants to avoid duplication
      // Keep: Sick Leave, Casual Leave, Half Day variants
      const leaves = all.filter((lt: LeaveType) => {
        const name = lt.name?.toLowerCase() || '';
        return !name.includes('work from home');
      });

      setLeaveTypes(leaves);
      setWfhTypes(wfh);

      console.log('Leave Types:', leaves.map((l: LeaveType) => l.name));
      console.log('WFH Types:', wfh.map((l: LeaveType) => l.name));
    } catch (err) {
      console.error("Failed to load leave types", err);
      setError("Failed to load leave types");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.user_id) {
        throw new Error("Employee ID is required");
      }
      if (!formData.start_date || !formData.end_date) {
        throw new Error("Start and end dates are required");
      }
      if (!formData.reason) {
        throw new Error("Reason is required");
      }

      if (type === "leave" && !formData.leave_type_id) {
        throw new Error("Leave type is required");
      }
      if (type === "wfh" && !formData.wfh_type_id) {
        throw new Error("WFH type is required");
      }

      const endpoint = type === "leave" ? "/admin/leaves" : "/admin/wfh";
      const payload = type === "leave"
        ? {
            user_id: parseInt(String(formData.user_id)),
            leave_type_id: parseInt(formData.leave_type_id),
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason,
          }
        : {
            user_id: parseInt(String(formData.user_id)),
            wfh_type_id: parseInt(formData.wfh_type_id),
            start_date: formData.start_date,
            end_date: formData.end_date,
            reason: formData.reason,
          };

      console.log(`Creating ${type}:`, payload);
      console.log(`Endpoint: ${endpoint}`);

      try {
        const response = await api.post(endpoint, payload);
        console.log(`${type} created successfully:`, response.data);
      } catch (apiErr: any) {
        console.error(`Backend error details:`, {
          status: apiErr.response?.status,
          statusText: apiErr.response?.statusText,
          data: apiErr.response?.data,
          message: apiErr.message,
        });
        throw apiErr;
      }

      // Reset form
      setFormData({
        user_id: selectedEmployeeId || "",
        leave_type_id: "",
        wfh_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
      });

      // Call success callback and close
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create leave/WFH";
      console.error(`Failed to create ${type}:`, err);
      setError(errorMessage);
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

            {/* Leave/WFH Type - Unified dropdown with all options */}
            <div>
              <label className="text-sm font-medium text-white">Type</label>
              <select
                name={type === "leave" ? "leave_type_id" : "wfh_type_id"}
                value={type === "leave" ? formData.leave_type_id : formData.wfh_type_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-slate-900 text-white outline-none focus:ring-2 focus:ring-amber-400 text-sm"
              >
                <option value="">Select {type === "leave" ? "leave type" : "WFH type"}</option>
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

            {/* Info note */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <span className="font-semibold">Note:</span> Admin-created leave is marked as non-paid (LOP) and automatically approved.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
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
