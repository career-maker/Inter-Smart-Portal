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
  User,
  Users,
  Send,
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
      <div
        id="employee-id-drawer"
        data-side-popup="true"
        className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[560px] max-w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300 overflow-hidden"
      >
        {/* Top Header matching exact mockup */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            {selectedId ? (
              <button
                onClick={() => setSelectedId(null)}
                className="text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Search Another Colleague"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Search</span>
              </button>
            ) : (
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            )}
            <span className="text-slate-300 dark:text-slate-700 font-light mx-1">|</span>
            <span className="text-xs font-black uppercase tracking-wider text-[#1E1B4B] dark:text-white">
              {selectedId ? "EMPLOYEE ID CARD" : "SEARCH EMPLOYEE DIRECTORY"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SEARCH DIRECTORY VIEW (When no employee is selected yet) ── */}
        {!selectedId ? (
          <>
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
                  {searchTerm.trim() ? "No colleagues found matching your search." : "No colleagues found."}
                </div>
              ) : (
                <div className="space-y-2">
                  {directoryResults.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedId(emp.id)}
                      className="w-full p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 hover:border-purple-200 dark:hover:border-purple-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all flex items-center justify-between text-left group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RoyalAvatar
                          src={emp.profile_photo_path}
                          name={emp.name || `${emp.first_name} ${emp.last_name}`}
                          userId={emp.id}
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
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

            {/* Directory Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">Inter Smart Workforce Directory</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          /* ── ID CARD DETAILS VIEW (Fits perfectly on screen without scrolling) ── */
          <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 overflow-y-auto sm:overflow-hidden select-none">
            {loading && !profile ? (
              <div className="my-auto py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#56348f]" />
                <p className="text-xs font-semibold text-slate-500">Loading Employee Badge...</p>
              </div>
            ) : data ? (
              <>
                {/* Top Section: Corporate ID Badge Card */}
                <div className="space-y-4">
                  <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/70 to-[#FFF7D6] border border-amber-200/70 dark:border-amber-700/30 p-5 sm:p-6 shadow-sm">
                    {/* Organic Warm Golden Waves in Background (Right side swoop matching mockup) */}
                    <svg
                      className="absolute right-0 top-0 h-full w-[55%] pointer-events-none select-none opacity-80"
                      viewBox="0 0 220 180"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M60 0C110 40 150 30 135 95C120 160 50 135 25 180H220V0H60Z"
                        fill="#FDE68A"
                        fillOpacity="0.55"
                      />
                      <path
                        d="M120 0C155 35 180 45 165 105C150 165 100 145 75 180H220V0H120Z"
                        fill="#FCD34D"
                        fillOpacity="0.65"
                      />
                    </svg>

                    {/* Top-Right Employee Code Pill */}
                    {data.employee_code && (
                      <div className="absolute top-4 sm:top-5 right-4 sm:right-5 px-3 py-1 rounded-full bg-[#FEE082] text-xs font-black text-slate-900 shadow-2xs z-10 font-mono tracking-tight">
                        #{data.employee_code}
                      </div>
                    )}

                    {/* Profile Layout: Avatar on Left, Core Info on Right */}
                    <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                      {/* Avatar Squircle with thick white border, sky blue bg, and active green dot */}
                      <div className="relative shrink-0">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] bg-[#E0F2FE] border-[3.5px] border-white shadow-md overflow-hidden flex items-center justify-center">
                          <RoyalAvatar
                            src={data.profile_photo_path}
                            name={fullName}
                            userId={data.id}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white shadow-xs" />
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight leading-tight truncate">
                            <RoyalName name={fullName} userId={data.id} showCrownIcon={false} />
                          </h2>

                          {/* Designation Pill Badge (Real DB designation or role) */}
                          {(data.designation || data.role) && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EEF2FF] text-[#4F46E5] text-xs font-bold shadow-2xs max-w-full">
                              <Briefcase className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                              <span className="truncate">{data.designation || data.role}</span>
                            </div>
                          )}

                          {/* Real Email ID */}
                          {data.email && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span className="truncate select-all" title={data.email}>
                                {data.email}
                              </span>
                            </div>
                          )}

                          {/* Department & Role */}
                          {(data.team || (data.role && data.designation)) && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {data.team && <span className="truncate">{data.team}</span>}
                              {data.team && data.role && data.designation && <span className="text-slate-300">•</span>}
                              {data.role && data.designation && <span className="truncate">{data.role}</span>}
                            </div>
                          )}
                        </div>

                        {/* Tenure section bottom right (Real tenure from joining date) */}
                        {(data.tenure_text || data.tenure_years) ? (
                          <div className="mt-2.5 flex flex-col items-end">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#B45309]/80 mb-0.5 pr-2">
                              TENURE
                            </span>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-[#FDE68A] shadow-2xs">
                              <Sparkles className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                              <span className="text-xs font-black text-[#78350F]">
                                {data.tenure_text || `${data.tenure_years} Years`}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* ── METRICS ROW 1 (3 Columns with real data) ── */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Card 1: EMPLOYEE CODE */}
                    <div className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-purple-100/80 shadow-2xs flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mb-2.5">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                          EMPLOYEE CODE
                        </span>
                        <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1 leading-none">
                          {data.employee_code || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: JOINED DATE */}
                    <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-emerald-100/80 shadow-2xs flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center mb-2.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                          JOINED DATE
                        </span>
                        <p className="text-xs sm:text-sm font-black text-slate-900 mt-1 leading-none truncate">
                          {data.joining_date ? formatDateString(data.joining_date) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Card 3: EXPERIENCE */}
                    <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-amber-100/80 shadow-2xs flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-2.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                          EXPERIENCE
                        </span>
                        <p className="text-xs sm:text-sm font-black text-slate-900 mt-1 leading-none truncate">
                          {data.tenure_text || (data.tenure_years ? `${data.tenure_years} Years` : (data.joining_date ? "Recently Joined" : "—"))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── METRICS ROW 2 (Blood Group with real data + Motivational Watermark) ── */}
                  <div className="flex items-center gap-3 relative">
                    {/* Card 4: BLOOD GROUP */}
                    <div className="p-3.5 rounded-2xl bg-[#F0F9FF] border border-sky-100/80 shadow-2xs flex flex-col justify-between w-[58%] shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mb-2.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">
                          BLOOD GROUP
                        </span>
                        <p className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-none">
                          {data.blood_group || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Motivational Illustration matching mockup */}
                    <div className="flex-1 flex flex-col items-center justify-center relative select-none pointer-events-none py-2">
                      <div className="relative text-center pr-2">
                        <p className="italic text-slate-400 text-xs sm:text-sm font-bold tracking-wide leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                          Great People
                        </p>
                        <p className="italic text-slate-500 text-xs sm:text-sm font-extrabold tracking-wide leading-tight mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
                          Build Great Things
                        </p>
                        <svg className="w-24 h-2 mx-auto mt-1 text-slate-300" viewBox="0 0 100 8" fill="none">
                          <path d="M2 6C30 1 70 1 98 5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="absolute top-1 right-2 sm:right-4">
                        <Send className="w-5 h-5 text-amber-500 fill-amber-100 -rotate-12" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Link */}
                <div className="pt-4 flex items-center justify-between shrink-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs sm:text-sm text-[#7C3AED] hover:text-purple-800 font-bold hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    ← Search another colleague
                  </button>
                </div>
              </>
            ) : (
              <div className="my-auto py-24 text-center text-xs text-slate-500">
                Employee profile could not be loaded.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeIdCardDrawer;
