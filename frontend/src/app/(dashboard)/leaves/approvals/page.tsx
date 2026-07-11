"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { Check, X, Calendar, Clock, User, Edit, Loader2, CheckCircle, XCircle, AlertTriangle, Link2 } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

type RejectDialogState = { type: "leave" | "wfh"; id: number } | null;
type OverrideDialogState = { id: number; is_unpaid: boolean; days: number } | null;

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

function DurationBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Full: "bg-indigo-500/20 text-indigo-300",
    "Half-Morning": "bg-amber-500/20 text-amber-300",
    "Half-Afternoon": "bg-purple-500/20 text-purple-300",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[type] ?? "bg-white/10 text-slate-300"}`}>
      {type === "Full" ? "Full Day" : type === "Half-Morning" ? "Morning" : "Afternoon"}
    </span>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";

  const [tab, setTab] = useState<"leaves" | "wfh">("leaves");
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [overrideDialog, setOverrideDialog] = useState<any | null>(null);
  const [overrideFields, setOverrideFields] = useState({
    start_date: "",
    end_date: "",
    paid_casual_leave: 0,
    paid_sick_leave: 0,
    lop_days: 0,
    remarks: "",
  });
  const [currentBalances, setCurrentBalances] = useState({ cl: 0, sl: 0 });
  const [autoTotalDays, setAutoTotalDays] = useState(0);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const [leaves, wfh] = await Promise.all([
        api.get("/leave-requests?status=Pending"),
        api.get("/wfh-requests?status=Pending"),
      ]);
      setLeaveRequests(leaves.data.data?.data ?? []);
      setWfhRequests(wfh.data.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const approve = async (type: "leave" | "wfh", id: number) => {
    setActionLoading(true);
    try {
      // Optimistically remove from UI
      if (type === "leave") {
        setLeaveRequests(prev => prev.filter(req => req.id !== id));
      } else {
        setWfhRequests(prev => prev.filter(req => req.id !== id));
      }

      const endpoint = type === "leave" ? `/leave-requests/${id}/status` : `/wfh-requests/${id}/status`;
      await api.post(endpoint, { status: "Approved" });
      setSuccessMessage(`${type === "leave" ? "Leave" : "WFH"} request approved successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing request.");
      // Refetch on error to restore correct state
      await fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const handleLopConversion = async (id: number, action: "confirm" | "reject") => {
    setActionLoading(true);
    try {
      // Optimistically remove from UI
      setLeaveRequests(prev => prev.filter(req => req.id !== id));

      const endpoint = `/leave-requests/${id}/${action === "confirm" ? "confirm-lop" : "reject-lop"}`;
      await api.post(endpoint);
      setSuccessMessage(`LOP conversion ${action === "confirm" ? "confirmed" : "declined"} successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing LOP conversion.");
      // Refetch on error to restore correct state
      await fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const id = rejectDialog.id;
      const type = rejectDialog.type;

      // Optimistically remove from UI
      if (type === "leave") {
        setLeaveRequests(prev => prev.filter(req => req.id !== id));
      } else {
        setWfhRequests(prev => prev.filter(req => req.id !== id));
      }

      const endpoint =
        type === "leave"
          ? `/leave-requests/${id}/status`
          : `/wfh-requests/${id}/status`;
      await api.post(endpoint, {
        status: "Rejected",
        ...(type === "leave" ? { rejection_reason: rejectReason } : { remarks: rejectReason }),
      });
      setSuccessMessage(`${type === "leave" ? "Leave" : "WFH"} request rejected successfully!`);
      setRejectDialog(null);
      setRejectReason("");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error rejecting request.");
      // Refetch on error to restore correct state
      await fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const overrideTotalDays =
    parseFloat(overrideFields.paid_casual_leave.toString() || "0") +
    parseFloat(overrideFields.paid_sick_leave.toString() || "0") +
    parseFloat(overrideFields.lop_days.toString() || "0");

  const handleDateChange = async (field: "start_date" | "end_date", val: string) => {
    const updatedFields = { ...overrideFields, [field]: val };
    setOverrideFields(updatedFields);

    if (!updatedFields.start_date || !updatedFields.end_date) return;
    if (new Date(updatedFields.start_date) > new Date(updatedFields.end_date)) return;

    setRecalcLoading(true);
    try {
      const res = await api.post("/leave-requests/calculate", {
        leave_type_id: overrideDialog.leave_type_id,
        start_date: updatedFields.start_date,
        end_date: updatedFields.end_date,
        user_id: overrideDialog.user_id,
      });

      const calc = res.data;
      setOverrideFields((f) => ({
        ...f,
        paid_casual_leave: calc.paid_casual_leave ?? 0,
        paid_sick_leave: calc.paid_sick_leave ?? 0,
        lop_days: calc.total_lop_days ?? 0,
      }));
      setAutoTotalDays(calc.actual_leave_days ?? 0);

      const bal = calc.balance;
      setCurrentBalances({
        cl: (bal.casual_leave ?? 0) + (bal.cl_carry_forward ?? 0),
        sl: bal.sick_leave ?? 0,
      });
    } catch (err) {
      console.error("Recalculation failed", err);
    } finally {
      setRecalcLoading(false);
    }
  };

  const submitOverride = async () => {
    if (!overrideDialog || !overrideFields.remarks.trim()) return;
    setActionLoading(true);
    try {
      const id = overrideDialog.id;

      // Optimistically remove from UI
      setLeaveRequests(prev => prev.filter(req => req.id !== id));

      await api.put(`/leave-requests/${id}/override`, {
        start_date: overrideFields.start_date,
        end_date: overrideFields.end_date,
        paid_casual_leave: overrideFields.paid_casual_leave,
        paid_sick_leave: overrideFields.paid_sick_leave,
        lop_days: overrideFields.lop_days,
        remarks: overrideFields.remarks,
      });
      setSuccessMessage("Leave request override applied and approved successfully!");
      setOverrideDialog(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing override.");
      // Refetch on error to restore correct state
      await fetchRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const openOverride = async (req: any) => {
    const origLop = req.lop_days ?? (req.is_unpaid ? (req.actual_leave_days ?? req.days) : 0);
    const origPaidCL = req.paid_casual_leave ?? 0;
    const origPaidSL = req.paid_sick_leave ?? 0;

    setOverrideDialog({
      id: req.id,
      user_id: req.user_id,
      leave_type_id: req.leave_type_id,
      original_start_date: req.start_date,
      original_end_date: req.end_date,
      original_days: req.actual_leave_days ?? req.days ?? 0,
      original_paid_cl: origPaidCL,
      original_paid_sl: origPaidSL,
      original_lop: origLop,
    });

    setOverrideFields({
      start_date: req.start_date,
      end_date: req.end_date,
      paid_casual_leave: origPaidCL,
      paid_sick_leave: origPaidSL,
      lop_days: origLop,
      remarks: "",
    });

    setAutoTotalDays(req.actual_leave_days ?? req.days ?? 0);
    setRecalcLoading(true);

    try {
      const res = await api.post("/leave-requests/calculate", {
        leave_type_id: req.leave_type_id,
        start_date: req.start_date,
        end_date: req.end_date,
        user_id: req.user_id,
      });
      const bal = res.data.balance;
      setCurrentBalances({
        cl: (bal.casual_leave ?? 0) + (bal.cl_carry_forward ?? 0),
        sl: bal.sick_leave ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch balances", err);
    } finally {
      setRecalcLoading(false);
    }
  };



  const LeaveCard = ({ req }: { req: any }) => (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 border-l-4 ${
      req.pending_lop_conversion ? "border-l-rose-500" : "border-l-amber-500"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
            {req.user?.first_name?.[0]}{req.user?.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold text-white">{req.user?.first_name} {req.user?.last_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{req.user?.designation || req.user?.role}</p>
          </div>
        </div>

        {req.pending_lop_conversion ? (
          <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400">
            <AlertTriangle className="w-3 h-3 animate-pulse" /> Pending LOP Conversion
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
            <Clock className="w-3 h-3" /> Pending
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Type</p>
          <p className="text-slate-200 font-medium">{req.leave_type?.name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Duration</p>
          <p className="text-slate-200">{fmtDate(req.start_date)} — {fmtDate(req.end_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Days</p>
          <p className="text-slate-200 font-medium">{req.days_taken ?? req.days ?? "—"}</p>
        </div>
      </div>

      {req.reason && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reason</p>
          <p className="text-slate-300 text-sm">{req.reason}</p>
        </div>
      )}

      {req.attachment_link && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Attachment</p>
            <p className="text-slate-300 text-sm truncate">{req.attachment_link}</p>
          </div>
          <a
            href={req.attachment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition shrink-0"
          >
            <Link2 className="h-3.5 w-3.5" /> View
          </a>
        </div>
      )}

      {req.is_unpaid && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
          ⚠️ <strong>Marked as Unpaid (LOP)</strong>
          {req.unpaid_reason && <p className="text-xs mt-1 opacity-80">{req.unpaid_reason}</p>}
        </div>
      )}

      {req.pending_lop_conversion ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleLopConversion(req.id, "confirm")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Confirm LOP Conversion
          </button>
          <button
            onClick={() => handleLopConversion(req.id, "reject")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white/10 text-slate-300 border border-white/10 rounded-lg hover:bg-white/15 transition disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" /> Decline (Keep Paid)
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {isSuperAdmin && (
            <button
              onClick={() => openOverride(req)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition disabled:opacity-50"
            >
              <Edit className="h-3.5 w-3.5" /> Override
            </button>
          )}
          <button
            onClick={() => { setRejectDialog({ type: "leave", id: req.id }); setRejectReason(""); }}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </button>
          <button
            onClick={() => approve("leave", req.id)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Approve
          </button>
        </div>
      )}
    </div>
  );

  const WfhCard = ({ req }: { req: any }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 border-l-4 border-l-indigo-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
            {req.user?.first_name?.[0]}{req.user?.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold text-white">{req.user?.first_name} {req.user?.last_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{req.user?.designation || req.user?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {req.duration_type && <DurationBadge type={req.duration_type} />}
          <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
            <Clock className="w-3 h-3" /> Pending
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Date(s)</p>
          <p className="text-slate-200">{fmtDate(req.start_date)}{req.end_date && req.end_date !== req.start_date ? ` — ${fmtDate(req.end_date)}` : ""}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">TL Status</p>
          <p className={`font-medium ${req.tl_status === "Approved" ? "text-emerald-400" : req.tl_status === "Rejected" ? "text-red-400" : "text-amber-400"}`}>
            {req.tl_status ?? "Pending"}
          </p>
        </div>
      </div>

      {req.reason && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reason</p>
          <p className="text-slate-300 text-sm">{req.reason}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { setRejectDialog({ type: "wfh", id: req.id }); setRejectReason(""); }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition"
        >
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
        <button
          onClick={() => approve("wfh", req.id)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition"
        >
          <CheckCircle className="h-3.5 w-3.5" /> Approve
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Approvals Queue</h1>
        <p className="text-slate-300 mt-1">Review and process pending leave and WFH requests from your team.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded text-green-400 animate-in fade-in">
          ✓ {successMessage}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {(["leaves", "wfh"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === t ? "bg-amber-500 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "leaves" ? `Leave Requests (${leaveRequests.length})` : `WFH Requests (${wfhRequests.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : tab === "leaves" ? (
        leaveRequests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl py-16 text-center text-slate-400">
            No pending leave requests.
          </div>
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((req) => <LeaveCard key={req.id} req={req} />)}
          </div>
        )
      ) : (
        wfhRequests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl py-16 text-center text-slate-400">
            No pending WFH requests.
          </div>
        ) : (
          <div className="space-y-4">
            {wfhRequests.map((req) => <WfhCard key={req.id} req={req} />)}
          </div>
        )
      )}

      {/* ── Reject Dialog ── */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectDialog(null)} />
          <div className="relative w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Reject Request</h2>
              <p className="text-slate-400 text-sm mt-0.5">Provide a reason — this will be sent to the employee.</p>
            </div>
            <div className="px-6 py-5">
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-red-500 placeholder:text-slate-500 resize-none transition-colors"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
              <button onClick={() => setRejectDialog(null)} className="px-4 py-2 text-sm text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Override Dialog (Super Admin) ── */}
      {overrideDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOverrideDialog(null)} />
          <div className="relative w-full max-w-3xl bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Override Leave Request</h2>
              <p className="text-slate-400 text-sm mt-0.5 font-sans">Customize dates and manually split paid leaves and LOP.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[65vh] overflow-y-auto">
              {/* Left Column: Form Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Start Date</label>
                    <input
                      type="date"
                      value={overrideFields.start_date}
                      onChange={(e) => handleDateChange("start_date", e.target.value)}
                      className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">End Date</label>
                    <input
                      type="date"
                      value={overrideFields.end_date}
                      onChange={(e) => handleDateChange("end_date", e.target.value)}
                      className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Custom Allocation Split</h3>
                  <p className="text-xs text-slate-500 mb-4">Original auto-calculated total: <span className="font-bold text-white font-mono">{autoTotalDays} day(s)</span></p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-300">Paid Casual Leave</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrideFields.paid_casual_leave}
                        onChange={(e) => setOverrideFields((f) => ({ ...f, paid_casual_leave: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-700 border border-white/10 text-white text-sm text-center rounded-xl px-2 py-1.5 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-300">Paid Sick Leave</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrideFields.paid_sick_leave}
                        onChange={(e) => setOverrideFields((f) => ({ ...f, paid_sick_leave: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-700 border border-white/10 text-white text-sm text-center rounded-xl px-2 py-1.5 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-300">Loss of Pay (LOP)</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrideFields.lop_days}
                        onChange={(e) => setOverrideFields((f) => ({ ...f, lop_days: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-700 border border-white/10 text-white text-sm text-center rounded-xl px-2 py-1.5 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Reason for Override *</label>
                  <textarea
                    rows={2}
                    value={overrideFields.remarks}
                    onChange={(e) => setOverrideFields((f) => ({ ...f, remarks: e.target.value }))}
                    placeholder="Provide a reason for overriding this allocation..."
                    className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Right Column: Before-and-After Summary Panel */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Before-and-After Summary</h3>

                {recalcLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    <span className="text-xs text-slate-400">Recalculating...</span>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* Original Calculation */}
                    <div className="space-y-2 bg-white/5 border border-white/5 rounded-xl p-3.5">
                      <p className="font-bold text-amber-400 uppercase tracking-wider mb-1 text-[10px]">Original Calculation</p>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dates:</span>
                        <span className="text-slate-200 font-mono">{fmtDate(overrideDialog.original_start_date)} – {fmtDate(overrideDialog.original_end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Leave:</span>
                        <span className="text-slate-200 font-bold font-mono">{overrideDialog.original_days} day(s)</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-400 border-l border-white/10">
                        <span>Paid Casual Leave:</span>
                        <span className="font-mono">{overrideDialog.original_paid_cl}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-400 border-l border-white/10">
                        <span>Paid Sick Leave:</span>
                        <span className="font-mono">{overrideDialog.original_paid_sl}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-400 border-l border-white/10">
                        <span>Loss of Pay (LOP):</span>
                        <span className="font-mono">{overrideDialog.original_lop}</span>
                      </div>
                    </div>

                    {/* Override Calculation */}
                    <div className="space-y-2 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5">
                      <p className="font-bold text-amber-400 uppercase tracking-wider mb-1 text-[10px]">Override Calculation</p>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dates:</span>
                        <span className="text-slate-200 font-mono">{fmtDate(overrideFields.start_date)} – {fmtDate(overrideFields.end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Leave:</span>
                        <span className="text-slate-200 font-bold font-mono">{overrideTotalDays} day(s)</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-400 border-l border-amber-500/10">
                        <span>Paid Casual Leave:</span>
                        <span className="font-mono text-white">{overrideFields.paid_casual_leave}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-400 border-l border-amber-500/10">
                        <span>Paid Sick Leave:</span>
                        <span className="font-mono text-white">{overrideFields.paid_sick_leave}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-400 border-l border-amber-500/10">
                        <span>Loss of Pay (LOP):</span>
                        <span className="font-mono text-white">{overrideFields.lop_days}</span>
                      </div>
                    </div>

                    {/* Impact on Balances */}
                    <div className="space-y-2 bg-slate-900 border border-white/5 rounded-xl p-3.5">
                      <p className="font-bold text-slate-400 uppercase tracking-wider mb-1 text-[10px]">Leave Balances Impact</p>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Casual Leave Balance</p>
                          <p className="text-sm font-semibold text-slate-300 font-mono mt-0.5">
                            {currentBalances.cl} <span className="text-slate-500 font-normal text-xs">→</span> <span className="text-white font-bold">{Math.max(0, currentBalances.cl - overrideFields.paid_casual_leave)}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Sick Leave Balance</p>
                          <p className="text-sm font-semibold text-slate-300 font-mono mt-0.5">
                            {currentBalances.sl} <span className="text-slate-500 font-normal text-xs">→</span> <span className="text-white font-bold">{Math.max(0, currentBalances.sl - overrideFields.paid_sick_leave)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Message */}
            {overrideTotalDays > autoTotalDays && (
              <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️ The sum of split days ({overrideTotalDays}) cannot exceed the total leave count for this date range ({autoTotalDays}).</span>
              </div>
            )}

            <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
              <button onClick={() => setOverrideDialog(null)} className="px-4 py-2 text-sm text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitOverride}
                disabled={actionLoading || recalcLoading || !overrideFields.remarks.trim() || overrideTotalDays > autoTotalDays}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Override & Approve
              </button>
            </div>          </div>
        </div>
      )}
    </div>
  );
}
