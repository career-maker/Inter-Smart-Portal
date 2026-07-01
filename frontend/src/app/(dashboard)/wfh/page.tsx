"use client";
import { PageLoader } from "@/components/ui/PageLoader";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Clock, CheckCircle, XCircle, Loader2, Home } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

const DURATION_OPTIONS = [
  {
    value: "Full",
    label: "Full Day WFH",
    icon: "🏠",
    desc: "Work from home for the entire day",
  },
  {
    value: "Half-Morning",
    label: "Half Day – Morning Session",
    icon: "🌅",
    desc: "Remote during the morning session only",
  },
  {
    value: "Half-Afternoon",
    label: "Half Day – Afternoon Session",
    icon: "🌇",
    desc: "Remote during the afternoon session only",
  },
];

const formSchema = z.object({
  duration_type: z.enum(["Full", "Half-Morning", "Half-Afternoon"]),
  start_date: z.string().min(1, "Date is required"),
  end_date: z.string().optional(),
  reason: z.string().min(5, "Please provide at least 5 characters"),
});

type FormValues = z.infer<typeof formSchema>;

function fmtDate(d: string) {
  try { return format(new Date(d + "T00:00:00"), "dd MMM yyyy"); }
  catch { return d; }
}

function DurationBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    Full:             { cls: "bg-indigo-500/20 text-indigo-300",  label: "Full Day" },
    "Half-Morning":   { cls: "bg-sky-500/20 text-sky-300",        label: "Half – Morning" },
    "Half-Afternoon": { cls: "bg-violet-500/20 text-violet-300",  label: "Half – Afternoon" },
  };
  const m = map[type] ?? { cls: "bg-white/10 text-slate-300", label: type };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.cls}`}>{m.label}</span>
  );
}

export default function WfhPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { duration_type: "Full", start_date: "", end_date: "", reason: "" },
  });

  const durationType = form.watch("duration_type");
  const startDate = form.watch("start_date");
  const isHalfDay = durationType !== "Full";

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    if (isHalfDay && startDate) form.setValue("end_date", startDate);
  }, [durationType, startDate]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/wfh-requests");
      setRequests(res.data.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  async function onSubmit(values: FormValues) {
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
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      fetchRequests();
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      const msg = errs
        ? Object.values(errs).flat().join("\n")
        : e.response?.data?.message || "An error occurred. Please try again.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const getStatusInfo = (req: any) => {
    if (req.status === "Approved") return { label: "Approved",      cls: "bg-emerald-500/20 text-emerald-400" };
    if (req.status === "Rejected") return { label: "Rejected",      cls: "bg-red-500/20 text-red-400" };
    if (req.tl_status === "Pending") return { label: "Awaiting TL",  cls: "bg-amber-500/20 text-amber-400" };
    if (req.admin_status === "Pending") return { label: "Awaiting Admin", cls: "bg-blue-500/20 text-blue-400" };
    return { label: "Pending", cls: "bg-amber-500/20 text-amber-400" };
  };

  const tlColor = (s: string) =>
    s === "Approved" || s === "Not Required" ? "text-emerald-400" : s === "Rejected" ? "text-red-400" : "text-amber-400";
  const adminColor = (s: string) =>
    s === "Approved" || s === "Not Required" ? "text-emerald-400" : s === "Rejected" ? "text-red-400" : "text-blue-400";
  const statusIcon = (s: string) =>
    s === "Approved" || s === "Not Required" ? <CheckCircle className="w-3 h-3" /> :
    s === "Rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Home className="w-7 h-7 text-amber-400" /> Work From Home
        </h1>
        <p className="text-slate-300 mt-1">Submit and track your remote work requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Apply Form ── */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-base font-bold text-white mb-5">Apply for WFH</h2>

            {submitSuccess && (
              <div className="mb-5 flex items-center gap-2 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                WFH request submitted! Awaiting approvals.
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Duration type selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  WFH Type *
                </label>
                <div className="space-y-2">
                  {DURATION_OPTIONS.map((opt) => {
                    const selected = durationType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => form.setValue("duration_type", opt.value as FormValues["duration_type"])}
                        className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                          selected
                            ? "border-amber-500/60 bg-amber-500/10"
                            : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${selected ? "text-amber-300" : "text-white"}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                        </div>
                        {selected && <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date field(s) */}
              {isHalfDay ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    {...form.register("start_date")}
                    className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                  />
                  {form.formState.errors.start_date && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.start_date.message}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      From *
                    </label>
                    <input
                      type="date"
                      {...form.register("start_date")}
                      className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                    />
                    {form.formState.errors.start_date && (
                      <p className="text-xs text-red-400 mt-1">{form.formState.errors.start_date.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      To *
                    </label>
                    <input
                      type="date"
                      {...form.register("end_date")}
                      min={startDate || undefined}
                      className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Reason / Tasks *
                </label>
                <textarea
                  rows={4}
                  {...form.register("reason")}
                  placeholder="Describe what you'll be working on from home…"
                  className="w-full bg-slate-700 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500 resize-none transition-colors"
                />
                {form.formState.errors.reason && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.reason.message}</p>
                )}
              </div>

              {/* Approval info box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-xs text-blue-300 space-y-1.5">
                <p className="font-bold text-blue-200">Dual Approval Required</p>
                <p>
                  Your request goes to your <strong>Team Lead</strong> first. After TL approval, the{" "}
                  <strong>Super Admin</strong> gives the final decision. WFH is granted only when{" "}
                  <strong>both</strong> approve.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Home className="w-4 h-4" /> Submit WFH Request</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── History List ── */}
        <div className="lg:col-span-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-base font-bold text-white">WFH History</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                All your remote work requests and their approval status.
              </p>
            </div>

            {isLoading ? (
              <div className="py-14 flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" /> Loading…
              </div>
            ) : requests.length === 0 ? (
              <div className="py-14 text-center text-slate-400 space-y-2">
                <Home className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm">No WFH requests yet. Apply using the form!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {requests.map((req) => {
                  const si = getStatusInfo(req);
                  const singleDay = !req.end_date || req.end_date === req.start_date;
                  return (
                    <div key={req.id} className="px-6 py-4 hover:bg-white/3 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">

                          {/* Employee name (Admin / TL view) */}
                          {(user?.role === "Super Admin" || user?.role === "Team Lead") && req.user && (
                            <p className="text-xs font-bold text-slate-400 mb-1.5">
                              {req.user.first_name} {req.user.last_name}
                            </p>
                          )}

                          {/* Duration badge + date */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <DurationBadge type={req.duration_type || "Full"} />
                            <span className="flex items-center gap-1.5 text-sm text-white font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {req.start_date ? fmtDate(req.start_date) : "—"}
                              {!singleDay && req.end_date && <> — {fmtDate(req.end_date)}</>}
                            </span>
                          </div>

                          {/* Reason preview */}
                          <p className="text-sm text-slate-400 truncate pr-4">{req.reason}</p>

                          {/* Approval breakdown */}
                          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs font-medium">
                            <span className={`flex items-center gap-1 ${tlColor(req.tl_status)}`}>
                              {statusIcon(req.tl_status)}
                              TL: {req.tl_status || "Pending"}
                            </span>
                            <span className="text-white/20">·</span>
                            <span className={`flex items-center gap-1 ${adminColor(req.admin_status)}`}>
                              {statusIcon(req.admin_status)}
                              Admin: {req.admin_status || "Pending"}
                            </span>
                          </div>

                          {req.remarks && (
                            <p className="text-xs text-slate-500 mt-1.5 italic">Note: {req.remarks}</p>
                          )}
                        </div>

                        {/* Overall status pill */}
                        <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${si.cls}`}>
                          {si.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
