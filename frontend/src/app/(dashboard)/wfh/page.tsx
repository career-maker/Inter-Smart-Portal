"use client";
import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Calendar, Clock, CheckCircle, XCircle, Loader2, Home,
  ArrowRight, ArrowLeft, Send, ChevronRight,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

/* ─── Constants ─────────────────────────────────────────────────── */
const DURATION_OPTIONS = [
  { value: "Full",           label: "Full Day WFH",              icon: "🏠", desc: "Work from home the entire day" },
  { value: "Half-Morning",   label: "Half Day – Morning Session", icon: "🌅", desc: "Remote during morning session only" },
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
    Full:             { cls: "bg-amber-500/20 text-amber-300",    label: "Full Day" },
    "Half-Morning":   { cls: "bg-sky-500/20 text-sky-300",        label: "Half – Morning" },
    "Half-Afternoon": { cls: "bg-violet-500/20 text-violet-300",  label: "Half – Afternoon" },
  };
  const m = map[type] ?? { cls: "bg-white/10 text-slate-300", label: type };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.cls}`}>{m.label}</span>;
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
                done   ? "bg-amber-500 border-amber-500 text-white" :
                active ? "bg-amber-500/20 border-amber-500 text-amber-300" :
                         "bg-white/5 border-white/10 text-slate-500"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              <div className="text-center hidden sm:block">
                <p className={`text-[11px] font-bold leading-tight ${active ? "text-amber-300" : done ? "text-slate-300" : "text-slate-600"}`}>{s.title}</p>
                <p className="text-[10px] text-slate-600">{s.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 rounded transition-all duration-300 ${done ? "bg-amber-500" : "bg-white/10"}`} />
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
  const [requests, setRequests]         = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [wfhWarning, setWfhWarning]     = useState<string | null>(null);
  const [step, setStep]                 = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { duration_type: "Full", start_date: "", end_date: "", reason: "" },
  });

  const durationType = form.watch("duration_type");
  const startDate    = form.watch("start_date");
  const endDate      = form.watch("end_date");
  const reason       = form.watch("reason");
  const isHalfDay    = durationType !== "Full";
  const chosenOpt    = DURATION_OPTIONS.find(o => o.value === durationType)!;

  useEffect(() => { fetchRequests(); }, []);
  useEffect(() => {
    if (isHalfDay && startDate) form.setValue("end_date", startDate);
  }, [durationType, startDate]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/wfh-requests");
      setRequests(res.data.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
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
    // ── Time-cutoff validation ────────────────────────────────────
    const today      = new Date();
    const todayStr   = today.toISOString().split("T")[0];
    if (values.start_date === todayStr) {
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
    // ─────────────────────────────────────────────────────────────

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
      fetchRequests();
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      const msg  = errs ? Object.values(errs).flat().join("\n") : e.response?.data?.message || "An error occurred.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Status helpers ── */
  const getStatusInfo = (req: any) => {
    if (req.status === "Approved")          return { label: "Approved",      cls: "bg-emerald-500/20 text-emerald-400" };
    if (req.status === "Rejected")          return { label: "Rejected",      cls: "bg-red-500/20 text-red-400" };
    if (req.tl_status === "Pending")        return { label: "Awaiting TL",   cls: "bg-amber-500/20 text-amber-400" };
    if (req.admin_status === "Pending")     return { label: "Awaiting Admin", cls: "bg-blue-500/20 text-blue-400" };
    return { label: "Pending", cls: "bg-amber-500/20 text-amber-400" };
  };
  const tlColor    = (s: string) => s === "Approved" || s === "Not Required" ? "text-emerald-400" : s === "Rejected" ? "text-red-400" : "text-amber-400";
  const adminColor = (s: string) => s === "Approved" || s === "Not Required" ? "text-emerald-400" : s === "Rejected" ? "text-red-400" : "text-blue-400";
  const statusIcon = (s: string) => s === "Approved" || s === "Not Required" ? <CheckCircle className="w-3 h-3" /> : s === "Rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />;

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* ── Warning Modal ─────────────────────────────────────────── */}
      {wfhWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] border border-red-500/40 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Application Not Allowed</h3>
                <p className="text-xs text-red-400 font-medium">Same-Day WFH Time Restriction</p>
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
              {wfhWarning.split("\n\n").map((line, i) => (
                <p key={i} className={`text-sm ${i === 0 ? "font-bold text-red-300 mb-2" : "text-slate-300"}`}>{line}</p>
              ))}
            </div>
            <div className="bg-white/5 rounded-xl p-3 mb-5 space-y-1.5">
              <p className="text-xs font-bold text-amber-400 mb-2">📋 Same-Day WFH Cutoff Rules</p>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                Full Day / Morning — apply before <span className="font-bold text-slate-900 dark:text-white ml-1">9:45 AM</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                Afternoon Session — apply before <span className="font-bold text-slate-900 dark:text-white ml-1">2:30 PM</span>
              </div>
            </div>
            <button onClick={() => setWfhWarning(null)} className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-sm border border-red-500/30 transition-colors">
              Got it, I'll apply in advance next time
            </button>
          </div>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Home className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Work From Home</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Submit and track your remote work requests</p>
        </div>
      </div>

      {/* ── Step Form Card ────────────────────────────────────────── */}
      <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md">

        {/* Success banner */}
        {submitSuccess && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">WFH Request Submitted!</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">Awaiting approval from your Team Lead and Admin.</p>
            </div>
          </div>
        )}

        {/* Step progress bar */}
        <StepBar current={step} />

        <form onSubmit={form.handleSubmit(onSubmit)}>

          {/* ── STEP 1: WFH Type ──────────────────────────────────── */}
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
                    className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group ${
                      selected
                        ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                        : "border-white/10 hover:border-white/25 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className={`font-semibold ${selected ? "text-amber-300" : "text-white"}`}>{opt.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                    </div>
                    {selected
                      ? <CheckCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      : <ChevronRight className="w-5 h-5 text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
                    }
                  </button>
                );
              })}
            </div>
          )}

          {/* ── STEP 2: Date Range ────────────────────────────────── */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Date{isHalfDay ? "" : " Range"}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  {isHalfDay ? "Pick the date for your half-day WFH" : "Choose the start and end dates"}
                </p>
              </div>

              {/* Chosen type reminder */}
              <div className="flex items-center gap-3 p-3.5 bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl mb-6">
                <span className="text-2xl">{chosenOpt.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{chosenOpt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{chosenOpt.desc}</p>
                </div>
              </div>

              {isHalfDay ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Date *</label>
                  <input
                    type="date"
                    {...form.register("start_date")}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors"
                  />
                  {form.formState.errors.start_date && <p className="text-xs text-red-400 mt-1.5">{form.formState.errors.start_date.message}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">From *</label>
                    <input
                      type="date"
                      {...form.register("start_date")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors"
                    />
                    {form.formState.errors.start_date && <p className="text-xs text-red-400 mt-1.5">{form.formState.errors.start_date.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">To</label>
                    <input
                      type="date"
                      {...form.register("end_date")}
                      min={startDate || undefined}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Cutoff reminder */}
              <div className="mt-5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-300 space-y-1">
                <p className="font-bold text-amber-200">⏰ Same-Day Cutoff Times</p>
                <p>Full Day / Morning Session → apply before <strong>9:45 AM</strong></p>
                <p>Afternoon Session → apply before <strong>2:30 PM</strong></p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Reason ────────────────────────────────────── */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Describe Your Tasks</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tell your manager what you'll be working on</p>
              </div>
              <textarea
                rows={6}
                {...form.register("reason")}
                placeholder="e.g. Working on the Q3 report, attending online client calls, fixing critical bugs on the production server…"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 placeholder:text-slate-600 resize-none transition-colors"
              />
              {form.formState.errors.reason && <p className="text-xs text-red-400 mt-1.5">{form.formState.errors.reason.message}</p>}
              <p className="text-xs text-slate-500 mt-2">{reason?.length || 0} characters (minimum 5)</p>
            </div>
          )}

          {/* ── STEP 4: Review & Submit ───────────────────────────── */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Submit</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Confirm your WFH request details before submitting</p>
              </div>

              <div className="space-y-3 mb-6">
                {/* Type */}
                <div className="flex items-center justify-between p-4 bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{chosenOpt.icon}</span>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">WFH Type</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{chosenOpt.label}</p>
                    </div>
                  </div>
                  <DurationBadge type={durationType} />
                </div>

                {/* Date */}
                <div className="flex items-center gap-3 p-4 bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Date</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {startDate ? fmtDate(startDate) : "—"}
                      {!isHalfDay && endDate && endDate !== startDate && <> → {fmtDate(endDate)}</>}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="p-4 bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">Reason / Tasks</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{reason || "—"}</p>
                </div>
              </div>

              {/* Approval info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-xs text-blue-300 space-y-1.5">
                <p className="font-bold text-blue-200">🔐 Dual Approval Required</p>
                <p>Your request goes to your <strong>Team Lead</strong> first. After TL approval, the <strong>Super Admin</strong> gives the final decision. WFH is granted only when <strong>both</strong> approve.</p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit WFH Request</>}
              </button>
            </div>
          )}

          {/* ── Navigation Buttons ─────────────────────────────────── */}
          <div className={`flex mt-8 gap-3 ${step === 1 ? "justify-end" : "justify-between"}`}>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 4 && (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors ml-auto"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── WFH History ───────────────────────────────────────────── */}
      <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">WFH History</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">All your remote work requests and their approval status</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-slate-600 dark:text-slate-300">{requests.length} requests</span>
        </div>

        {isLoading ? (
          <div className="py-14 flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading…
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
              <Home className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-sm">No WFH requests yet.</p>
            <p className="text-xs text-slate-600">Use the form above to submit your first request!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {requests.map((req) => {
              const si = getStatusInfo(req);
              const singleDay = !req.end_date || req.end_date === req.start_date;
              return (
                <div key={req.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {(user?.role === "Super Admin" || user?.role === "Team Lead") && req.user && (
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{req.user.first_name} {req.user.last_name}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <DurationBadge type={req.duration_type || "Full"} />
                        <span className="flex items-center gap-1.5 text-sm text-slate-900 dark:text-white font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          {req.start_date ? fmtDate(req.start_date) : "—"}
                          {!singleDay && req.end_date && <> → {fmtDate(req.end_date)}</>}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate pr-4">{req.reason}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium">
                        <span className={`flex items-center gap-1 ${tlColor(req.tl_status)}`}>
                          {statusIcon(req.tl_status)} TL: {req.tl_status || "Pending"}
                        </span>
                        <span className="text-white/20">·</span>
                        <span className={`flex items-center gap-1 ${adminColor(req.admin_status)}`}>
                          {statusIcon(req.admin_status)} Admin: {req.admin_status || "Pending"}
                        </span>
                      </div>
                      {req.remarks && <p className="text-xs text-slate-500 mt-1.5 italic">Note: {req.remarks}</p>}
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${si.cls}`}>{si.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
