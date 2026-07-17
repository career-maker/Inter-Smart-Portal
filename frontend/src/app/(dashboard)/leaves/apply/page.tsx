"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Loader2, Link2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths 
} from "date-fns";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

const CalendarDatePicker = ({
  selectedDate,
  onSelect,
  minDate,
  disabledDates,
  holidayDates,
}: {
  selectedDate: string;
  onSelect: (dateStr: string) => void;
  minDate?: string;
  disabledDates: string[];
  holidayDates: string[];
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate) : new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDay = startOfMonth(currentMonth).getDay();
  const padding = Array.from({ length: firstDay });

  const handlePrev = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNext = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-3 max-w-sm w-full mx-auto select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={handlePrev} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{format(currentMonth, "MMMM yyyy")}</span>
        <button type="button" onClick={handleNext} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-300">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase mb-1">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {padding.map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const dStr = format(d, "yyyy-MM-dd");
          const isSelected = selectedDate === dStr;
          const isHoliday = holidayDates.includes(dStr);
          
          let isDisabled = false;
          if (minDate && dStr < minDate) isDisabled = true;
          const todayStr = format(new Date(), "yyyy-MM-dd");
          if (dStr < todayStr) isDisabled = true;
          if (disabledDates.includes(dStr)) isDisabled = true;

          let btnClass = "text-xs h-7 w-7 flex items-center justify-center rounded-lg transition-colors ";
          if (isSelected) {
            btnClass += "bg-amber-500 text-white font-bold";
          } else if (isDisabled) {
            btnClass += "text-slate-600 cursor-not-allowed opacity-30";
          } else if (isHoliday) {
            btnClass += "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30";
          } else {
            btnClass += "text-slate-200 hover:bg-white/10";
          }

          return (
            <button
              key={dStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(dStr)}
              className={btnClass}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function ApplyLeavePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveMetrics, setLeaveMetrics] = useState<any>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState("Half-Morning");
  const [reason, setReason] = useState("");
  const [attachmentLink, setAttachmentLink] = useState("");

  const [impact, setImpact] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [existingLeaves, setExistingLeaves] = useState<any[]>([]);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  const [holidays, setHolidays] = useState<any[]>([]);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

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
      } finally {
        setIsLoadingBalance(false);
      }
      try {
        const reqRes = await api.get("/leave-requests");
        setExistingLeaves(reqRes.data?.data?.data || []);
      } catch (err) {
        console.error("Failed to load existing requests", err);
      }
      try {
        const holRes = await api.get("/holidays");
        setHolidays(holRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load holidays", err);
      }
    };
    load();
  }, []);

  const appliedDates = existingLeaves.reduce((acc: string[], r: any) => {
    if (r.status !== "Approved" && r.status !== "Pending") return acc;
    let curr = new Date(r.start_date);
    const end = new Date(r.end_date);
    while (curr <= end) {
      acc.push(format(curr, "yyyy-MM-dd"));
      curr.setDate(curr.getDate() + 1);
    }
    return acc;
  }, []);

  const holidayDates = holidays.map((h: any) => h.date);

  useEffect(() => {
    if (!startDate) {
      setOverlapError(null);
      return;
    }
    const s = new Date(startDate);
    const e = new Date(endDate || startDate);

    const overlap = existingLeaves.find((r: any) => {
      if (r.status !== "Approved" && r.status !== "Pending") return false;
      const rs = new Date(r.start_date);
      const re = new Date(r.end_date);
      return (s <= re && e >= rs);
    });

    if (overlap) {
      const type = overlap.leave_type?.name || "leave";
      setOverlapError(`You have an overlapping ${type} request (${overlap.start_date} to ${overlap.end_date}) in this range.`);
    } else {
      setOverlapError(null);
    }
  }, [startDate, endDate, existingLeaves]);

  // Auto-fill end date when start date changes; also lock end date for half-day
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    // Always auto-fill end date to start date; for half-day this is the only allowed value
    setEndDate(val);
  };

  const handleLeaveTypeChange = (val: string) => {
    setLeaveTypeId(val);
    const type = leaveTypes.find((t: any) => t.id.toString() === val);
    const name = type?.name?.toLowerCase() || "";
    if (name.includes("half")) {
      if (startDate) {
        setEndDate(startDate);
      }
      if (name.includes("morning")) {
        setDurationType("Half-Morning");
      } else if (name.includes("afternoon")) {
        setDurationType("Half-Afternoon");
      }
    }
  };

  useEffect(() => {
    if (!leaveTypeId || !startDate || !endDate) { setImpact(null); return; }
    const t = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const payload: any = { leave_type_id: leaveTypeId, start_date: startDate, end_date: endDate };
        const type = leaveTypes.find((t: any) => t.id.toString() === leaveTypeId?.toString());
        const name = type?.name?.toLowerCase() || "";
        if (name.includes("half")) {
          if (name.includes("morning")) {
            payload.duration_type = "Half-Morning";
          } else if (name.includes("afternoon")) {
            payload.duration_type = "Half-Afternoon";
          } else {
            payload.duration_type = durationType;
          }
        }
        const res = await api.post("/leaves/calculate", payload);
        setImpact(res.data);
      } catch (error: any) {
        // If there's an error (like overlap), show it in the impact
        if (error.response?.status === 422) {
          setImpact({ error: error.response.data?.message || "Invalid date range for leave" });
        } else {
          setImpact(null);
        }
      }
      finally { setIsCalculating(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [leaveTypeId, startDate, endDate, durationType, leaveTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) return;
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setIsLoading(true);
    setShowConfirm(false);
    try {
      const payload: any = {
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
        ...(attachmentLink.trim() ? { attachment_link: attachmentLink.trim() } : {}),
      };
      const type = leaveTypes.find((t: any) => t.id.toString() === leaveTypeId?.toString());
      const name = type?.name?.toLowerCase() || "";
      if (name.includes("half")) {
        if (name.includes("morning")) {
          payload.duration_type = "Half-Morning";
        } else if (name.includes("afternoon")) {
          payload.duration_type = "Half-Afternoon";
        } else {
          payload.duration_type = durationType;
        }
      }
      await api.post("/leave-requests", payload);

      // Try to refresh notifications, but don't let it break the success flow
      try {
        window.dispatchEvent(new Event("notifications-refresh"));
      } catch (e) {
        console.warn("Failed to dispatch notifications-refresh event:", e);
      }

      setShowSuccess(true);
      setIsLoading(false);
    } catch (e: any) {
      alert(e.response?.data?.message || "An error occurred while submitting the request.");
      setIsLoading(false);
    }
  };

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const selectedType = leaveTypes.find((t: any) => t.id.toString() === leaveTypeId?.toString());
  const isHalfDayType = selectedType?.name?.toLowerCase().includes("half");
  const isMorningOrAfternoonSpecified = selectedType?.name?.toLowerCase().includes("morning") || selectedType?.name?.toLowerCase().includes("afternoon");
  const showDurationSelector = isHalfDayType && !isMorningOrAfternoonSpecified;

  const inputCls = "w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 transition-colors [color-scheme:dark]";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leaves" className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Apply for Leave</h1>
          <p className="text-slate-600 dark:text-slate-300">Submit a time-off request for approval.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* Balance strip */}
        {isLoadingBalance ? (
          <div className="mb-6 bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">Loading leave balance...</p>
          </div>
        ) : leaveMetrics && (() => {
          const typeName = selectedType?.name?.toLowerCase() || "";
          const isCasualSelected = typeName.includes("casual");
          const isSickSelected   = typeName.includes("sick");
          const afterCL = impact?.balance?.after_casual ?? leaveMetrics.casual_leave_balance;
          const afterSL = impact?.balance?.after_sick   ?? leaveMetrics.sick_leave_balance;
          return (
            <div className="mb-6 grid grid-cols-3 gap-3 bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
              <div className={`text-center rounded-xl p-2 transition-all ${isCasualSelected ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""}`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Casual Leave</p>
                <p className="text-2xl font-black text-emerald-400">{Math.max(0, leaveMetrics.casual_leave_balance) + Math.max(0, leaveMetrics.cl_carry_forward || 0)}</p>
                {Math.max(0, leaveMetrics.cl_carry_forward || 0) > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">{Math.max(0, leaveMetrics.cl_carry_forward)} carry-fwd</p>
                )}
                {isCasualSelected && impact?.balance && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">→ <span className="text-emerald-300 font-bold">{Math.max(0, afterCL)}</span> after</p>
                )}
              </div>
              <div className={`text-center border-l border-slate-200 dark:border-white/10 rounded-xl p-2 transition-all ${isSickSelected ? "bg-rose-500/10 ring-1 ring-rose-500/40" : ""}`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sick Leave</p>
                <p className="text-2xl font-black text-rose-400">{Math.max(0, leaveMetrics.sick_leave_balance)}</p>
                {isSickSelected && impact?.balance && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">→ <span className="text-rose-300 font-bold">{Math.max(0, afterSL)}</span> after</p>
                )}
              </div>
              <div className="text-center border-l border-slate-200 dark:border-white/10 p-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Taken</p>
                <p className="text-2xl font-black text-indigo-400">{Math.max(0, leaveMetrics.total_leaves_taken)}</p>
              </div>
            </div>
          );
        })()}

        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Leave Application Form</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your request will be sent for approval.</p>
          </div>
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 mt-4">

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Leave Type *</label>
              <select value={leaveTypeId} onChange={e => handleLeaveTypeChange(e.target.value)} required className={inputCls}>
                <option value="" disabled className="bg-slate-700 text-slate-500 dark:text-slate-400">Select leave type...</option>
                {leaveTypes.map(t => (
                  <option key={t.id} value={t.id.toString()} className="bg-slate-700 text-slate-900 dark:text-white">{t.name}</option>
                ))}
              </select>
            </div>

            {showDurationSelector && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Duration (Half Day) *</label>
                <select value={durationType} onChange={e => setDurationType(e.target.value)} required className={inputCls}>
                  <option value="Half-Morning">Morning Half</option>
                  <option value="Half-Afternoon">Afternoon Half</option>
                </select>
              </div>
            )}

            {/* Custom Popover Date Pickers (resolves native calendar limitation & disables applied dates) */}
            <div className={isHalfDayType ? "" : "grid grid-cols-2 gap-4"}>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Start Date *</label>
                <button
                  type="button"
                  onClick={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }}
                  className={`${inputCls} flex items-center justify-between text-left cursor-pointer`}
                >
                  <span className={startDate ? "text-white" : "text-slate-400"}>
                    {startDate ? format(new Date(startDate), "dd MMM yyyy") : "Choose date..."}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
                {showStartCalendar && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStartCalendar(false)} />
                    <div className="absolute left-0 mt-2 z-50 shadow-2xl">
                      <CalendarDatePicker
                        selectedDate={startDate}
                        onSelect={(date) => {
                          handleStartDateChange(date);
                          setShowStartCalendar(false);
                        }}
                        disabledDates={appliedDates}
                        holidayDates={holidayDates}
                      />
                    </div>
                  </>
                )}
              </div>
              {!isHalfDayType && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">End Date *</label>
                  <button
                    type="button"
                    disabled={!startDate}
                    onClick={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }}
                    className={`${inputCls} flex items-center justify-between text-left disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <span className={endDate ? "text-white" : "text-slate-400"}>
                      {endDate ? format(new Date(endDate), "dd MMM yyyy") : "Choose date..."}
                    </span>
                    <CalendarIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                  {showEndCalendar && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEndCalendar(false)} />
                      <div className="absolute right-0 mt-2 z-50 shadow-2xl">
                        <CalendarDatePicker
                          selectedDate={endDate}
                          onSelect={(date) => {
                            setEndDate(date);
                            setShowEndCalendar(false);
                          }}
                          minDate={startDate}
                          disabledDates={appliedDates}
                          holidayDates={holidayDates}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Reason *</label>
              <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} required placeholder="Please provide a detailed reason..." className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5" /> Supporting Attachment Link <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input type="url" value={attachmentLink} onChange={e => setAttachmentLink(e.target.value)} placeholder="Paste a Google Drive, OneDrive, Dropbox, or any document URL..." className={inputCls} />
              <p className="text-xs text-slate-500 mt-1">Medical certificate, hospital report, travel ticket, etc.</p>
            </div>

            {/* ── Leave Summary ── */}
            <div className="space-y-5">
              {isCalculating && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
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
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{impact.unpaid_reason}</p>
                </div>
              )}

              {overlapError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-rose-300 font-semibold">Overlapping Leave Request</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{overlapError}</p>
                  </div>
                </div>
              )}

              {/* Pure CSS sticky action bar at bottom on mobile, inline on desktop */}
              <div className="sticky bottom-0 left-0 right-0 -mx-6 -mb-6 p-4 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 z-40 flex justify-end gap-4 md:relative md:bottom-auto md:left-auto md:right-auto md:mx-0 md:mb-0 md:p-0 md:bg-transparent md:backdrop-blur-none md:border-none md:z-auto md:pt-5">
                <button type="button" onClick={() => router.push("/leaves")} className="px-5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading || !leaveTypeId || !startDate || !endDate || !reason.trim() || !!overlapError} className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors">
                  {isLoading ? "Submitting..." : "Review & Submit"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Confirmation Popup ── */}
      {showConfirm && impact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Leave Request</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Review your leave calculation before submitting.</p>
            </div>
            <div className="px-6 py-5">
              <LeaveSummaryCard impact={impact} compact />
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Leave Type: <span className="text-slate-900 dark:text-white">{selectedType?.name}</span> &nbsp;·&nbsp; {startDate} → {endDate}</p>
                {attachmentLink && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attachment: <a href={attachmentLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{attachmentLink}</a></p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
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

      {/* ── Success Popup ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {}} />
          <div className="relative w-full max-w-md bg-gradient-to-br from-white dark:from-slate-800 to-slate-50 dark:to-slate-900 border border-emerald-500/20 rounded-2xl shadow-2xl z-10 overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 animate-pulse" />

            <div className="relative px-6 py-8 text-center space-y-4">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Applied Successfully!</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">Your leave request has been submitted for approval.</p>
              </div>

              {/* Details */}
              <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2 text-left mt-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Leave Type:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedType?.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Date Range:</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{startDate} to {endDate}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>
                  <span className="text-amber-300 font-semibold">Pending Approval</span>
                </div>
              </div>

              {/* Info message */}
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mt-6">
                📧 You'll receive an email notification once your request is reviewed by your Team Lead or Super Admin.
              </p>

              {/* Action Button */}
              <button
                onClick={() => {
                  setShowSuccess(false);
                  router.push("/leaves");
                }}
                className="w-full mt-6 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                View My Leaves
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

  // Show error if calculation failed
  if (impact.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" /> Unable to Calculate Leave
        </h4>
        <p className="text-sm text-red-300">{impact.error}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please select a different date range.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${borderCls}`}>
      <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" /> Leave Summary
      </h4>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <SummaryRow label="Requested Leave Days" value={impact.requested_working_days} />
        {impact.sandwich_leave_days > 0 && (
          <SummaryRow label="Sandwich Days" value={impact.sandwich_leave_days} sub="(weekends/holidays within leave)" />
        )}
        <SummaryRow label="Total Leave Days" value={impact.actual_leave_days} bold />
      </div>

      <div className="border-t border-slate-200 dark:border-white/10 pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
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
                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span> {r}
                </li>
              ))}
            </ul>
          ) : impact.unpaid_reason ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">{impact.unpaid_reason}</p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300">This leave type does not have a paid balance. All days will be deducted as Loss of Pay.</p>
          )}
        </div>
      )}

      {/* Status */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Status</p>
        <p className={`font-bold text-sm ${impact.is_unpaid ? "text-red-400" : impact.is_partial ? "text-amber-400" : "text-emerald-400"}`}>
          {impact.status_text || (impact.is_unpaid ? "Unpaid Leave (LOP)" : impact.is_partial ? "Partially Paid + LOP" : "Paid Leave")}
        </p>
      </div>

      {/* Balance after */}
      {impact.balance && (
        <div className="border-t border-slate-200 dark:border-white/10 pt-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Balance After Approval</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Remaining Casual Leave:</span>
            <span className="text-slate-900 dark:text-white font-bold">{impact.balance.after_casual} Days</span>
            <span className="text-slate-500 dark:text-slate-400">Remaining Sick Leave:</span>
            <span className="text-slate-900 dark:text-white font-bold">{impact.balance.after_sick} Days</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, sub, color, bold }: { label: string; value: any; sub?: string; color?: string; bold?: boolean }) {
  return (
    <>
      <span className="text-slate-500 dark:text-slate-400">{label}{sub && <span className="text-slate-500 text-xs"> {sub}</span>}:</span>
      <span className={`font-semibold ${color || "text-white"}  ${bold ? "font-black" : ""}`}>{value}</span>
    </>
  );
}
