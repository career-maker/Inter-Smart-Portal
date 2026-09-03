"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Award,
  Calendar,
  Mail,
  Phone,
  Building2,
  Shield,
  Clock,
  Heart,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react";
import api from "@/services/api";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface EmployeeProfileData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  designation: string | null;
  employee_code: string | null;
  profile_photo_path: string | null;
  team: string | null;
  joining_date: string | null;
  tenure_years: number | null;
  tenure_text: string | null;
  role: string | null;
  contact_number: string | null;
  blood_group: string | null;
  status: string | null;
  awards: Array<{
    id: number;
    title: string;
    description: string | null;
    icon: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string | null;
  }>;
}

interface EmployeeIdCardDrawerProps {
  employeeId: number | null;
  isOpen: boolean;
  onClose: () => void;
  fallbackData?: Partial<EmployeeProfileData> | null;
}

export function EmployeeIdCardDrawer({
  employeeId,
  isOpen,
  onClose,
  fallbackData,
}: EmployeeIdCardDrawerProps) {
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (!isOpen || !employeeId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .get<{ data: EmployeeProfileData }>(`/employees/${employeeId}/public`)
      .then((res) => {
        if (isMounted && res.data?.data) {
          setProfile(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load employee public profile:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  const data = profile || (fallbackData as EmployeeProfileData) || null;
  const fullName = data
    ? `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Employee"
    : "Employee";

  const handleCopyEmail = (emailText: string) => {
    navigator.clipboard.writeText(emailText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const formatDateString = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-in ID Card Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Inter Smart • Employee ID Card
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading && !profile ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#56348f]" />
              <p className="text-xs font-semibold text-slate-500">Loading Employee Badge...</p>
            </div>
          ) : data ? (
            <>
              {/* ── THE CORPORATE ID CARD BADGE (Main Centerpiece) ── */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 via-white to-slate-50/80 dark:from-slate-850 dark:via-slate-900 dark:to-slate-900 shadow-xl">
                
                {/* ID Card Holographic Top Bar */}
                <div className="h-28 bg-gradient-to-r from-[#2a134a] via-[#56348f] to-[#7948b8] p-4 flex items-start justify-between relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
                  <div className="relative z-10">
                    <p className="text-[11px] font-black uppercase tracking-widest text-purple-200">
                      INTER SMART
                    </p>
                    <p className="text-[9px] font-semibold text-purple-300/80 uppercase">
                      OFFICIAL WORKFORCE ID
                    </p>
                  </div>
                  <div className="relative z-10 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black text-white">
                    {data.employee_code ? `#${data.employee_code}` : "ACTIVE"}
                  </div>
                </div>

                {/* Avatar & Core Identity */}
                <div className="px-6 pb-6 pt-0 relative">
                  {/* Photo Profile overlapping top bar */}
                  <div className="-mt-14 mb-3.5 flex items-end justify-between">
                    <div className="relative">
                      <RoyalAvatar
                        src={data.profile_photo_path}
                        name={fullName}
                        userId={data.id}
                        className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-slate-900 shadow-xl object-cover"
                      />
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
                    </div>

                    {/* Tenure Pill Badge */}
                    {data.tenure_text && (
                      <div className="flex flex-col items-end pb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tenure
                        </span>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>{data.tenure_text}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <RoyalName name={fullName} userId={data.id} showCrownIcon={true} />
                    </h2>
                    <p className="text-sm font-bold text-[#56348f] dark:text-purple-300">
                      {data.designation || "Team Member"}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{data.team || "Inter Smart Team"}</span>
                      <span>•</span>
                      <span>{data.role || "Employee"}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* ── METRICS & WORK DETAILS GRID ── */}
              <div className="grid grid-cols-2 gap-3">
                {/* Employee ID */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-600" />
                    Employee Code
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                    {data.employee_code || "N/A"}
                  </p>
                </div>

                {/* Date Joined */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    Joined Date
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {formatDateString(data.joining_date)}
                  </p>
                </div>

                {/* Years with Intersmart */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Experience
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {data.tenure_text || (data.tenure_years ? `${data.tenure_years} Years` : "Recently Joined")}
                  </p>
                </div>

                {/* Blood Group */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-600" />
                    Blood Group
                  </span>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {data.blood_group || "Not Specified"}
                  </p>
                </div>
              </div>

              {/* ── AWARDS & RECOGNITIONS SECTION ── */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Awards & Recognitions
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    {data.awards?.length || 0}
                  </span>
                </div>

                {data.awards && data.awards.length > 0 ? (
                  <div className="space-y-2.5">
                    {data.awards.map((award) => (
                      <div
                        key={award.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200/70 dark:border-amber-700/40 flex items-start gap-3 shadow-2xs"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {award.title}
                            </p>
                            {award.created_at && (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatDateString(award.created_at)}
                              </span>
                            )}
                          </div>
                          {award.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {award.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                    No awards or recognitions recorded yet.
                  </p>
                )}
              </div>

              {/* ── CONTACT & DIRECTORY INFO ── */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Contact Information
                </p>

                {/* Email with copy button */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {data.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyEmail(data.email)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer shrink-0"
                    title="Copy Email"
                  >
                    {copiedEmail ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Phone */}
                {data.contact_number && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {data.contact_number}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              Employee profile could not be loaded.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmployeeIdCardDrawer;
