"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Calendar, Clock, CheckCircle, XCircle, Loader2, Home,
  ArrowRight, ArrowLeft, Send, ChevronRight, X, Sparkles, Plus,
  Check, Users, User, Trash2
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";

/* ─── Constants ─────────────────────────────────────────────────── */
const DURATION_OPTIONS = [
  { value: "Full",           label: "Full Day WFH",               icon: "🏠", desc: "Work from home the entire day" },
  { value: "Half-Morning",   label: "Half Day – Morning Session",  icon: "🌅", desc: "Remote during morning session only" },
  { value: "Half-Afternoon", label: "Half Day – Afternoon Session",icon: "🌇", desc: "Remote during afternoon session only" },
];

const STEPS = [
  { id: 1, title: "WFH Type",   desc: "Choose your session" },
  { id: 2, title: "Date Range", desc: "Select the date(s)" },
  { id: 3, title: "Reason",     desc: "Describe your tasks" },
  { id: 4, title: "Review",     desc: "Confirm & submit" },
];

const formSchema = z.object({
  duration_type: z.enum(["Full", "Half-Morning", "Half-Afternoon"]),
  start_date: z.string().min(1, "Date is required"),
  end_date: z.string().optional(),
  reason: z.string().min(5, "Please provide at least 5 characters"),
});
type FormValues = z.infer<typeof formSchema>;

/* ─── Helpers ───────────────────────────────────────────────────── */
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

/* ─── Step Progress Bar ──────────────────────────────────────────── */
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done    = current > s.id;
        const active  = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "bg-amber-500 border-amber-500 text-white shadow-sm" :
                         "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-[11px] font-bold leading-tight ${active ? "text-amber-600 dark:text-amber-400" : done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{s.title}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{s.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 rounded transition-all duration-300 ${done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function WfhPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isTeamLead = user?.role === "Team Lead";

  // Views: "team" (Team / All requests), "my" (Personal requests), "apply" (Submit WFH)
  const [activeView, setActiveView]             = useState<"team" | "my" | "apply">(() => {
    if (isSuperAdmin || isTeamLead) return "team";
    return "my";
  });

  const [requests, setRequests]                 = useState<any[]>([]);
  const [pagination, setPagination]             = useState<any>(null);
  const [currentPage, setCurrentPage]           = useState(1);
  const [isLoading, setIsLoading]               = useState(true);
  const [cancellingId, setCancellingId]         = useState<number | null>(null);
  const [actionLoading, setActionLoading]       = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [submitSuccess, setSubmitSuccess]       = useState(false);
  const [successMessage, setSuccessMessage]     = useState<string | null>(null);
  const [wfhWarning, setWfhWarning]             = useState<string | null>(null);
  const [step, setStep]                         = useState(1);

  // Reject dialog state
  const [rejectDialogId, setRejectDialogId]     = useState<number | null>(null);
  const [rejectReason, setRejectReason]         = useState("");

  // Filters
  const [filterStatus, setFilterStatus]         = useState<string>("");
  const [filterDuration, setFilterDuration]     = useState<string>("");
  const [filterFromDate, setFilterFromDate]     = useState<string>("");
  const [filterToDate, setFilterToDate]         = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { duration_type: "Full", start_date: "", end_date: "", reason: "" },
  });

  const durationType = form.watch("duration_type");
  const startDate    = form.watch("start_date");
  const endDate      = form.watch("end_date");
  const reason       = form.watch("reason");
  const isHalfDay    = durationType !== "Full";
  const chosenOpt    = DURATION_OPTIONS.find(o => o.value === durationType) || DURATION_OPTIONS[0];

  useEffect(() => {
    fetchRequests(currentPage);
  }, [currentPage, filterStatus, filterDuration, filterFromDate, filterToDate]);

  useEffect(() => {
    if (isHalfDay && startDate) form.setValue("end_date", startDate);
  }, [durationType, startDate]);

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
    if (!confirm("Are you sure you want to cancel this pending WFH request?")) return;
    setCancellingId(id);
    try {
      await api.post(`/wfh-requests/${id}/cancel`);
      setSuccessMessage("WFH request cancelled successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchRequests(currentPage);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to cancel WFH request.");
    } finally {
      setCancellingId(null);
    }
  };

  /* ── Step navigation ── */
  const nextStep = async () => {
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      const ok = await form.trigger("start_date");
      if (!ok) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      const ok = await form.trigger("reason");
      if (!ok) return;
      setStep(4);
      return;
    }
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  /* ── Submit ── */
  async function onSubmit(values: FormValues) {
    const today      = new Date();
    const todayStr   = today.toISOString().split("T")[0];
    if (values.start_date === todayStr && !isSuperAdmin) {
      const totalMin       = today.getHours() * 60 + today.getMinutes();
      const cutoffMorning  = 9 * 60 + 45;
      const cutoffAfternoon = 14 * 60 + 30;
      if ((values.duration_type === "Full" || values.duration_type === "Half-Morning") && totalMin > cutoffMorning) {
        setWfhWarning(
          values.duration_type === "Full"
            ? "⏰ You cannot apply for a Full Day WFH after 9:45 AM.\n\nSame-day Full Day WFH applications must be submitted before 9:45 AM."
            : "⏰ You cannot apply for a Morning Session WFH after 9:45 AM.\n\nSame-day Morning WFH applications must be submitted before 9:45 AM."
        );
        return;
      }
      if (values.duration_type === "Half-Afternoon" && totalMin > cutoffAfternoon) {
        setWfhWarning("⏰ You cannot apply for an Afternoon Session WFH after 2:30 PM.\n\nSame-day Afternoon WFH applications must be submitted before 2:30 PM.");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      await api.post("/wfh-requests", {
        duration_type: values.duration_type,
        start_date: values.start_date,
        end_date: isHalfDay ? values.start_date : (values.end_date || values.start_date),
        reason: values.reason,
      });
      form.reset({ duration_type: "Full", start_date: "", end_date: "", reason: "" });
      setStep(1);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      fetchRequests(1);
      setActiveView(isSuperAdmin || isTeamLead ? "team" : "my");
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      const msg  = errs ? Object.values(errs).flat().join("\n") : e.response?.data?.message || "An error occurred.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

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

    let pendingText = "Pending";
    if (req.tl_status === "Pending") pendingText = "Pending TL";
    else if (req.admin_status === "Pending") pendingText = "Pending Admin";

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> {pendingText}
      </span>
    );
  };

  const pendingCount = requests.filter(r => r.status === "Pending").length;

  // Filter requests based on active view tab
  const displayedRequests = activeView === "my"
    ? requests.filter(r => (r.user_id === user?.id || r.user?.id === user?.id))
    : requests;

  return (
    <div className="space-y-7 max-w-6xl mx-auto">

      {/* ── Warning Modal ─────────────────────────────────────────── */}
      {wfhWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Application Not Allowed</h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Same-Day WFH Time Restriction</p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-5">
              {wfhWarning.split("\n\n").map((line, i) => (
                <p key={i} className={`text-sm ${i === 0 ? "font-bold text-red-700 dark:text-red-300 mb-2" : "text-slate-700 dark:text-slate-300"}`}>{line}</p>
              ))}
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5 mb-5 space-y-1.5 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">📋 Same-Day WFH Cutoff Rules</p>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                Full Day / Morning — apply before <span className="font-bold text-slate-900 dark:text-white ml-1">9:45 AM</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                Afternoon Session — apply before <span className="font-bold text-slate-900 dark:text-white ml-1">2:30 PM</span>
              </div>
            </div>
            <button onClick={() => setWfhWarning(null)} className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors cursor-pointer">
              Got it, I&apos;ll apply in advance next time
            </button>
          </div>
        </div>
      )}

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
          {(isSuperAdmin || isTeamLead) && (
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
                {isSuperAdmin ? "All Requests" : "Team Requests"}
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

          {!isSuperAdmin && (
            <button
              onClick={() => setActiveView(activeView === "apply" ? (isTeamLead ? "team" : "my") : "apply")}
              className={`px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeView === "apply"
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white"
              }`}
            >
              {activeView === "apply" ? (
                <>View Requests List</>
              ) : (
                <><Plus className="w-4 h-4" /> Request WFH</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Multi-Step Apply Form (When toggled) ───────────────────── */}
      {activeView === "apply" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xs animate-in fade-in duration-300">
          {submitSuccess && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold">WFH Request Submitted!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-0.5">Awaiting approval from your Team Lead and Admin.</p>
              </div>
            </div>
          )}

          <StepBar current={step} />

          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 1 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Choose WFH Type</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Select the session you want to work from home</p>
                </div>
                {DURATION_OPTIONS.map((opt) => {
                  const selected = durationType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setValue("duration_type", opt.value as FormValues["duration_type"])}
                      className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group cursor-pointer ${
                        selected
                          ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="text-3xl">{opt.icon}</span>
                      <div className="flex-1">
                        <p className={`font-bold text-base ${selected ? "text-amber-800 dark:text-amber-300" : "text-slate-900 dark:text-white"}`}>{opt.label}</p>
                        <p className={`text-sm mt-0.5 ${selected ? "text-amber-700/90 dark:text-amber-400/90" : "text-slate-600 dark:text-slate-400"}`}>{opt.desc}</p>
                      </div>
                      {selected
                        ? <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        : <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Date{isHalfDay ? "" : " Range"}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {isHalfDay ? "Pick the date for your half-day WFH" : "Choose the start and end dates"}
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl mb-6">
                  <span className="text-2xl">{chosenOpt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{chosenOpt.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{chosenOpt.desc}</p>
                  </div>
                </div>

                {isHalfDay ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Date *</label>
                    <input
                      type="date"
                      {...form.register("start_date")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors"
                    />
                    {form.formState.errors.start_date && <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.start_date.message}</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">From *</label>
                      <input
                        type="date"
                        {...form.register("start_date")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors"
                      />
                      {form.formState.errors.start_date && <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.start_date.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">To</label>
                      <input
                        type="date"
                        {...form.register("end_date")}
                        min={startDate || undefined}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">⏰ Same-Day Cutoff Times</p>
                  <p>Full Day / Morning Session → apply before <strong>9:45 AM</strong></p>
                  <p>Afternoon Session → apply before <strong>2:30 PM</strong></p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Describe Your Tasks</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tell your manager what you&apos;ll be working on</p>
                </div>
                <textarea
                  rows={6}
                  {...form.register("reason")}
                  placeholder="e.g. Working on the Q3 report, attending online client calls, fixing critical bugs on the production server…"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 placeholder:text-slate-400 resize-none transition-colors"
                />
                {form.formState.errors.reason && <p className="text-xs text-red-500 mt-1.5">{form.formState.errors.reason.message}</p>}
                <p className="text-xs text-slate-500 mt-2">{reason?.length || 0} characters (minimum 5)</p>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Submit</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Confirm your WFH request details before submitting</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{chosenOpt.icon}</span>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">WFH Type</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{chosenOpt.label}</p>
                      </div>
                    </div>
                    <DurationBadge type={durationType} />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Date</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {startDate ? fmtDate(startDate) : "—"}
                        {!isHalfDay && endDate && endDate !== startDate && <> → {fmtDate(endDate)}</>}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">Reason / Tasks</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{reason || "—"}</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
                  <p className="font-bold text-blue-900 dark:text-blue-200">🔐 Dual Approval Required</p>
                  <p>Your request goes to your <strong>Team Lead</strong> first. After TL approval, the <strong>Super Admin</strong> gives the final decision. WFH is granted only when <strong>both</strong> approve.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit WFH Request</>}
                </button>
              </div>
            )}

            <div className={`flex mt-8 gap-3 ${step === 1 ? "justify-end" : "justify-between"}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < 4 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors ml-auto cursor-pointer shadow-sm"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
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
                  {(isSuperAdmin || isTeamLead) && activeView !== "my" && (
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
                    {(isSuperAdmin || isTeamLead) && activeView !== "my" && (
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
                    const isHalf = req.duration_type !== "Full";
                    const daysVal = isHalf ? "0.5" : "1.0";
                    const isOwnRequest = (req.user_id === user?.id || req.user?.id === user?.id);

                    // Check if current user can approve this request
                    const canApproveRow = (isSuperAdmin && req.status === "Pending") ||
                      (isTeamLead && !isOwnRequest && req.tl_status === "Pending" && req.status === "Pending");

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {(isSuperAdmin || isTeamLead) && activeView !== "my" && (
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
                          {daysVal}
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

    </div>
  );
}
