"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ChevronRight, Clock, Home, Info, Loader2, Send, Sun, Sunset } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { WfhDateRangeField } from "./WfhDateRangeField";
import { GuidelinesCard, NeedHelpCard, RecentRequestsCard, type RecentWfhRequest } from "./WfhSidePanels";

/* ─── Constants ─────────────────────────────────────────────────── */

// Same-day cutoffs. The backend enforces the policy value (default 09:45 / 14:30); these
// mirror it for the up-front warning.
const MORNING_CUTOFF_MIN = 9 * 60 + 45;
const AFTERNOON_CUTOFF_MIN = 14 * 60 + 30;
const REASON_MAX = 500;

const TYPE_OPTIONS = [
  {
    value: "Full",
    title: "Full Day WFH",
    desc: "Work from home the entire day",
    hours: null,
    Icon: Home,
    iconClass: "portal-accent-text",
  },
  {
    value: "Half-Morning",
    title: "Half Day – Morning",
    desc: "Work from home during morning session",
    hours: "9:00 AM – 1:00 PM",
    Icon: Sun,
    iconClass: "text-amber-500",
  },
  {
    value: "Half-Afternoon",
    title: "Half Day – Afternoon",
    desc: "Work from home during afternoon session",
    hours: "1:30 PM – 6:00 PM",
    Icon: Sunset,
    iconClass: "text-orange-500",
  },
] as const;

const QUICK_REASONS = ["Personal Work", "Family Commitment", "Client Calls", "Focus Work", "Health Issue", "Other"];

const formSchema = z.object({
  duration_type: z.enum(["Full", "Half-Morning", "Half-Afternoon"]),
  start_date: z.string().min(1, "Please select a date"),
  end_date: z.string().optional(),
  reason: z
    .string()
    .trim()
    .min(5, "Please provide at least 5 characters")
    .max(REASON_MAX, `Reason can be at most ${REASON_MAX} characters`),
});
type FormValues = z.infer<typeof formSchema>;

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };

interface ApiWfhRequest extends RecentWfhRequest {
  user_id?: number;
  user?: { id?: number } | null;
}

/* ─── Small pieces ──────────────────────────────────────────────── */

function FieldLabel({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <p className="mb-2.5 text-[15px] font-bold text-slate-900 dark:text-white">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
      {optional && <span className="ml-1.5 font-medium text-slate-500">(optional)</span>}
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p> : null;
}

function BannerArt() {
  return (
    <svg viewBox="0 0 260 130" className="portal-accent-text h-28 w-auto" aria-hidden>
      <ellipse cx="130" cy="122" rx="108" ry="6" fill="currentColor" opacity="0.12" />
      {/* laptop */}
      <path d="M62 108h96l8 10H54z" fill="#94a3b8" />
      <rect x="72" y="52" width="76" height="56" rx="5" fill="#1e293b" />
      <rect x="77" y="57" width="66" height="46" rx="3" fill="currentColor" opacity="0.22" />
      <rect x="84" y="66" width="30" height="4" rx="2" fill="currentColor" opacity="0.65" />
      <rect x="84" y="76" width="46" height="4" rx="2" fill="currentColor" opacity="0.4" />
      <circle cx="132" cy="90" r="4" fill="currentColor" />
      {/* mug */}
      <rect x="172" y="96" width="14" height="14" rx="3" fill="#f59e0b" />
      <path d="M186 99h3a4 4 0 010 8h-3" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      {/* plant */}
      <path d="M198 108h28l-4 16h-20z" fill="currentColor" opacity="0.85" />
      <ellipse cx="205" cy="90" rx="6" ry="16" transform="rotate(-25 205 90)" fill="#34d399" />
      <ellipse cx="221" cy="88" rx="6" ry="17" transform="rotate(20 221 88)" fill="#10b981" />
      <ellipse cx="212" cy="82" rx="5.5" ry="18" fill="#6ee7b7" />
      {/* sparkles */}
      <path d="M40 34v10M35 39h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M232 40v8M228 44h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <circle cx="56" cy="66" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="176" cy="40" r="2.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function CutoffWarningModal({ message, onClose }: { message: string; onClose: () => void }) {
  const [headline, ...rest] = message.split("\n\n");
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
            <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Application Not Allowed</h3>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Same-Day WFH Time Restriction</p>
          </div>
        </div>
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
          <p className="mb-2 text-sm font-bold text-red-700 dark:text-red-300">{headline}</p>
          {rest.map((line, i) => (
            <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
              {line}
            </p>
          ))}
        </div>
        <div className="mb-5 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-xs font-bold text-amber-700 dark:text-amber-400">Same-Day WFH Cutoff Rules</p>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Full Day / Morning — apply before <strong>9:45 AM</strong>
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Afternoon Session — apply before <strong>2:30 PM</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
        >
          Got it, I&apos;ll apply in advance next time
        </button>
      </div>
    </div>
  );
}

/* ─── Form ──────────────────────────────────────────────────────── */

interface WfhRequestFormProps {
  /** Back to the requests list (Cancel button, breadcrumb) */
  onCancel: () => void;
  /** "View All" in the recent-requests card */
  onViewAll: () => void;
  /** Request saved; the page refreshes its list and leaves the form */
  onSubmitted: () => void;
}

export function WfhRequestForm({ onCancel, onViewAll, onSubmitted }: WfhRequestFormProps) {
  const user = useAuthStore((s) => s.user);
  const skipCutoff = user?.role === "Super Admin";

  const [todayKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cutoffWarning, setCutoffWarning] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentWfhRequest[] | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { duration_type: "Full", start_date: todayKey, end_date: todayKey, reason: "" },
  });

  const durationType = useWatch({ control: form.control, name: "duration_type" });
  const startDate = useWatch({ control: form.control, name: "start_date" });
  const endDate = useWatch({ control: form.control, name: "end_date" });
  const reason = useWatch({ control: form.control, name: "reason" }) ?? "";
  const isHalfDay = durationType !== "Full";
  const errors = form.formState.errors;

  // Half-day WFH is always a single date
  useEffect(() => {
    if (isHalfDay && startDate) form.setValue("end_date", startDate);
  }, [isHalfDay, startDate, form]);

  // Own recent requests. `mine=1` keeps a Team Lead's team out of the list; the client filter
  // covers a backend that does not know the parameter yet.
  useEffect(() => {
    let cancelled = false;
    api
      .get("/wfh-requests?mine=1&per_page=10")
      .then((res) => {
        if (cancelled) return;
        const rows: ApiWfhRequest[] = res.data?.data?.data ?? [];
        setRecent(rows.filter((r) => (r.user_id ?? r.user?.id) === user?.id).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const dayCount = !startDate
    ? 0
    : isHalfDay
    ? 0.5
    : differenceInCalendarDays(parseISO(endDate || startDate), parseISO(startDate)) + 1;

  const applyQuickReason = (text: string) => {
    if (text === "Other") {
      document.getElementById("wfh-reason")?.focus();
      return;
    }
    const current = form.getValues("reason").trim();
    if (current.toLowerCase().includes(text.toLowerCase())) return;
    const next = current ? `${current}, ${text}` : text;
    form.setValue("reason", next.slice(0, REASON_MAX), { shouldValidate: true, shouldDirty: true });
  };

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    // Same-day cutoff (Super Admin is exempt, as on the server)
    const now = new Date();
    if (!skipCutoff && values.start_date === format(now, "yyyy-MM-dd")) {
      const minutes = now.getHours() * 60 + now.getMinutes();
      if (values.duration_type !== "Half-Afternoon" && minutes > MORNING_CUTOFF_MIN) {
        const kind = values.duration_type === "Full" ? "a Full Day" : "a Morning Session";
        setCutoffWarning(
          `You cannot apply for ${kind} WFH after 9:45 AM.\n\nSame-day ${
            values.duration_type === "Full" ? "Full Day" : "Morning"
          } WFH applications must be submitted before 9:45 AM.`
        );
        return;
      }
      if (values.duration_type === "Half-Afternoon" && minutes > AFTERNOON_CUTOFF_MIN) {
        setCutoffWarning(
          "You cannot apply for an Afternoon Session WFH after 2:30 PM.\n\nSame-day Afternoon WFH applications must be submitted before 2:30 PM."
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post("/wfh-requests", {
        duration_type: values.duration_type,
        start_date: values.start_date,
        end_date: values.duration_type === "Full" ? values.end_date || values.start_date : values.start_date,
        reason: values.reason,
      });
      onSubmitted();
    } catch (e) {
      const data = (e as ApiError).response?.data;
      setSubmitError(
        data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-10">
      {cutoffWarning && <CutoffWarningModal message={cutoffWarning} onClose={() => setCutoffWarning(null)} />}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <button type="button" onClick={onCancel} className="hover:underline cursor-pointer">
          WFH
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800 dark:text-slate-100">New Request</span>
      </nav>

      {/* Banner */}
      <div className="portal-accent-tint portal-accent-border flex items-center justify-between gap-4 overflow-hidden rounded-2xl border px-5 py-5 sm:px-7">
        <div className="flex min-w-0 items-center gap-4">
          <div className="portal-accent-tint-strong portal-accent-text flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl">
            <Home className="h-9 w-9" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F4B] sm:text-3xl dark:text-white">
              Work From Home Request
            </h1>
            <p className="text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Submit your work from home request for approval.
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-3 lg:flex" aria-hidden>
          <p className="card-tagline cursive-slogan !text-[22px] leading-[1.15]">
            Work Smart
            <br />
            Stay Productive
          </p>
          <BannerArt />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Form ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* WFH type */}
          <div>
            <FieldLabel required>Select WFH Type</FieldLabel>
            <div role="radiogroup" aria-label="WFH type" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TYPE_OPTIONS.map(({ value, title, desc, hours, Icon, iconClass }) => {
                const selected = durationType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => form.setValue("duration_type", value, { shouldDirty: true })}
                    className={`portal-focus flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                      selected
                        ? "portal-accent-tint portal-accent-border-solid shadow-sm"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "portal-accent-solid portal-accent-border-solid" : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <Icon className={`h-10 w-10 ${iconClass}`} />
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{desc}</p>
                      {hours && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">({hours})</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div>
            <FieldLabel required>Date(s)</FieldLabel>
            <WfhDateRangeField
              mode={isHalfDay ? "single" : "range"}
              start={startDate}
              end={endDate || startDate}
              invalid={!!errors.start_date}
              onChange={(start, end) => {
                form.setValue("start_date", start, { shouldValidate: true, shouldDirty: true });
                form.setValue("end_date", end, { shouldDirty: true });
              }}
            />
            <FieldError message={errors.start_date?.message} />
            <div className="portal-accent-tint mt-3 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200">
              <span className="portal-accent-solid flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                <Info className="h-3 w-3" />
              </span>
              <span className="flex-1">
                {isHalfDay
                  ? "Half-day WFH applies to a single date."
                  : "You can select multiple dates for the same WFH type."}
              </span>
              {dayCount > 0 && (
                <span className="portal-accent-text shrink-0 text-xs font-bold">
                  {dayCount === 0.5 ? "0.5 day" : `${dayCount} day${dayCount === 1 ? "" : "s"}`}
                </span>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <FieldLabel required>Reason for WFH</FieldLabel>
            <div className="relative">
              <textarea
                id="wfh-reason"
                rows={4}
                maxLength={REASON_MAX}
                placeholder="Please provide the reason for working from home..."
                {...form.register("reason")}
                className={`portal-focus min-h-[132px] w-full resize-none rounded-xl border bg-white px-4 py-3 pb-8 text-[15px] text-slate-900 placeholder:text-slate-400 dark:bg-slate-900 dark:text-white ${
                  errors.reason ? "border-rose-400" : "border-slate-200 dark:border-slate-700"
                }`}
              />
              <span className="pointer-events-none absolute bottom-2.5 right-4 text-xs font-medium text-slate-400">
                {reason.length}/{REASON_MAX}
              </span>
            </div>
            <FieldError message={errors.reason?.message} />
          </div>

          {/* Quick reasons */}
          <div>
            <FieldLabel optional>Quick Reasons</FieldLabel>
            <div className="flex flex-wrap gap-2.5">
              {QUICK_REASONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => applyQuickReason(text)}
                  className="portal-focus rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Cutoff note */}
          <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 text-amber-500">
              <Clock className="h-6 w-6" />
            </span>
            <div className="space-y-0.5 text-[15px] text-slate-800 dark:text-slate-200">
              <p className="text-base font-extrabold text-amber-800 dark:text-amber-300">Same-Day Cutoff Times</p>
              <p>
                Full Day / Morning Session → apply before <strong>9:45 AM</strong>
              </p>
              <p>
                Afternoon Session → apply before <strong>2:30 PM</strong>
              </p>
            </div>
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-[15px] font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit WFH Request
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Side column ── */}
        <aside className="space-y-5">
          <GuidelinesCard />
          <NeedHelpCard />
          <RecentRequestsCard requests={recent} onViewAll={onViewAll} />
        </aside>
      </div>
    </div>
  );
}
