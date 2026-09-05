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
  Search,
  ChevronRight,
  ArrowLeft,
  Briefcase,
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
  fallbackData?: any | null;
}

export function EmployeeIdCardDrawer({
  employeeId,
  isOpen,
  onClose,
  fallbackData,
}: EmployeeIdCardDrawerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(employeeId);
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Directory Search Mode States
  const [searchTerm, setSearchTerm] = useState("");
  const [directoryResults, setDirectoryResults] = useState<any[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  useEffect(() => {
    if (employeeId) {
      setSelectedId(employeeId);
    } else if (fallbackData?.id) {
      setSelectedId(fallbackData.id);
    } else if (fallbackData?.searchMode) {
      setSelectedId(null);
    }
  }, [employeeId, fallbackData, isOpen]);

  // Hide chatbot icon and other floating widgets when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("side-popup-open");
      return () => {
        document.body.classList.remove("side-popup-open");
      };
    }
  }, [isOpen]);

  // Load employee full profile
  useEffect(() => {
    if (!isOpen || !selectedId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .get<{ data: EmployeeProfileData }>(`/employees/${selectedId}/public`)
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
  }, [isOpen, selectedId]);

  // Fetch directory search results
  useEffect(() => {
    if (!isOpen || selectedId) return;

    let isMounted = true;
    setLoadingDirectory(true);

    const timer = setTimeout(() => {
      const q = searchTerm.trim();
      const endpoint = q.length >= 1 ? `/employees-search?search=${encodeURIComponent(q)}` : `/employees-search`;

      api
        .get<{ data: { data: any[] } }>(endpoint)
        .then((res) => {
          if (isMounted) {
            setDirectoryResults(res.data?.data?.data || []);
          }
        })
        .catch(() => {
          if (isMounted) setDirectoryResults([]);
        })
        .finally(() => {
          if (isMounted) setLoadingDirectory(false);
        });
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, selectedId, searchTerm]);

  if (!isOpen) return null;

  const data = profile || (fallbackData?.id === selectedId ? fallbackData : null);
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
            {selectedId ? (
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 -ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200/60 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Search Another Colleague"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Search</span>
              </button>
            ) : (
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            )}
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {selectedId ? "Employee ID Card" : "Search Employee Directory"}
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

        {/* ── SEARCH DIRECTORY VIEW (When no employee is selected yet) ── */}
        {!selectedId ? (
          <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto custom-scrollbar">
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search colleague by name, code, or role..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Select colleague to view ID card
            </p>

            {loadingDirectory ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#56348f]" />
                <span className="text-xs text-slate-400">Searching colleagues...</span>
              </div>
            ) : directoryResults.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                No employees matching &quot;{searchTerm}&quot;
              </div>
            ) : (
              <div className="space-y-1.5">
                {directoryResults.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedId(emp.id)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 hover:bg-purple-50/80 dark:hover:bg-purple-950/30 border border-slate-200/70 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800/60 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RoyalAvatar
                        src={emp.profile_photo_path}
                        name={emp.name || `${emp.first_name} ${emp.last_name}`}
                        userId={emp.id}
                        className="w-9 h-9 rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5 group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors">
                          <RoyalName name={emp.name || `${emp.first_name} ${emp.last_name}`} userId={emp.id} showCrownIcon={false} />
                          {emp.employee_code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              #{emp.employee_code}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {emp.designation || emp.role || "Team Member"} • {emp.email}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── ID CARD DETAILS VIEW ── */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {loading && !profile ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#56348f]" />
                <p className="text-xs font-semibold text-slate-500">Loading Employee Badge...</p>
              </div>
            ) : data ? (
              <>
                {/* ── THE CORPORATE ID CARD BADGE (Matching Image 2 exactly) ── */}
                <div className="relative rounded-3xl overflow-hidden border border-amber-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none">
                  
                  {/* Warm Golden Header Wave Background */}
                  <div className="relative bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/60 to-[#FFFDF5] dark:from-slate-850 dark:via-amber-950/20 dark:to-slate-900 overflow-hidden pt-5 px-6 pb-6">
                    {/* Organic Fluid Wave Vector in Background (Right side swoop) */}
                    <svg
                      className="absolute right-0 top-0 w-[60%] h-full pointer-events-none opacity-60 dark:opacity-20 select-none"
                      viewBox="0 0 240 180"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M20 0C60 70 130 30 160 85C185 130 240 120 240 180V0H20Z"
                        fill="#FEF3C7"
                      />
                    </svg>

                    {/* Faint 'S' ribbon watermark on far right */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.07] dark:opacity-[0.03] pointer-events-none select-none text-amber-600">
                      <svg className="w-36 h-36" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 15 C35 15 25 25 25 35 C25 45 35 50 50 55 C65 60 75 65 75 75 C75 85 65 95 50 95 C35 95 25 85 25 75 L35 75 C35 80 42 85 50 85 C58 85 65 80 65 75 C65 70 58 65 50 60 C35 55 25 50 25 35 C25 20 38 15 50 15 Z" />
                      </svg>
                    </div>

                    {/* Top Logo & Employee Code Row */}
                    <div className="flex items-center justify-between relative z-10 mb-5">
                      {/* Inter Smart Logo with yellow 'S' */}
                      <div className="flex items-center gap-2">
                        <img
                          src="/logo.png"
                          alt="Inter Smart"
                          className="h-8 w-auto object-contain block dark:hidden"
                        />
                        <img
                          src="/logo-dark.png"
                          alt="Inter Smart"
                          className="h-8 w-auto object-contain hidden dark:block"
                        />
                      </div>

                      {/* Employee Code Pill */}
                      <div className="px-3.5 py-1 rounded-full bg-[#FDE68A] dark:bg-amber-900/60 border border-[#FCD34D] dark:border-amber-700/50 text-xs font-black text-slate-900 dark:text-amber-100 shadow-2xs tracking-wide">
                        {data.employee_code ? `#${data.employee_code}` : "ACTIVE"}
                      </div>
                    </div>

                    {/* Profile Row: Avatar on Left, Details on Right */}
                    <div className="flex items-start gap-4 sm:gap-5 relative z-10">
                      {/* Avatar inside soft cream cushion */}
                      <div className="relative shrink-0">
                        <div className="p-2 rounded-2xl bg-[#FEF9C3] dark:bg-amber-950/40 border border-[#FDE68A]/80 dark:border-amber-800/40 shadow-xs">
                          <RoyalAvatar
                            src={data.profile_photo_path}
                            name={fullName}
                            userId={data.id}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-xs"
                          />
                        </div>
                        <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
                      </div>

                      {/* Core Info & Neatly Stacked Tenure Badge */}
                      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                          <RoyalName name={fullName} userId={data.id} showCrownIcon={false} />
                        </h2>
                        
                        {/* Designation with briefcase */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{data.designation || "Headhunter"}</span>
                        </div>

                        {/* Team and Role with building */}
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{data.team || "Unassigned"}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="truncate">{data.role || "Employee"}</span>
                        </div>

                        {/* Tenure Pill Badge (Clean internal alignment matching Image 2) */}
                        <div className="pt-1.5">
                          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/60 border border-[#FDE68A] dark:border-amber-700/50 shadow-2xs">
                            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-black text-slate-900 dark:text-amber-100 leading-none">
                                {data.tenure_text || (data.tenure_years ? `${data.tenure_years} Years` : "Recently Joined")}
                              </span>
                              <span className="text-[8px] font-extrabold uppercase tracking-widest text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-none">
                                TENURE
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── METRICS & WORK DETAILS GRID (Matching Image 2 exactly) ── */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Card 1: EMPLOYEE CODE */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                        EMPLOYEE CODE
                      </span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 leading-none font-mono">
                        {data.employee_code || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: JOINED DATE */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                        JOINED DATE
                      </span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 leading-none">
                        {formatDateString(data.joining_date)}
                      </p>
                    </div>
                  </div>

                  {/* Card 3: EXPERIENCE */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                        EXPERIENCE
                      </span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 leading-none truncate">
                        {data.tenure_text || (data.tenure_years ? `${data.tenure_years} Years` : "Recently Joined")}
                      </p>
                    </div>
                  </div>

                  {/* Card 4: BLOOD GROUP */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                        BLOOD GROUP
                      </span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 leading-none">
                        {data.blood_group || "Not Specified"}
                      </p>
                    </div>
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
                      {data.awards.map((award: any) => (
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
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center justify-between shrink-0">
          {selectedId ? (
            <button
              onClick={() => setSelectedId(null)}
              className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
            >
              ← Search another colleague
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Inter Smart Workforce Directory</span>
          )}
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
