"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { Check, X, Calendar, Clock, User, Edit, Loader2, CheckCircle, XCircle } from "lucide-react";
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
  const [overrideDialog, setOverrideDialog] = useState<OverrideDialogState>(null);
  const [overrideFields, setOverrideFields] = useState({ is_unpaid: false, days: 0, remarks: "" });
  const [actionLoading, setActionLoading] = useState(false);

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
      const endpoint = type === "leave" ? `/leave-requests/${id}/status` : `/wfh-requests/${id}/status`;
      await api.post(endpoint, { status: "Approved" });
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing request.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const endpoint =
        rejectDialog.type === "leave"
          ? `/leave-requests/${rejectDialog.id}/status`
          : `/wfh-requests/${rejectDialog.id}/status`;
      await api.post(endpoint, {
        status: "Rejected",
        ...(rejectDialog.type === "leave" ? { rejection_reason: rejectReason } : { remarks: rejectReason }),
      });
      setRejectDialog(null);
      setRejectReason("");
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error rejecting request.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitOverride = async () => {
    if (!overrideDialog || !overrideFields.remarks.trim()) return;
    setActionLoading(true);
    try {
      await api.put(`/leave-requests/${overrideDialog.id}/override`, {
        is_unpaid: overrideFields.is_unpaid,
        actual_leave_days: overrideFields.days,
        remarks: overrideFields.remarks,
      });
      setOverrideDialog(null);
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing override.");
    } finally {
      setActionLoading(false);
    }
  };

  const openOverride = (req: any) => {
    setOverrideDialog({ id: req.id, is_unpaid: req.is_unpaid, days: req.actual_leave_days ?? req.days });
    setOverrideFields({ is_unpaid: req.is_unpaid ?? false, days: req.actual_leave_days ?? req.days ?? 0, remarks: "" });
  };

  const LeaveCard = ({ req }: { req: any }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 border-l-4 border-l-amber-500">
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
        <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
          <Clock className="w-3 h-3" /> Pending
        </div>
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

      {req.is_unpaid && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
          ⚠️ <strong>Marked as Unpaid (LOP)</strong>
          {req.unpaid_reason && <p className="text-xs mt-1 opacity-80">{req.unpaid_reason}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {isSuperAdmin && (
          <button
            onClick={() => openOverride(req)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition"
          >
            <Edit className="h-3.5 w-3.5" /> Override
          </button>
        )}
        <button
          onClick={() => { setRejectDialog({ type: "leave", id: req.id }); setRejectReason(""); }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition"
        >
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
        <button
          onClick={() => approve("leave", req.id)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition"
        >
          <CheckCircle className="h-3.5 w-3.5" /> Approve
        </button>
      </div>
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
          <div className="relative w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Override Leave</h2>
              <p className="text-slate-400 text-sm mt-0.5">Adjust days or mark as LOP (Loss of Pay).</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Actual Days to Deduct</label>
                <input
                  type="number"
                  step="0.5"
                  value={overrideFields.days}
                  onChange={(e) => setOverrideFields((f) => ({ ...f, days: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="is-unpaid"
                  type="checkbox"
                  checked={overrideFields.is_unpaid}
                  onChange={(e) => setOverrideFields((f) => ({ ...f, is_unpaid: e.target.checked }))}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <label htmlFor="is-unpaid" className="text-sm text-slate-300 font-medium">Mark as Unpaid (LOP)</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Remarks *</label>
                <textarea
                  rows={3}
                  value={overrideFields.remarks}
                  onChange={(e) => setOverrideFields((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Enter override remarks..."
                  className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
              <button onClick={() => setOverrideDialog(null)} className="px-4 py-2 text-sm text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitOverride}
                disabled={actionLoading || !overrideFields.remarks.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
