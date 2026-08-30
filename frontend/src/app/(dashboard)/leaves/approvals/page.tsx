"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  Calendar,
  Clock,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Link2,
  Leaf,
  Stethoscope,
  Users,
  History,
  RefreshCw,
  Trash2
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format, parseISO } from "date-fns";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";

type RejectDialogState = { type: "leave" | "wfh"; id: number } | null;

const CACHE_KEY = "intersmart_approvals_cache_v2";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    const clean = d.split("T")[0];
    const parsed = parseISO(clean);
    if (isNaN(parsed.getTime())) return d;
    return format(parsed, "dd MMM");
  } catch {
    return String(d);
  }
}

function DurationBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Full: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    "Half-Morning": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    "Half-Afternoon": "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${map[type] ?? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
      {type === "Full" ? "Full" : type === "Half-Morning" ? "AM" : "PM"}
    </span>
  );
}

function LeaveTypeIcon({ leaveTypeName }: { leaveTypeName?: string }) {
  const name = (leaveTypeName || "").toLowerCase();
  if (name.includes("casual")) return <Leaf className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (name.includes("sick")) return <Stethoscope className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  return <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
}

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";

  const [currentUserTeamId, setCurrentUserTeamId] = useState<number | null>(user?.team_id || null);

  const canApprove = (request: any): boolean => {
    if (isSuperAdmin) return true;
    if (isTeamLead && request?.user?.team_id === currentUserTeamId) return true;
    return false;
  };

  const [tab, setTab] = useState<"leaves" | "wfh">("leaves");
  const [statusFilter, setStatusFilter] = useState<"Pending" | "Approved" | "Rejected" | "All">("Pending");

  // State with initial hydration from localStorage for 0ms page load
  const [leaveRequests, setLeaveRequests] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`${CACHE_KEY}_pending`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`${CACHE_KEY}_approved`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [rejectedLeaves, setRejectedLeaves] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`${CACHE_KEY}_rejected`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [wfhRequests, setWfhRequests] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`${CACHE_KEY}_wfh`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => leaveRequests.length === 0);
  const [refreshing, setRefreshing] = useState(false);

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
  const [currentBalances, setCurrentBalances] = useState({ cl: 0, reg_cl: 0, cf: 0, sl: 0 });
  const [autoTotalDays, setAutoTotalDays] = useState(0);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile refresh
  useEffect(() => {
    if (isTeamLead && user?.id) {
      api.get("/profile")
        .then((res) => {
          const tId = res.data?.data?.team_id;
          if (tId !== undefined) setCurrentUserTeamId(tId);
        })
        .catch(() => {});
    }
  }, [isTeamLead, user?.id]);

  // Fast staged fetcher: Fetches pending first immediately, then background fetches archives
  const fetchRequests = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (leaveRequests.length === 0) setIsLoading(true);

    try {
      // 1. Fetch pending leaves first for sub-second UI response
      const pendingRes = await api.get("/leave-requests?status=Pending");
      const pendingData = pendingRes.data?.data?.data ?? [];
      setLeaveRequests(pendingData);
      setIsLoading(false);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${CACHE_KEY}_pending`, JSON.stringify(pendingData));
        } catch {}
      }

      // 2. Fetch others in parallel background
      const [approvedRes, rejectedRes, wfhRes] = await Promise.allSettled([
        api.get("/leave-requests?status=Approved"),
        api.get("/leave-requests?status=Rejected"),
        api.get("/wfh-requests?status=Pending"),
      ]);

      if (approvedRes.status === "fulfilled") {
        const d = approvedRes.value.data?.data?.data ?? [];
        setApprovedLeaves(d);
        try { localStorage.setItem(`${CACHE_KEY}_approved`, JSON.stringify(d)); } catch {}
      }
      if (rejectedRes.status === "fulfilled") {
        const d = rejectedRes.value.data?.data?.data ?? [];
        setRejectedLeaves(d);
        try { localStorage.setItem(`${CACHE_KEY}_rejected`, JSON.stringify(d)); } catch {}
      }
      if (wfhRes.status === "fulfilled") {
        const d = wfhRes.value.data?.data?.data ?? [];
        setWfhRequests(d);
        try { localStorage.setItem(`${CACHE_KEY}_wfh`, JSON.stringify(d)); } catch {}
      }
    } catch (e) {
      console.error("Failed to load approval requests", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [leaveRequests.length]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approve = async (type: "leave" | "wfh", id: number) => {
    setActionLoading(true);
    try {
      const endpoint = type === "leave" ? `/leave-requests/${id}/status` : `/wfh-requests/${id}/status`;
      const response = await api.post(endpoint, { status: "Approved" });

      if (response.data?.message) {
        setSuccessMessage(response.data.message);
      } else {
        setSuccessMessage(`${type === "leave" ? "Leave" : "WFH"} request approved successfully!`);
      }

      // Optimistic update
      if (type === "leave") {
        const approvedItem = leaveRequests.find((r) => r.id === id);
        if (approvedItem) {
          setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
          setApprovedLeaves((prev) => [{ ...approvedItem, status: "Approved" }, ...prev]);
        }
      } else {
        setWfhRequests((prev) => prev.filter((r) => r.id !== id));
      }

      fetchRequests(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error approving request.");
      fetchRequests(true);
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const { type, id } = rejectDialog;
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

      // Optimistic update
      if (type === "leave") {
        const rejectedItem = leaveRequests.find((r) => r.id === id);
        if (rejectedItem) {
          setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
          setRejectedLeaves((prev) => [{ ...rejectedItem, status: "Rejected" }, ...prev]);
        }
      } else {
        setWfhRequests((prev) => prev.filter((r) => r.id !== id));
      }

      fetchRequests(true);
      setStatusFilter("Rejected");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error rejecting request.");
      fetchRequests(true);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async (type: "leave" | "wfh", id: number) => {
    if (!confirm(`Are you sure you want to cancel this ${type} request on behalf of the employee?`)) return;
    setActionLoading(true);
    try {
      const endpoint = type === "leave" ? `/leave-requests/${id}/cancel` : `/wfh-requests/${id}/cancel`;
      await api.post(endpoint);
      setSuccessMessage(`${type === "leave" ? "Leave" : "WFH"} request cancelled successfully!`);
      
      // Optimistic update
      if (type === "leave") {
        setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        setWfhRequests((prev) => prev.filter((r) => r.id !== id));
      }

      fetchRequests(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error cancelling request.");
      fetchRequests(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLopConversion = async (id: number, action: "confirm" | "reject") => {
    setActionLoading(true);
    try {
      await api.post(`/leave-requests/${id}/lop-conversion`, { action });
      setSuccessMessage(`LOP Conversion ${action === "confirm" ? "confirmed" : "declined"}!`);
      fetchRequests(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing LOP conversion.");
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
      if (bal) {
        setCurrentBalances({
          cl: (bal.casual_leave ?? 0) + (bal.cl_carry_forward ?? 0),
          reg_cl: bal.casual_leave ?? 0,
          cf: bal.cl_carry_forward ?? 0,
          sl: bal.sick_leave ?? 0,
        });
      }
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
      fetchRequests(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing override.");
      fetchRequests(true);
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
        reg_cl: bal.casual_leave ?? 0,
        cf: bal.cl_carry_forward ?? 0,
        sl: bal.sick_leave ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch balances", err);
    } finally {
      setRecalcLoading(false);
    }
  };

  // Filtered requests computation
  const displayLeaves = useMemo(() => {
    if (statusFilter === "Pending") return leaveRequests;
    if (statusFilter === "Approved") return approvedLeaves;
    if (statusFilter === "Rejected") return rejectedLeaves;
    return [...leaveRequests, ...approvedLeaves, ...rejectedLeaves];
  }, [statusFilter, leaveRequests, approvedLeaves, rejectedLeaves]);

  return (
    <div className="space-y-5 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6">
      {/* ── Header Row ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Approvals Queue
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Review and process pending leave and WFH requests from your team.
            </p>
          </div>

          {/* Row 1: Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["Pending", "Approved", "Rejected", "All"] as const).map((status) => {
              let count = 0;
              if (tab === "leaves") {
                if (status === "Pending") count = leaveRequests.length;
                else if (status === "Approved") count = approvedLeaves.length;
                else if (status === "Rejected") count = rejectedLeaves.length;
                else count = leaveRequests.length + approvedLeaves.length + rejectedLeaves.length;
              } else {
                count = status === "Pending" ? wfhRequests.length : 0;
              }

              const isActive = statusFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {status === "Pending" && <Calendar className="w-3.5 h-3.5 text-amber-500" />}
                  {status === "Approved" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  {status === "Rejected" && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                  {status === "All" && <History className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{status}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive ? "bg-amber-500 text-white dark:text-slate-950" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => fetchRequests(true)}
              disabled={refreshing}
              aria-label="Refresh Approvals"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 ml-1"
              title="Refresh List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>

          {/* Row 2: Type Switcher (Leaves/WFH) */}
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl">
            {(["leaves", "wfh"] as const).map((t) => {
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3.5 py-1 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#56348f] text-white font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold"
                  }`}
                >
                  {t === "leaves" ? <Calendar className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  <span>{t === "leaves" ? "Leave Requests" : "WFH Requests"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Decorative Graphic */}
        <div className="hidden lg:flex items-center justify-center pr-4">
          <div className="relative w-36 h-28 flex items-center justify-center select-none pointer-events-none opacity-90">
            <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full" />
            <svg className="w-32 h-24 drop-shadow-md" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="35" y="18" width="90" height="96" rx="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.5" className="dark:fill-[#0f1f38] dark:stroke-[#1e3a6a]" />
              <path d="M60 14C60 10.6863 62.6863 8 66 8H94C97.3137 8 100 10.6863 100 14V20H60V14Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" className="dark:fill-[#1e293b] dark:stroke-[#334155]" />
              <rect x="72" y="12" width="16" height="4" rx="2" fill="#64748b" />
              <path d="M50 38L55 43L66 32" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="74" y1="38" x2="108" y2="38" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" className="dark:stroke-[#334155]" />
              <path d="M50 58L55 63L66 52" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="74" y1="58" x2="114" y2="58" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" className="dark:stroke-[#334155]" />
              <path d="M50 78L55 83L66 72" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="74" y1="78" x2="102" y2="78" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" className="dark:stroke-[#334155]" />
              <circle cx="120" cy="88" r="14" fill="#f59e0b" filter="drop-shadow(0 4px 10px rgba(245, 158, 11, 0.4))" />
              <circle cx="120" cy="88" r="11" fill="#fbbf24" />
              <path d="M120 82V88L124 90" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
          ✓ {successMessage}
        </div>
      )}

      {/* ── Table View with ZERO Horizontal Scroll ── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[30vh]">
          <div className="bg-transparent p-5 rounded-3xl flex flex-col items-center justify-center gap-3">
            <img
              src="/preloader.gif"
              alt="Loading..."
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>
      ) : tab === "leaves" ? (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full table-fixed text-left border-collapse text-[12px] leading-[16px]">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[6%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800">Employee</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Type</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Duration</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-800">Days</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Reason</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                    No {statusFilter === "All" ? "" : statusFilter.toLowerCase()} leave requests found.
                  </td>
                </tr>
              ) : (
                displayLeaves.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Column 1: Employee */}
                    <td className="py-2.5 px-3 align-middle border-r border-slate-100 dark:border-slate-800/60">
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

                    {/* Column 2: Type (compact) */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 truncate">
                        <LeaveTypeIcon leaveTypeName={req.leave_type?.name} />
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate" title={req.leave_type?.name}>
                          {req.leave_type?.name || "Leave"}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Duration */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60 break-words whitespace-normal leading-tight text-[11px] text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{fmtDate(req.start_date)}</span>
                      {req.end_date && req.end_date !== req.start_date && (
                        <span className="text-slate-500 dark:text-slate-400"> - {fmtDate(req.end_date)}</span>
                      )}
                    </td>

                    {/* Column 4: Days */}
                    <td className="py-2.5 px-2 align-middle text-center border-r border-slate-100 dark:border-slate-800/60 break-words whitespace-normal leading-tight font-bold text-slate-900 dark:text-white text-xs">
                      {Number(req.days_taken ?? req.days ?? 0).toFixed(1)}
                    </td>

                    {/* Column 5: Reason */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60">
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate" title={req.reason || ""}>
                        {req.reason || "—"}
                      </p>
                      {req.attachment_link && (
                        <a
                          href={req.attachment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          <Link2 className="w-2.5 h-2.5" /> File
                        </a>
                      )}
                    </td>

                    {/* Column 6: Status */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60">
                      <div className="space-y-1">
                        {req.pending_lop_conversion ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Pending LOP
                          </span>
                        ) : req.status === "Approved" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> Approved
                          </span>
                        ) : req.status === "Rejected" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-2.5 h-2.5 text-rose-500" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-2.5 h-2.5 text-amber-500" /> Pending
                          </span>
                        )}

                        {!!req.is_unpaid && (
                          <span
                            className="block text-[9px] font-bold text-rose-600 dark:text-rose-400 truncate cursor-help"
                            title={req.unpaid_reason || "Marked as Unpaid (LOP) due to exhausted leave balance."}
                          >
                            Unpaid (LOP)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Column 7: Actions */}
                    <td className="py-2.5 px-3 align-middle text-right break-words whitespace-normal leading-tight">
                      <div className="flex items-center justify-end gap-1">
                        {req.pending_lop_conversion ? (
                          <>
                            <button
                              onClick={() => handleLopConversion(req.id, "confirm")}
                              disabled={actionLoading}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleLopConversion(req.id, "reject")}
                              disabled={actionLoading}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : req.status === "Pending" ? (
                          <>
                            {canApprove(req) && (
                              <button
                                onClick={() => approve("leave", req.id)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setRejectDialog({ type: "leave", id: req.id });
                                setRejectReason("");
                              }}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <XCircle className="w-3 h-3 text-rose-500" /> Reject
                            </button>
                            {(isTeamLead || isSuperAdmin) && (
                              <button
                                onClick={() => cancelRequest("leave", req.id)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Cancel on behalf of employee"
                              >
                                <Trash2 className="w-3 h-3 text-slate-500" /> Cancel
                              </button>
                            )}
                          </>
                        ) : null}

                        {/* Super Admin Override button */}
                        {isSuperAdmin && req.status === "Pending" && (
                          <button
                            onClick={() => openOverride(req)}
                            className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors cursor-pointer"
                            title="Override Leave Request"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── WFH Table with ZERO Horizontal Scroll ── */
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full table-fixed text-left border-collapse text-[12px] leading-[16px]">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800">Employee</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Type</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Duration</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-800">TL Status</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200/80 dark:border-slate-800">Reason</th>
                <th className="py-2.5 px-2 border-r border-slate-200/80 dark:border-slate-800">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {wfhRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                    No pending WFH requests found.
                  </td>
                </tr>
              ) : (
                wfhRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Employee */}
                    <td className="py-2.5 px-3 align-middle border-r border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <RoyalAvatar
                          src={req.user?.profile_photo_path}
                          name={`${req.user?.first_name} ${req.user?.last_name || ""}`.trim()}
                          userId={req.user_id || req.user?.id}
                          employeeCode={req.user?.employee_code}
                          className="w-7 h-7 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0"
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

                    {/* Type */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60 break-words whitespace-normal leading-tight">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">WFH</span>
                        {req.duration_type && <DurationBadge type={req.duration_type} />}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60 break-words whitespace-normal leading-tight text-[11px] text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{fmtDate(req.start_date)}</span>
                      {req.end_date && req.end_date !== req.start_date && (
                        <span className="text-slate-500 dark:text-slate-400"> - {fmtDate(req.end_date)}</span>
                      )}
                    </td>

                    {/* TL Status */}
                    <td className="py-2.5 px-2 align-middle text-center border-r border-slate-100 dark:border-slate-800/60 break-words whitespace-normal leading-tight">
                      <span className={`text-[10px] font-bold ${req.tl_status === "Approved" ? "text-emerald-600 dark:text-emerald-400" : req.tl_status === "Rejected" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {req.tl_status ?? "Pending"}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-2.5 px-2.5 align-middle border-r border-slate-100 dark:border-slate-800/60">
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate" title={req.reason || ""}>{req.reason || "—"}</p>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-2 align-middle border-r border-slate-100 dark:border-slate-800/60 break-words whitespace-normal leading-tight">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-2.5 h-2.5 text-amber-500" /> Pending
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 align-middle text-right break-words whitespace-normal leading-tight">
                      <div className="flex items-center justify-end gap-1">
                        {canApprove(req) && (
                          <button
                            onClick={() => approve("wfh", req.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setRejectDialog({ type: "wfh", id: req.id });
                            setRejectReason("");
                          }}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3 text-rose-500" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reject Dialog ── */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectDialog(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reject Request</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Provide a reason — this will be sent to the employee.</p>
            </div>
            <div className="px-6 py-5">
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-slate-400 resize-none transition-colors"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => setRejectDialog(null)}
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

      {/* ── Override Dialog (Super Admin) ── */}
      {overrideDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOverrideDialog(null)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Override Leave Request</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Customize dates and manually split paid leaves and LOP.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[65vh] overflow-y-auto">
              {/* Left Column: Form Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={overrideFields.start_date}
                      onChange={(e) => handleDateChange("start_date", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={overrideFields.end_date}
                      onChange={(e) => handleDateChange("end_date", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Custom Allocation Split</h3>
                  <p className="text-xs text-slate-500 mb-4">Original auto-calculated total: <span className="font-bold text-slate-900 dark:text-white">{autoTotalDays} day(s)</span></p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">Paid Casual Leave</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrideFields.paid_casual_leave}
                        onChange={(e) => setOverrideFields((f) => ({ ...f, paid_casual_leave: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm text-center rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">Paid Sick Leave</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrideFields.paid_sick_leave}
                        onChange={(e) => setOverrideFields((f) => ({ ...f, paid_sick_leave: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm text-center rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">Loss of Pay (LOP)</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={overrideFields.lop_days}
                        onChange={(e) => setOverrideFields((f) => ({ ...f, lop_days: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm text-center rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Reason for Override *</label>
                  <textarea
                    rows={2}
                    value={overrideFields.remarks}
                    onChange={(e) => setOverrideFields((f) => ({ ...f, remarks: e.target.value }))}
                    placeholder="Provide a reason for overriding this allocation..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder:text-slate-400 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Right Column: Before-and-After Summary Panel */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Before-and-After Summary</h3>

                {recalcLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Recalculating...</span>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* Original Calculation */}
                    <div className="space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                      <p className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 text-[10px]">Original Calculation</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Dates:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{fmtDate(overrideDialog.original_start_date)} – {fmtDate(overrideDialog.original_end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Total Leave:</span>
                        <span className="text-slate-900 dark:text-white font-bold">{overrideDialog.original_days} day(s)</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
                        <span>Paid Casual Leave:</span>
                        <span>{overrideDialog.original_paid_cl}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
                        <span>Paid Sick Leave:</span>
                        <span>{overrideDialog.original_paid_sl}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">
                        <span>Loss of Pay (LOP):</span>
                        <span>{overrideDialog.original_lop}</span>
                      </div>
                    </div>

                    {/* Override Calculation */}
                    <div className="space-y-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5">
                      <p className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1 text-[10px]">Override Calculation</p>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Dates:</span>
                        <span className="text-slate-900 dark:text-white font-medium">{fmtDate(overrideFields.start_date)} – {fmtDate(overrideFields.end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Total Leave:</span>
                        <span className="text-purple-700 dark:text-purple-300 font-bold">{overrideTotalDays} day(s)</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600 dark:text-slate-400 border-l border-purple-200 dark:border-purple-800">
                        <span>Paid Casual Leave:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{overrideFields.paid_casual_leave}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600 dark:text-slate-400 border-l border-purple-200 dark:border-purple-800">
                        <span>Paid Sick Leave:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{overrideFields.paid_sick_leave}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-slate-600 dark:text-slate-400 border-l border-purple-200 dark:border-purple-800">
                        <span>Loss of Pay (LOP):</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{overrideFields.lop_days}</span>
                      </div>
                    </div>

                    {/* Impact on Balances */}
                    <div className="space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                      <p className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 text-[10px]">Leave Balances Impact</p>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Casual Leave Balance</p>
                          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                            {currentBalances.cl} <span className="text-slate-400 font-normal">→</span> <span className="text-slate-900 dark:text-white font-bold">{Math.max(0, currentBalances.cl - overrideFields.paid_casual_leave)}</span>
                          </p>
                          {currentBalances.cf > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              ({currentBalances.reg_cl} Reg + {currentBalances.cf} Carry-Fwd)
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Sick Leave Balance</p>
                          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                            {currentBalances.sl} <span className="text-slate-400 font-normal">→</span> <span className="text-slate-900 dark:text-white font-bold">{Math.max(0, currentBalances.sl - overrideFields.paid_sick_leave)}</span>
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
              <div className="mx-6 mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️ The sum of split days ({overrideTotalDays}) cannot exceed the total leave count for this date range ({autoTotalDays}).</span>
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => setOverrideDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitOverride}
                disabled={actionLoading || recalcLoading || !overrideFields.remarks.trim() || overrideTotalDays > autoTotalDays}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Apply Override & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
