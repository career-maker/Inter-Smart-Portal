"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import {
  Calendar, Clock, CheckCircle, XCircle, Loader2, Home,
  X, Plus, Check, Users, User, Trash2
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import AdminLeaveWfhModal from "@/components/attendance/AdminLeaveWfhModal";
import { WfhRequestForm } from "@/components/wfh/WfhRequestForm";

/* ─── Helpers ───────────────────────────────────────────────────── */
function calcWfhDays(req: any): string {
  const isHalf = req?.duration_type === "Half-Morning" || req?.duration_type === "Half-Afternoon";
  if (isHalf) return "0.5";

  if (req?.days_count !== undefined && req?.days_count !== null) {
    const val = Number(req.days_count);
    if (!isNaN(val) && val > 0) {
      return val.toFixed(1);
    }
  }

  if (!req?.start_date) return "1.0";
  if (!req?.end_date || req.end_date === req.start_date) return "1.0";

  try {
    const s = new Date(req.start_date + "T00:00:00");
    const e = new Date(req.end_date + "T00:00:00");
    const diffMs = Math.abs(e.getTime() - s.getTime());
    if (isNaN(diffMs)) return "1.0";
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays).toFixed(1);
  } catch {
    return "1.0";
  }
}

function fmtDate(d: string) {
  try { return format(new Date(d + "T00:00:00"), "dd MMM yyyy"); }
  catch { return d; }
}

function DurationBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    Full:             { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", label: "Full Day" },
    "Half-Morning":   { cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",         label: "Morning Half" },
    "Half-Afternoon": { cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",   label: "Afternoon Half" },
  };
  const m = map[type] ?? { cls: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30", label: type };
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${m.cls}`}>
      {m.label}
    </span>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function WfhPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";
  const isApprover = isSuperAdmin || isTeamLead || Boolean((user as any)?.is_approver);

  // Views: "team" (Team / All requests), "my" (Personal requests), "apply" (Submit WFH)
  const [activeView, setActiveView]             = useState<"team" | "my" | "apply">(() => {
    if (isApprover) return "team";
    return "my";
  });

  const [requests, setRequests]                 = useState<any[]>([]);
  const [pagination, setPagination]             = useState<any>(null);
  const [currentPage, setCurrentPage]           = useState(1);
  const [isLoading, setIsLoading]               = useState(true);
  const [cancellingId, setCancellingId]         = useState<number | null>(null);
  const [actionLoading, setActionLoading]       = useState(false);
  const [successMessage, setSuccessMessage]     = useState<string | null>(null);
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);

  // Reject dialog state
  const [rejectDialogId, setRejectDialogId]     = useState<number | null>(null);
  const [rejectReason, setRejectReason]         = useState("");

  // Filters
  const [filterStatus, setFilterStatus]         = useState<string>("");
  const [filterDuration, setFilterDuration]     = useState<string>("");
  const [filterFromDate, setFilterFromDate]     = useState<string>("");
  const [filterToDate, setFilterToDate]         = useState<string>("");

  useEffect(() => {
    fetchRequests(currentPage);
  }, [currentPage, filterStatus, filterDuration, filterFromDate, filterToDate]);

  const clearFilters = () => {
    setFilterStatus("");
    setFilterDuration("");
    setFilterFromDate("");
    setFilterToDate("");
    setCurrentPage(1);
  };

  const fetchRequests = async (page = 1) => {
    setIsLoading(true);
    try {
      let q = `page=${page}`;
      if (filterStatus) q += `&status=${filterStatus}`;
      if (filterDuration) q += `&duration_type=${filterDuration}`;
      if (filterFromDate) q += `&from_date=${filterFromDate}`;
      if (filterToDate) q += `&to_date=${filterToDate}`;

      const res = await api.get(`/wfh-requests?${q}`);
      const paginatedData = res.data.data;
      setRequests(paginatedData?.data || []);
      setPagination({
        current_page: paginatedData?.current_page || 1,
        last_page: paginatedData?.last_page || 1,
        total: paginatedData?.total || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveWfh = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/wfh-requests/${id}/status`, { status: "Approved" });
      setSuccessMessage(res.data?.message || "WFH request approved successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchRequests(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to approve WFH request.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!rejectDialogId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/wfh-requests/${rejectDialogId}/status`, {
        status: "Rejected",
        remarks: rejectReason.trim(),
      });
      setSuccessMessage(res.data?.message || "WFH request rejected.");
      setTimeout(() => setSuccessMessage(null), 4000);
      setRejectDialogId(null);
      setRejectReason("");
      fetchRequests(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to reject WFH request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelWfh = async (id: number) => {
    const isApproved = requests.find((r) => r.id === id)?.status === "Approved";
    const confirmMsg = isApproved
      ? "Are you sure you want to delete this approved WFH request? This will mark the request as Cancelled for the employee."
      : "Are you sure you want to cancel this pending WFH request?";
    if (!confirm(confirmMsg)) return;
    setCancellingId(id);
    try {
      await api.post(`/wfh-requests/${id}/cancel`);
      setSuccessMessage(isApproved ? "Approved WFH request deleted successfully." : "WFH request cancelled successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchRequests(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to cancel WFH request.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteWfh = async (id: number) => {
    if (!confirm("Are you sure you want to delete this past WFH record?")) return;
    setCancellingId(id);
    try {
      await api.delete(`/wfh-requests/${id}`);
      setSuccessMessage("WFH record deleted successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchRequests(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete WFH record.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmitted = () => {
    setSuccessMessage("WFH request submitted! Awaiting approval from your Team Lead and Admin.");
    setTimeout(() => setSuccessMessage(null), 5000);
    fetchRequests(1);
    setActiveView(isSuperAdmin || isTeamLead ? "team" : "my");
  };

  /* ── Status badges ── */
  const getStatusBadge = (req: any) => {
    if (req.status === "Cancelled")
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          <XCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    if (req.status === "Approved")
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    if (req.status === "Rejected")
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );

    const tlStatusLower = (req.tl_status || "").toLowerCase();
    const adminStatusLower = (req.admin_status || "").toLowerCase();

    let pendingText = "Pending";
    if (tlStatusLower === "pending") {
      pendingText = "Pending TL";
    } else if (adminStatusLower === "pending" || tlStatusLower === "approved" || tlStatusLower === "not required") {
      pendingText = "Pending Admin";
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> {pendingText}
      </span>
    );
  };

  const pendingCount = isTeamLead
    ? requests.filter(r => r.status === "Pending" && (r.tl_status || "").toLowerCase() === "pending" && r.user_id !== user?.id).length
    : requests.filter(r => r.status === "Pending").length;

  // Filter requests based on active view tab
  const displayedRequests = activeView === "my"
    ? requests.filter(r => (r.user_id === user?.id || r.user?.id === user?.id))
    : requests;

  return (
    <div className={`space-y-7 mx-auto ${activeView === "apply" ? "max-w-[1400px]" : "max-w-6xl"}`}>


      {/* ── Reject Reason Dialog ──────────────────────────────────── */}
      {rejectDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectDialogId(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reject WFH Request</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Please provide a reason for the employee.</p>
            </div>
            <div className="px-6 py-5">
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-slate-400 resize-none transition-colors"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => { setRejectDialogId(null); setRejectReason(""); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Alert ─────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Top Header Banner (Keka Style) ────────────────────────── */}
      {activeView !== "apply" && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 border border-amber-200 dark:border-amber-800/60">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
              {isSuperAdmin ? (
                pendingCount === 0 ? "No pending WFH requests across company" : (
                  <>There are <span className="text-amber-600 dark:text-amber-400 font-extrabold mx-1">{pendingCount}</span> pending WFH request{pendingCount !== 1 ? "s" : ""} across the company</>
                )
              ) : isTeamLead ? (
                pendingCount === 0 ? "No pending WFH requests in your team" : (
                  <>You have <span className="text-amber-600 dark:text-amber-400 font-extrabold mx-1">{pendingCount}</span> pending WFH request{pendingCount !== 1 ? "s" : ""} in your team</>
                )
              ) : (
                "Work From Home"
              )}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isSuperAdmin
                ? "Review, approve, and manage company-wide remote work requests."
                : isTeamLead
                ? "Review team WFH requests, approve submissions, or apply for your own remote work."
                : "Submit and track your remote work sessions and approval status."
              }
            </p>
          </div>
        </div>

        {/* Action / View Switchers */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {isApprover && (
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveView("team")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === "team"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {isSuperAdmin ? "All Requests" : "Approvals & Team"}
              </button>
              <button
                onClick={() => setActiveView("my")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === "my"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                My WFH
              </button>
            </div>
          )}

          {isSuperAdmin ? (
            <button
              onClick={() => setIsDirectModalOpen(true)}
              className="px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 bg-[#56348f] hover:bg-[#452875] text-white"
            >
              <Plus className="w-4 h-4" />
              <span>Add Leave / WFH</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView("apply")}
              className="px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4" /> Request WFH
            </button>
          )}
        </div>
      </div>
      )}

      {/* ── Single-page WFH request form ───────────────────────────── */}
      {activeView === "apply" && (
        <WfhRequestForm
          onCancel={() => setActiveView(isSuperAdmin || isTeamLead ? "team" : "my")}
          onViewAll={() => setActiveView("my")}
          onSubmitted={handleSubmitted}
        />
      )}

      {/* ── Requests Table Section ─────────────────────────────────── */}
      {activeView !== "apply" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          
          {/* Table Header and Filters */}
          <div className="px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-850">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeView === "my"
                  ? "My WFH Requests"
                  : isSuperAdmin
                  ? "All Company WFH Requests"
                  : "Team WFH Requests & Approvals"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {activeView === "my"
                  ? "Your personal remote work requests and their approval status"
                  : isSuperAdmin
                  ? "Complete list of remote work requests across the company"
                  : "Review and act on WFH requests submitted by your team members"
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Session Type</label>
                <select
                  value={filterDuration}
                  onChange={(e) => { setFilterDuration(e.target.value); setCurrentPage(1); }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">All Types</option>
                  <option value="Full">Full Day</option>
                  <option value="Half-Morning">Morning Half</option>
                  <option value="Half-Afternoon">Afternoon Half</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => { setFilterFromDate(e.target.value); setCurrentPage(1); }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => { setFilterToDate(e.target.value); setCurrentPage(1); }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
                />
              </div>

              {(filterStatus || filterDuration || filterFromDate || filterToDate) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-[11px] uppercase font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-medium">Loading WFH requests…</span>
            </div>
          ) : displayedRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
                <Home className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No WFH requests found.</p>
              <p className="text-xs text-slate-500">Try changing your filters or submit a new request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] table-fixed text-sm text-left">
                <colgroup>
                  {isApprover && activeView !== "my" && (
                    <col className="w-[20%]" />
                  )}
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[8%]" />
                  <col className="" /> {/* Reason */}
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {isApprover && activeView !== "my" && (
                      <th className="px-3 py-3 font-semibold">Employee</th>
                    )}
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Duration</th>
                    <th className="px-3 py-3 font-semibold text-center">Days</th>
                    <th className="px-3 py-3 font-semibold">Reason</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                  {displayedRequests.map((req) => {
                    const singleDay = !req.end_date || req.end_date === req.start_date;
                    const isOwnRequest = (req.user_id === user?.id || req.user?.id === user?.id);

                    // Check if current user can approve this request
                    const canApproveRow = (isSuperAdmin && req.status === "Pending") ||
                      (!isOwnRequest && (req.tl_status || "").toLowerCase() === "pending" && req.status === "Pending");

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {isApprover && activeView !== "my" && (
                          <td className="px-3 py-3 align-middle border-r border-slate-100 dark:border-slate-800/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <RoyalAvatar
                                src={req.user?.profile_photo_path}
                                name={`${req.user?.first_name} ${req.user?.last_name || ""}`.trim()}
                                userId={req.user_id || req.user?.id}
                                employeeCode={req.user?.employee_code}
                                className="w-7 h-7 rounded-full text-[10px] font-bold bg-amber-600 text-white shrink-0"
                              />
                              <div className="min-w-0 truncate">
                                <h3 className="font-bold text-[12px] text-slate-900 dark:text-white leading-tight truncate">
                                  <RoyalName
                                    name={`${req.user?.first_name} ${req.user?.last_name || ""}`.trim()}
                                    userId={req.user_id || req.user?.id}
                                    employeeCode={req.user?.employee_code}
                                  />
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {req.user?.designation || req.user?.role || "Employee"}
                                  {req.user?.employee_code && ` • ${req.user.employee_code}`}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}

                        <td className="px-3 py-3 align-middle">
                          <DurationBadge type={req.duration_type || "Full"} />
                        </td>

                        <td className="px-3 py-3 align-middle text-slate-600 dark:text-slate-300 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{req.start_date ? fmtDate(req.start_date) : "—"}</span>
                            {!singleDay && req.end_date && <span> → {fmtDate(req.end_date)}</span>}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-middle text-center font-bold text-slate-900 dark:text-white text-xs">
                          {calcWfhDays(req)}
                        </td>

                        <td className="px-3 py-3 align-middle text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal leading-tight">
                          <p className="line-clamp-2" title={req.reason || ""}>{req.reason || "—"}</p>
                          {req.remarks && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 italic">Note: {req.remarks}</p>
                          )}
                        </td>

                        <td className="px-3 py-3 align-middle">
                          {getStatusBadge(req)}
                        </td>

                        <td className="px-3 py-3 align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* If manager/admin can approve */}
                            {canApproveRow ? (
                              <>
                                <button
                                  onClick={() => handleApproveWfh(req.id)}
                                  disabled={actionLoading}
                                  title="Approve WFH"
                                  className="p-1.5 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectDialogId(req.id);
                                    setRejectReason("");
                                  }}
                                  disabled={actionLoading}
                                  title="Reject WFH"
                                  className="px-2 py-1.5 rounded-md text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  Reject
                                </button>
                              </>
                            ) : null}

                            {/* Cancel option for applicant or admin */}
                            {(isOwnRequest || isSuperAdmin) && req.status === "Pending" ? (
                              <button
                                type="button"
                                onClick={() => handleCancelWfh(req.id)}
                                disabled={cancellingId === req.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>{cancellingId === req.id ? "…" : "Cancel"}</span>
                              </button>
                            ) : isSuperAdmin && req.status === "Approved" ? (
                              <button
                                type="button"
                                onClick={() => handleCancelWfh(req.id)}
                                disabled={cancellingId === req.id}
                                title="Delete Approved WFH Request"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>{cancellingId === req.id ? "…" : "Delete"}</span>
                              </button>
                            ) : isSuperAdmin && (req.status === "Cancelled" || req.status === "Rejected") ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteWfh(req.id)}
                                disabled={cancellingId === req.id}
                                title="Delete Past WFH Record"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{cancellingId === req.id ? "…" : "Delete"}</span>
                              </button>
                            ) : !canApproveRow && req.status !== "Pending" ? (
                              <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {pagination && pagination.last_page > 1 && (
            <div className="px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-850">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {pagination.current_page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} request{pagination.total !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                  disabled={pagination.current_page === pagination.last_page}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct Add Leave / WFH Modal for Super Admin */}
      <AdminLeaveWfhModal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        onSuccess={() => fetchRequests(currentPage)}
        initialType="wfh"
      />
    </div>
  );
}
