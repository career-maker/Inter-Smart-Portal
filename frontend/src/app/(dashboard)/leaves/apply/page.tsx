"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Loader2, Link2 } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

export default function ApplyLeavePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveMetrics, setLeaveMetrics] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachmentLink, setAttachmentLink] = useState("");

  const [impact, setImpact] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (user?.role === "Super Admin") router.replace("/leaves");
  }, [user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const typeRes = await api.get("/leave-types");
        const types = (typeRes.data?.data || []).filter((t: any) => {
          const n = t.name?.toLowerCase() || "";
          return !n.includes("wfh") && !n.includes("work from home");
        });
        setLeaveTypes(types.length ? types : [
          { id: 1, name: "Sick Leave" },
          { id: 2, name: "Casual Leave" },
        ]);
      } catch {
        setLeaveTypes([{ id: 1, name: "Sick Leave" }, { id: 2, name: "Casual Leave" }]);
      }
      try {
        const balRes = await api.get("/leave-balances");
        const d = balRes.data?.data;
        setLeaveMetrics(d ? {
          casual_leave_balance: d.casual_leave_balance || 0,
          cl_carry_forward: d.cl_carry_forward || 0,
          sick_leave_balance: d.sick_leave_balance || 0,
          total_leaves_taken: d.total_leaves_taken || 0,
        } : { casual_leave_balance: 0, cl_carry_forward: 0, sick_leave_balance: 0, total_leaves_taken: 0 });
      } catch {
        setLeaveMetrics({ casual_leave_balance: 0, cl_carry_forward: 0, sick_leave_balance: 0, total_leaves_taken: 0 });
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!leaveTypeId || !startDate || !endDate) { setImpact(null); return; }
    const t = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const res = await api.post("/leaves/calculate", { leave_type_id: leaveTypeId, start_date: startDate, end_date: endDate });
        setImpact(res.data);
      } catch { setImpact(null); }
      finally { setIsCalculating(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [leaveTypeId, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) return;
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setIsLoading(true);
    setShowConfirm(false);
    try {
      await api.post("/leave-requests", {
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
        ...(attachmentLink.trim() ? { attachment_link: attachmentLink.trim() } : {}),
      });
      window.dispatchEvent(new Event("notifications-refresh"));
      router.push("/leaves");
    } catch (e: any) {
      alert(e.response?.data?.message || "An error occurred while submitting the request.");
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const selectedType = leaveTypes.find(t => t.id.toString() === leaveTypeId?.toString());

  const inputCls = "w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors [color-scheme:dark]";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leaves" className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Apply for Leave</h1>
          <p className="text-slate-300">Submit a time-off request for approval.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* Balance strip */}
        {leaveMetrics && (() => {
          const typeName = selectedType?.name?.toLowerCase() || "";
          const isCasualSelected = typeName.includes("casual");
          const isSickSelected   = typeName.includes("sick");
          const afterCL = impact?.balance?.after_casual ?? leaveMetrics.casual_leave_balance;
          const afterSL = impact?.balance?.after_sick   ?? leaveMetrics.sick_leave_balance;
          return (
            <div className="mb-6 grid grid-cols-3 gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className={`text-center rounded-xl p-2 transition-all ${isCasualSelected ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""}`}>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Casual Leave</p>
                <p className="text-2xl font-black text-emerald-400">{leaveMetrics.casual_leave_balance}</p>
                {isCasualSelected && impact?.balance && (
                  <p className="text-xs text-slate-400 mt-0.5">→ <span className="text-emerald-300 font-bold">{afterCL}</span> after</p>
                )}
              </div>
              <div className={`text-center border-l border-white/10 rounded-xl p-2 transition-all ${isSickSelected ? "bg-rose-500/10 ring-1 ring-rose-500/40" : ""}`}>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Sick Leave</p>
                <p className="text-2xl font-black text-rose-400">{leaveMetrics.sick_leave_balance}</p>
                {isSickSelected && impact?.balance && (
                  <p className="text-xs text-slate-400 mt-0.5">→ <span className="text-rose-300 font-bold">{afterSL}</span> after</p>
                )}
              </div>
              <div className="text-center border-l border-white/10 p-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Taken</p>
                <p className="text-2xl font-black text-indigo-400">{leaveMetrics.total_leaves_taken}</p>
              </div>
            </div>
          );
        })()}

        <div className="bg-slate-800/80 border border-white/10 rounded-2xl">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold text-white">Leave Application Form</h2>
            <p className="text-slate-400 text-sm mt-1">Your request will be sent for approval.</p>
          </div>
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 mt-4">

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Leave Type *</label>
              <select value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} required className={inputCls}>
                <option value="" disabled className="bg-slate-700 text-slate-400">Select leave type...</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id.toString()} className="bg-slate-700 text-white">{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Start Date *</label>
                <input type="date" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">End Date *</label>
                <input type="date" value={endDate} min={startDate || today} onChange={e => setEndDate(e.target.value)} required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Reason *</label>
              <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} required placeholder="Please provide a detailed reason..." className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5" /> Supporting Attachment Link <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input type="url" value={attachmentLink} onChange={e => setAttachmentLink(e.target.value)} placeholder="Paste a Google Drive, OneDrive, Dropbox, or any document URL..." className={inputCls} />
              <p className="text-xs text-slate-500 mt-1">Medical certificate, hospital report, travel ticket, etc.</p>
            </div>

            {/* ── Leave Summary ── */}
            {isCalculating && (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculating leave impact...
              </div>
            )}
            {impact && !impact.is_probation && (
              <LeaveSummaryCard impact={impact} />
            )}
            {impact?.is_probation && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-orange-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Probation Period Notice
                </p>
                <p className="text-sm text-slate-300 mt-1">{impact.unpaid_reason}</p>
              </div>
            )}

            <div className="flex justify-end gap-4 border-t border-white/10 pt-5">
              <button type="button" onClick={() => router.push("/leaves")} className="px-5 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading || !leaveTypeId || !startDate || !endDate || !reason.trim()} className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors">
                {isLoading ? "Submitting..." : "Review & Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Confirmation Popup ── */}
      {showConfirm && impact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-lg bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Confirm Leave Request</h2>
              <p className="text-slate-400 text-sm mt-0.5">Review your leave calculation before submitting.</p>
            </div>
            <div className="px-6 py-5">
              <LeaveSummaryCard impact={impact} compact />
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-400 mb-2">Leave Type: <span className="text-white">{selectedType?.name}</span> &nbsp;·&nbsp; {startDate} → {endDate}</p>
                {attachmentLink && (
                  <p className="text-xs text-slate-400">Attachment: <a href={attachmentLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{attachmentLink}</a></p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={confirmSubmit} disabled={isLoading} className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Leave Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaveSummaryCard({ impact, compact = false }: { impact: any; compact?: boolean }) {
  const hasLOP = impact.total_lop_days > 0;
  const isPaid = !hasLOP;

  const borderCls = impact.is_unpaid
    ? "border-red-500/30 bg-red-500/5"
    : impact.is_partial
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-emerald-500/30 bg-emerald-500/5";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${borderCls}`}>
      <h4 className="font-bold text-white text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" /> Leave Summary
      </h4>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <SummaryRow label="Requested Leave Days" value={impact.requested_working_days} />
        {impact.sandwich_leave_days > 0 && (
          <SummaryRow label="Sandwich Days" value={impact.sandwich_leave_days} sub="(weekends/holidays within leave)" />
        )}
        <SummaryRow label="Total Leave Days" value={impact.actual_leave_days} bold />
      </div>

      <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {impact.paid_casual_leave > 0 && (
          <SummaryRow label="Paid Casual Leave" value={`${impact.paid_casual_leave} Days`} color="text-emerald-400" />
        )}
        {impact.paid_sick_leave > 0 && (
          <SummaryRow label="Paid Sick Leave" value={`${impact.paid_sick_leave} Days`} color="text-emerald-400" />
        )}
        {impact.total_lop_days > 0 && (
          <div className="col-span-2">
            <SummaryRow label="Unpaid Leave (LOP)" value={`${impact.total_lop_days} Days`} color="text-red-400" bold />
            {impact.penalty_lop_days > 0 && (
              <p className="text-xs text-slate-500 mt-0.5 pl-2">• {impact.penalty_lop_days} day(s) — Late application penalty</p>
            )}
            {impact.balance_lop_days > 0 && (
              <p className="text-xs text-slate-500 mt-0.5 pl-2">• {impact.balance_lop_days} day(s) — Insufficient balance</p>
            )}
            {impact.sandwich_leave_days > 0 && (
              <p className="text-xs text-slate-500 mt-0.5 pl-2">• {impact.sandwich_leave_days} day(s) — Sandwich days</p>
            )}
          </div>
        )}
      </div>

      {/* Reason(s) for LOP — shown immediately after breakdown when there is LOP */}
      {impact.total_lop_days > 0 && (
        <div className="border-t border-red-500/20 pt-3 bg-red-500/5 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1.5">Why is this LOP?</p>
          {impact.reasons && impact.reasons.length > 0 ? (
            <ul className="space-y-1">
              {impact.reasons.map((r: string, i: number) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span> {r}
                </li>
              ))}
            </ul>
          ) : impact.unpaid_reason ? (
            <p className="text-xs text-slate-300">{impact.unpaid_reason}</p>
          ) : (
            <p className="text-xs text-slate-300">This leave type does not have a paid balance. All days will be deducted as Loss of Pay.</p>
          )}
        </div>
      )}

      {/* Status */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
        <p className={`font-bold text-sm ${impact.is_unpaid ? "text-red-400" : impact.is_partial ? "text-amber-400" : "text-emerald-400"}`}>
          {impact.status_text || (impact.is_unpaid ? "Unpaid Leave (LOP)" : impact.is_partial ? "Partially Paid + LOP" : "Paid Leave")}
        </p>
      </div>

      {/* Balance after */}
      {impact.balance && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Balance After Approval</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-400">Remaining Casual Leave:</span>
            <span className="text-white font-bold">{impact.balance.after_casual} Days</span>
            <span className="text-slate-400">Remaining Sick Leave:</span>
            <span className="text-white font-bold">{impact.balance.after_sick} Days</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, sub, color, bold }: { label: string; value: any; sub?: string; color?: string; bold?: boolean }) {
  return (
    <>
      <span className="text-slate-400">{label}{sub && <span className="text-slate-500 text-xs"> {sub}</span>}:</span>
      <span className={`font-semibold ${color || "text-white"} ${bold ? "font-black" : ""}`}>{value}</span>
    </>
  );
}
