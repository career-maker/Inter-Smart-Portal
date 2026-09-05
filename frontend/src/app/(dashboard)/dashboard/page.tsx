"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardPageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import {
  CalendarDays,
  Clock,
  Briefcase,
  Palmtree,
  FileText,
  Download,
  Megaphone,
  BookOpen,
  UserCircle,
  Building2,
  Fingerprint,
  ChevronRight,
  MessageSquare,
  Gift,
  Plus,
  PartyPopper,
  Home,
  AlertCircle,
  ArrowRight,
  Award,
  Sparkles,
  Activity,
  ShieldAlert,
  Trophy,
  Medal,
  Crown,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Server,
  Users
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AttendanceWidget } from "@/components/dashboard/AttendanceWidget";
import { CertificateModal } from "@/components/recognition/CertificateModal";
import { AchievementFlipCard } from "@/components/recognition/AchievementFlipCard";
import { LeaderboardWidget } from "@/components/dashboard/LeaderboardWidget";
import { EmergencyContactsCard } from "@/components/dashboard/EmergencyContactsCard";
import { UpcomingBirthdaysWithWishes } from "@/components/dashboard/UpcomingBirthdaysWithWishes";
import { UpcomingHolidaysCard } from "@/components/dashboard/UpcomingHolidaysCard";
import { NetworkErrorWithGame } from "@/components/ui/NetworkErrorWithGame";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { useTopAwardee } from "@/context/TopAwardeeContext";
import { EmployeeAttendanceDrawer } from "@/components/attendance/EmployeeAttendanceDrawer";


export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [leaveModalData, setLeaveModalData] = useState<{title: string, list: any[]} | null>(null);
  const [currentRecognitionIndex, setCurrentRecognitionIndex] = useState(0);
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [liveServiceStats, setLiveServiceStats] = useState<any>(null);
  const [selectedTeamMemberForPunches, setSelectedTeamMemberForPunches] = useState<any | null>(null);

  const leaveSummaryRef = useRef<HTMLDivElement>(null);
  const [isLeaveSummaryVisible, setIsLeaveSummaryVisible] = useState(false);

  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsLeaveSummaryVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    if (leaveSummaryRef.current) {
      observer.observe(leaveSummaryRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Add cache-busting timestamp to force fresh data from server
      const res = await api.get("/dashboard", {
        params: { _t: Date.now() }
      });
      setData(res.data);
      // Synchronize auth store if server profile role or id differs from local store
      if (res.data?.profile) {
        const profileRole = res.data.profile.role;
        const profileId = res.data.profile.id;
        const currentUser = useAuthStore.getState().user;
        if (
          (profileRole && currentUser?.role !== profileRole) ||
          (profileId && currentUser?.id !== profileId)
        ) {
          useAuthStore.setState({
            user: {
              ...(currentUser || {}),
              id: profileId || currentUser?.id,
              role: profileRole || currentUser?.role,
              first_name: res.data.profile.first_name || currentUser?.first_name,
              last_name: res.data.profile.last_name || currentUser?.last_name,
              designation: res.data.profile.designation || currentUser?.designation,
              profile_photo_path: res.data.profile.profile_photo_path || currentUser?.profile_photo_path,
            } as any
          });
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch dashboard data", e);
      setError(e.response?.data?.message || e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // Refresh dashboard data every 5 minutes to handle day changes (especially after midnight)
    const interval = setInterval(() => {
      fetchDashboard();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Calculate live service stats with timer
  const calculateServiceStats = (joiningDateStr: string) => {
    if (!joiningDateStr) return null;

    try {
      // Handle different date formats
      let joiningDate = new Date(joiningDateStr);

      // If parsing failed, try parsing as YYYY-MM-DD format
      if (isNaN(joiningDate.getTime())) {
        const parts = joiningDateStr.split('-');
        if (parts.length === 3) {
          joiningDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
      }

      if (isNaN(joiningDate.getTime())) {
        console.warn("Invalid joining date format:", joiningDateStr);
        return null;
      }

      const now = new Date();

      let years = now.getFullYear() - joiningDate.getFullYear();
      let months = now.getMonth() - joiningDate.getMonth();
      let days = now.getDate() - joiningDate.getDate();
      let hours = now.getHours() - joiningDate.getHours();
      let minutes = now.getMinutes() - joiningDate.getMinutes();
      let seconds = now.getSeconds() - joiningDate.getSeconds();

      if (seconds < 0) {
        seconds += 60;
        minutes -= 1;
      }
      if (minutes < 0) {
        minutes += 60;
        hours -= 1;
      }
      if (hours < 0) {
        hours += 24;
        days -= 1;
      }
      if (days < 0) {
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
        months -= 1;
      }
      if (months < 0) {
        months += 12;
        years -= 1;
      }

      return { years, months, days, hours, minutes, seconds };
    } catch (error) {
      console.error("Error calculating service stats:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!data?.profile?.joining_date) {
      console.log("No joining date available");
      return;
    }

    console.log("Calculating service stats for:", data.profile.joining_date);

    // Calculate and set immediately
    const stats = calculateServiceStats(data.profile.joining_date);
    console.log("Calculated stats:", stats);
    if (stats) {
      setLiveServiceStats(stats);
    }

    // Update every second
    const interval = setInterval(() => {
      const updatedStats = calculateServiceStats(data.profile.joining_date);
      if (updatedStats) {
        setLiveServiceStats(updatedStats);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.profile?.joining_date]);

  if (loading) return <DashboardPageLoader />;

  if (error || !data) {
    return <NetworkErrorWithGame onRetry={fetchDashboard} errorMessage={error || undefined} />;
  }

  const { profile, leave_metrics, widgets } = data;
  
  const hour = time.getHours();
  let greeting = "Good Evening";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";

  const effectiveRole = data?.profile?.role || user?.role;

  if (effectiveRole === "Super Admin" && data.admin_data) {
    return (
      <SuperAdminDashboard
        data={data}
        user={user}
        time={time}
        greeting={greeting}
        leaveSummaryRef={leaveSummaryRef}
        isLeaveSummaryVisible={isLeaveSummaryVisible}
      />
    );
  }

  const hasActiveRec = !!profile.active_recognition;

  // Role-specific header color
  const getRoleHeaderColor = () => {
    switch (user?.role) {
      case "Super Admin":
        return "from-red-50 to-orange-50 border-red-200 dark:from-red-900/20 dark:to-orange-900/20 dark:border-red-500/30";
      case "Team Lead":
        return "from-blue-50 to-cyan-50 border-blue-200 dark:from-blue-900/20 dark:to-cyan-900/20 dark:border-blue-500/30";
      default:
        return "from-slate-100 to-white border-slate-200 dark:from-amber-900/20 dark:to-yellow-900/20 dark:border-amber-500/30";
    }
  };

  const getRoleAccentColor = () => {
    switch (user?.role) {
      case "Super Admin":
        return "text-red-400";
      case "Team Lead":
        return "text-blue-400";
      default:
        return "text-amber-400";
    }
  };

  // Employee Dashboard specific helper functions
  const getLeaveBalancePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, (used / total) * 100);
  };

  const daysUntilCarryForwardExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─────────────────────────────────────────────────────────────────────────────
          KEKA-STYLE WELCOME HERO BANNER (TOP OF DASHBOARD FOR ALL USERS)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div
        id="keka-welcome-hero-banner"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(12, 24, 45, 0.92) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(12, 24, 45, 0.92) 100%), url('/welcome-banner-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
        className="relative rounded-md overflow-hidden shadow-xl p-6 sm:p-8 min-h-[160px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border border-white/15 select-none"
      >
        <style>{`
          #keka-welcome-hero-banner, #keka-welcome-hero-banner * {
            box-sizing: border-box;
          }
          #keka-welcome-hero-banner a,
          #keka-welcome-hero-banner h1,
          #keka-welcome-hero-banner h2,
          #keka-welcome-hero-banner h3 {
            color: #ffffff !important;
          }
          #keka-welcome-hero-banner .hero-user-name,
          #keka-welcome-hero-banner .hero-user-name * {
            color: #ffffff !important;
          }
          #keka-welcome-hero-banner .hero-subtitle,
          #keka-welcome-hero-banner .hero-subtitle * {
            color: rgba(255, 255, 255, 0.95) !important;
          }
          #keka-welcome-hero-banner .hero-datetime,
          #keka-welcome-hero-banner .hero-datetime * {
            color: rgba(255, 255, 255, 0.90) !important;
          }
          #keka-welcome-hero-banner .hero-growing-title {
            color: #fde047 !important;
          }
          #keka-welcome-hero-banner .hero-stat-box {
            background-color: rgba(0, 0, 0, 0.6) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
          }
          #keka-welcome-hero-banner .hero-stat-value {
            color: #ffffff !important;
          }
          #keka-welcome-hero-banner .hero-stat-label {
            color: #cbd5e1 !important;
          }
          #keka-welcome-hero-banner .status-punched-in,
          #keka-welcome-hero-banner .status-punched-in * {
            color: #6ee7b7 !important;
          }
          #keka-welcome-hero-banner .status-punched-out,
          #keka-welcome-hero-banner .status-punched-out * {
            color: #fde047 !important;
          }
          #keka-welcome-hero-banner .status-not-punched,
          #keka-welcome-hero-banner .status-not-punched * {
            color: #fecdd3 !important;
          }
        `}</style>

        {/* Left: Avatar, Name, Role, Location, Attendance Status & Clock */}
        <div className="flex items-center gap-5 sm:gap-6 z-10 min-w-0">
          <div className="relative shrink-0">
            <RoyalAvatar
              src={profile.profile_photo_path}
              name={`${profile.first_name} ${profile.last_name || ""}`.trim()}
              userId={user?.id || profile?.id}
              employeeCode={profile?.employee_code || (user as any)?.employee_code}
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-white/80 shadow-2xl shrink-0"
              textClass="text-white text-xl font-bold"
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            {/* User Full Name with external link icon & achievement badge */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/profile"
                style={{ color: "#ffffff" }}
                className="hero-user-name text-2xl sm:text-3xl font-bold text-white hover:text-amber-300 transition-colors flex items-center gap-2 group truncate cursor-pointer"
              >
                <span style={{ color: "#ffffff" }} className="truncate font-bold">
                  {profile.first_name} {profile.last_name || ""}
                </span>
                <svg className="w-4 h-4 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              {/* Active Achievement Animating Trophy Badge */}
              {hasActiveRec && profile.active_recognition && (
                <button
                  onClick={() => setShowRecognitionModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 hover:from-amber-500/35 hover:to-amber-500/35 text-amber-300 border border-amber-400/50 rounded-full text-xs font-black shadow-[0_0_14px_rgba(245,158,11,0.35)] transition-all transform hover:scale-105 cursor-pointer shrink-0"
                  title={`${profile.active_recognition.title} - Click to view certificate`}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <DotLottiePlayer
                      src="https://assets2.lottiefiles.com/packages/lf20_touohxv0.json"
                      background="transparent"
                      speed={1}
                      style={{ width: 18, height: 18 }}
                      loop
                      autoplay
                    />
                  </div>
                  <span className="tracking-wide uppercase text-[10.5px] font-black drop-shadow-sm">
                    {profile.active_recognition.title}
                  </span>
                </button>
              )}
            </div>

            {/* Subtitle: Role • Location with Exact Proxima Nova 13px / 20px typography */}
            <p
              style={{
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "13px",
                lineHeight: "20px",
                color: "rgba(255, 255, 255, 0.95)",
                fontWeight: 400
              }}
              className="hero-subtitle flex items-center gap-2 flex-wrap"
            >
              <span style={{ color: "rgba(255, 255, 255, 0.95)" }}>{profile.designation || user?.role || "Member"}</span>
              <span style={{ color: "rgba(255, 255, 255, 0.60)" }}>•</span>
              <span style={{ color: "rgba(255, 255, 255, 0.95)" }}>Inter Smart, Kochi</span>
            </p>

            {/* Team Lead Badge & Direct Contact Button for Employees */}
            {profile?.team_lead && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white max-w-full flex-wrap">
                <span className="text-[11px] text-purple-200 font-bold uppercase tracking-wider">
                  Lead:
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <RoyalAvatar
                    src={profile.team_lead.profile_photo_path}
                    name={profile.team_lead.name}
                    userId={profile.team_lead.id}
                    className="w-5 h-5 rounded-full ring-1 ring-white/60 shrink-0"
                  />
                  <span className="font-bold text-white text-xs truncate">
                    {profile.team_lead.name}
                  </span>
                </div>
                <Link
                  href={`/community?tab=chat&userId=${profile.team_lead.id}`}
                  style={{ color: "#ffffff" }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#56348f] hover:bg-[#6e43b6] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer border border-purple-400/50 hover:scale-105 ml-1 shrink-0"
                  title={`Direct Message ${profile.team_lead.name}`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Contact</span>
                </Link>
              </div>
            )}

            {/* Attendance Status Badge & Real-time Date Time */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <span
                style={{
                  fontSize: "11px",
                  lineHeight: "16px",
                  backgroundColor:
                    profile.attendance_status === 'Punched In'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : profile.attendance_status === 'Punched Out'
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(225, 29, 72, 0.25)',
                  borderColor:
                    profile.attendance_status === 'Punched In'
                      ? 'rgba(52, 211, 153, 0.8)'
                      : profile.attendance_status === 'Punched Out'
                      ? 'rgba(253, 224, 71, 0.8)'
                      : 'rgba(251, 113, 133, 0.8)',
                  color:
                    profile.attendance_status === 'Punched In'
                      ? '#6ee7b7'
                      : profile.attendance_status === 'Punched Out'
                      ? '#fde047'
                      : '#fecdd3'
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                  profile.attendance_status === 'Punched In'
                    ? 'status-punched-in'
                    : profile.attendance_status === 'Punched Out'
                    ? 'status-punched-out'
                    : 'status-not-punched'
                }`}
              >
                {profile.attendance_status === 'Punched In' && (
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                )}
                <Clock
                  className="w-3.5 h-3.5 shrink-0"
                  style={{
                    color:
                      profile.attendance_status === 'Punched In'
                        ? '#6ee7b7'
                        : profile.attendance_status === 'Punched Out'
                        ? '#fde047'
                        : '#fecdd3'
                  }}
                />
                <span
                  style={{
                    color:
                      profile.attendance_status === 'Punched In'
                        ? '#6ee7b7'
                        : profile.attendance_status === 'Punched Out'
                        ? '#fde047'
                        : '#fecdd3',
                    fontWeight: 700
                  }}
                >
                  {profile.attendance_status}
                </span>
              </span>

              <span
                style={{
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "rgba(255, 255, 255, 0.90)"
                }}
                className="hero-datetime font-medium"
              >
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm:ss a")}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Growing Together Card with 6 Metrics Boxes & Live Clock */}
        {profile.service_stats && (
          <div className="z-10 shrink-0">
            <GrowingTogetherCard
              liveStats={liveServiceStats}
              defaultStats={profile.service_stats}
            />
          </div>
        )}
      </div>

      {/* Employee Dashboard: Upcoming Holidays Banner */}
      {user?.role === "Employee" && data?.widgets?.upcoming_holidays && data.widgets.upcoming_holidays.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50/60 to-purple-50 dark:from-rose-950/20 dark:via-amber-950/20 dark:to-purple-950/20 border border-rose-200/90 dark:border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-slideDown mb-6 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-lg shadow-2xs flex-shrink-0">
              🎉
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" /> Upcoming Celebration
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {data.widgets.upcoming_holidays[0]?.name}
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                  • {format(parseISO(data.widgets.upcoming_holidays[0]?.date), "EEEE, MMM d, yyyy")}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/holidays"
            className="flex-shrink-0 text-xs font-bold text-[#56348f] dark:text-purple-300 hover:underline px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-200/80 dark:border-purple-800 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors"
          >
            View Calendar →
          </Link>
        </div>
      )}

      {/* Super Admin Dashboard: Critical Alerts Banner */}
      {user?.role === "Super Admin" && data?.widgets?.critical_alerts && Array.isArray(data.widgets.critical_alerts) && data.widgets.critical_alerts.length > 0 && (
        <div className="bg-gradient-to-br from-red-900/30 to-rose-900/30 rounded-md p-4 border border-red-500/40 mb-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-300 mb-2">Critical Alerts</p>
              <ul className="space-y-1">
                {data.widgets.critical_alerts.slice(0, 3).map((alert: any, idx: number) => (
                  <li key={idx} className="text-xs text-red-200 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{alert.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/*
        ===================================================================
        SEAMLESS DASHBOARD GRID (ZERO GAPS - CONTINUOUS COLUMNS)
        ===================================================================
      */}
      <div className="space-y-6 mb-8">
        
        {/* ── ROW 1 (Team Lead only): Team Status Today + Pending Approvals ── */}
        {user?.role === "Team Lead" && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Team Status Today Card */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                    <div>
                      <h2 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                        <Briefcase className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                        Team Status Today
                      </h2>
                      <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                        Daily attendance and availability breakdown
                      </p>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Absent
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> WFH
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Half Day
                      </span>
                    </div>
                  </div>
      
                  {data?.widgets?.team_members && data.widgets.team_members.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                      {data.widgets.team_members.map((member: any) => {
                        const statusLower = (member.status || "").toLowerCase();
                        const isPresent = statusLower === "present";
                        const isWfh = statusLower === "wfh" || statusLower.includes("wfh");
                        const isHalfDay = statusLower.includes("half day");

                        const statusConfig = isPresent
                          ? { dot: "bg-emerald-500", label: "Present", text: "text-emerald-700 dark:text-emerald-400" }
                          : isWfh
                          ? { dot: "bg-blue-500", label: "WFH", text: "text-blue-700 dark:text-blue-400" }
                          : isHalfDay
                          ? { dot: "bg-amber-500", label: member.status, text: "text-amber-700 dark:text-amber-400" }
                          : { dot: "bg-rose-500", label: "Absent", text: "text-rose-700 dark:text-rose-400" };

                        return (
                          <button 
                            key={member.id} 
                            type="button"
                            onClick={() => setSelectedTeamMemberForPunches(member)}
                            className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-600/50 hover:shadow-xs transition-all duration-200 text-left cursor-pointer"
                            title={`Click to view punches for ${member.name} (${statusConfig.label})`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <RoyalAvatar
                                  src={member.profile_photo_path}
                                  name={member.name}
                                  userId={member.id}
                                  className="w-8 h-8 rounded-full"
                                />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 ${statusConfig.dot}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors">
                                  <RoyalName name={member.name} userId={member.id} showCrownIcon={false} />
                                </div>
                                <span className={`inline-flex items-center text-[10.5px] font-bold ${statusConfig.text}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600 group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors pl-2 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-1">No team members assigned</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Approvals Card */}
            <div className="lg:col-span-1 flex flex-col">
              <div className="bg-white dark:bg-slate-800 rounded-md p-5 sm:p-6 border border-slate-200/90 dark:border-slate-700/60 shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                        <Clock className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                        Pending Approvals
                      </h2>
                      <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                        Leave requests awaiting review
                      </p>
                    </div>
                    <Link href="/leaves/approvals" className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {data?.widgets?.pending_approvals && Array.isArray(data.widgets.pending_approvals) && data.widgets.pending_approvals.length > 0 ? (
                    <div className="space-y-2">
                      {data.widgets.pending_approvals.slice(0, 3).map((approval: any) => (
                        <div key={approval.id} className="bg-slate-50 dark:bg-white/5 rounded-md p-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200/60 dark:border-transparent">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{approval.employee_name}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">{approval.leave_type} • {format(parseISO(approval.start_date), "MMM d")} to {format(parseISO(approval.end_date), "MMM d")}</p>
                          </div>
                          <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-500/20 text-[#56348f] dark:text-purple-300 px-2.5 py-1 rounded-full shrink-0">{approval.days} d</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">No pending approvals 🎉</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN DASHBOARD GRID (Zero Gaps: Left Column & Right Column Flow Seamlessly) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── LEFT COLUMN (Spans 2 columns on desktop) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Attendance */}
            <AttendanceWidget
              initialData={data.attendance_widget_data}
              teamMembers={data?.widgets?.team_members}
              externalOpenMember={selectedTeamMemberForPunches}
              onClearExternalOpen={() => setSelectedTeamMemberForPunches(null)}
            />

            {/* Latest Updates (Moves directly below Today's Attendance - zero gap!) */}
            {widgets.company_updates.length > 1 ? (
              <RotatingCard
                title="Latest Updates"
                subtitle="Company announcements and news"
                icon={Megaphone}
                iconColorClass="text-[#56348f] dark:text-purple-400"
                items={widgets.company_updates}
                emptyMessage="No announcements yet"
                renderItem={(update) => (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight break-words">{update.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">{update.content || 'No description'}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                      <p className="text-xs text-slate-500">{format(parseISO(update.created_at), "MMM d, yyyy")}</p>
                      <Link href="/announcements" className="text-xs font-semibold text-[#56348f] dark:text-purple-400 hover:underline">View →</Link>
                    </div>
                  </div>
                )}
              />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-md p-5 sm:p-6 border border-slate-200/90 dark:border-slate-700/60 shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                        <Megaphone className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                        Latest Updates
                      </h3>
                      <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                        Important company announcements and news
                      </p>
                    </div>
                    <Link href="/announcements" className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline">View All</Link>
                  </div>
                  <div className="space-y-3">
                    {widgets.company_updates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Megaphone className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">No announcements yet</p>
                        <p className="text-xs text-slate-400 mt-1">Updates will appear here</p>
                      </div>
                    ) : (
                      widgets.company_updates.slice(0, 2).map((update: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-200/60 dark:border-slate-800 transition-colors">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-slate-900 dark:text-white leading-tight">{update.title}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{update.content}</p>
                            <p className="text-[11px] text-slate-400 mt-1.5">{format(parseISO(update.created_at), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Side-by-Side: Work Anniversaries & Upcoming Birthdays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Work Anniversaries */}
              {(() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const filteredAnni = (widgets.anniversaries || []).filter((a: any) => {
                  const d = new Date(a.date); d.setHours(0,0,0,0);
                  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                  return diff >= 0 && diff <= 14;
                }).map((a: any) => {
                  const d = new Date(a.date); d.setHours(0,0,0,0);
                  return { ...a, days_remaining: Math.round((d.getTime() - today.getTime()) / 86400000) };
                });
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm min-h-[240px] flex flex-col justify-between">
                    <div>
                      <div className="mb-3">
                        <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                          <PartyPopper className="w-4 h-4 text-pink-500" />
                          Work Anniversaries
                        </h3>
                        <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                          Upcoming work milestones in 14 days
                        </p>
                      </div>
                      {filteredAnni.length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">No work anniversaries in the next 2 weeks.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredAnni.slice(0, 3).map((a: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800">
                              <div>
                                <p className="text-[13px] font-medium text-slate-900 dark:text-white">🎉 {a.name}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{a.years} Year{a.years !== 1 ? 's' : ''} at Inter Smart</p>
                              </div>
                              <span className="text-[11px] font-semibold bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full">
                                {format(new Date(a.date), "MMM d")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Upcoming Birthdays with Wishes */}
              <div className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm min-h-[240px] flex flex-col justify-between">
                <UpcomingBirthdaysWithWishes items={widgets.upcoming_birthdays} />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (Spans 1 column on desktop) ── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Emergency Contacts Card */}
            <EmergencyContactsCard />

            {/* Wall of Fame / Leaderboard Widget */}
            <LeaderboardWidget />
          </div>
        </div>
      </div>

      {/* Super Admin Analytics (Rendered for Super Admin below main grid) */}
      {user?.role === "Super Admin" && data && (
        <div className="space-y-6 mb-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: data?.widgets?.total_employees ?? 0, trend: 2, direction: 'up' },
              { label: 'Active Employees', value: data?.widgets?.active_employees ?? 0, trend: -1, direction: 'down' },
              { label: 'Today Absent', value: data?.widgets?.absent_today ?? 0, trend: -5, direction: 'down' },
              { label: 'Pending Leaves', value: data?.widgets?.pending_leave_requests ?? 0, trend: 3, direction: 'up' }
            ].map((metric, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-md p-4 border border-slate-200/90 dark:border-slate-700/60 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{metric.label}</p>
                <div className="flex items-end justify-between">
                  <p
                    style={{
                      fontFamily: '"Proxima Nova", sans-serif',
                      fontSize: "28px",
                      lineHeight: "40px",
                      fontWeight: 600,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:!text-white tracking-tight"
                  >
                    {Number.isNaN(metric.value) ? 0 : metric.value}
                  </p>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${metric.direction === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {metric.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{Math.abs(metric.trend)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Audit Logs */}
          <div className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                  <Layers className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                  Recent Audit Logs
                </h3>
                <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                  System activities and audit trail
                </p>
              </div>
              <Link href="/audit-logs" className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {data?.widgets?.recent_audit_logs && Array.isArray(data.widgets.recent_audit_logs) && data.widgets.recent_audit_logs.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.widgets.recent_audit_logs.slice(0, 8).map((log: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 rounded-md p-3 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#56348f] rounded-full flex-shrink-0 mt-1.5"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{log.action || 'System Action'}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{log.description || log.user_name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{log.created_at ? format(parseISO(log.created_at), "MMM d, h:mm a") : 'Unknown time'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">No recent audit logs</p>
            )}
          </div>
        </div>
      )}

      {/* Active Certificate Modal Popup */}
      {showRecognitionModal && profile.active_recognition && (
        <CertificateModal
          recognition={profile.active_recognition}
          employeeName={`${profile.first_name} ${profile.last_name || ""}`.trim()}
          onClose={() => setShowRecognitionModal(false)}
        />
      )}

      {/* 
        ========================================
        MAIN CONTENT SPLIT (Left: Menu, Right: Metrics)
        ========================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* LEFT / CENTER: MAIN MENU HUB (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MenuCard 
              href="/leaves" 
              icon={Palmtree} 
              title="Leaves & WFH" 
              subtitle="Apply & view status"
              color="emerald" 
            />
            <MenuCard 
              href="/announcements" 
              icon={Megaphone} 
              title="Updates" 
              subtitle="Company news"
              color="blue" 
            />
            <MenuCard 
              href="/calendar" 
              icon={CalendarDays} 
              title="Leave Calendar" 
              subtitle="Your schedule"
              color="violet" 
            />
            <MenuCard 
              href="/documents" 
              icon={FileText} 
              title="Request HR Documents" 
              subtitle="Request letters"
              color="amber" 
            />
            <MenuCard 
              href="/documents" 
              icon={Download} 
              title="Downloads" 
              subtitle="Approved files"
              color="rose" 
            />
            <MenuCard 
              href="/policies" 
              icon={BookOpen} 
              title="HR Policies" 
              subtitle="Rules & guidelines"
              color="cyan" 
            />
            <MenuCard 
              href="/profile" 
              icon={UserCircle} 
              title="My Profile" 
              subtitle="View details"
              color="indigo" 
              className="md:col-span-2 lg:col-span-1"
            />
            
            <Link 
              href="/hall"
              className="md:col-span-3 lg:col-span-2 group relative overflow-hidden rounded-md p-6 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:shadow-md dark:hover:bg-slate-700 transition-all duration-300 border border-slate-200 dark:border-slate-700/60"
            >
              <div className="absolute -bottom-10 -left-10 w-6 h-6 rounded-full scale-0 group-hover:scale-[35] transition-transform duration-700 ease-out bg-indigo-50 z-0 dark:hidden" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/50 dark:bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-slate-200/50 dark:group-hover:bg-white/10 transition-colors z-0"></div>
              <div className="relative z-10 flex items-center justify-between h-full">
                <div className="space-y-1">
                  {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium uppercase tracking-wider">Management Only</span>
                    </div>
                  )}
                  <h3
                    style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }}
                    className="dark:text-white leading-tight box-title"
                  >
                    View The Hall
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-sm group-hover:scale-95 transition-transform">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 
          ========================================
          RIGHT: UPCOMING HOLIDAYS (4 Cols)
          ========================================
        */}
        <div className="lg:col-span-4 space-y-8">
          {/* Upcoming Holidays */}
          <UpcomingHolidaysCard holidays={widgets.upcoming_holidays || []} />
        </div>

      </div>

      {/* 
        ========================================
        BOTTOM: FULL-WIDTH HORIZONTAL LEAVE SUMMARY
        ========================================
      */}
      <div ref={leaveSummaryRef} className="premium-card wave-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left section: title and stats grid */}
          <div className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Leave Summary
            </h2>

            {/* Probation notice */}
            {leave_metrics.is_in_probation && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-4 text-amber-300 text-sm space-y-1">
                <p className="font-bold flex items-center gap-2">🔒 Currently Under Probation</p>
                <p className="text-amber-300/80 text-xs">Paid leave benefits will become active on <strong className="text-amber-200">{new Date(leave_metrics.probation_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>. All leaves during probation are treated as Unpaid (LOP).</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Casual Leave Indicator */}
              <div className="flex items-center justify-between p-4 rounded-md bg-white/5 border border-slate-200 dark:border-white/10 group hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Casual Leaves</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{Math.max(0, leave_metrics.casual_leave_balance)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Palmtree className="w-5 h-5" />
                </div>
              </div>

              {/* Sick Leave Indicator */}
              <div className="flex items-center justify-between p-4 rounded-md bg-white/5 border border-slate-200 dark:border-white/10 group hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sick Leaves</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{Math.max(0, leave_metrics.sick_leave_balance)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Total Leaves Taken Indicator */}
              <div className="flex items-center justify-between p-4 rounded-md bg-white/5 border border-slate-200 dark:border-white/10 group hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Taken</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{Math.max(0, leave_metrics.total_leaves_taken)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Right section: pending notice and apply action */}
          <div className="flex flex-col justify-center items-stretch lg:items-end gap-3 shrink-0 min-w-[260px] w-full lg:w-auto pt-4 lg:pt-8">
            {leave_metrics.pending_leaves > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-md px-4 py-2 flex items-center gap-2 text-orange-400 text-xs justify-center lg:justify-start w-full">
                <Clock className="w-4 h-4 shrink-0 animate-pulse" />
                <span>{leave_metrics.pending_leaves} request(s) pending approval</span>
              </div>
            )}
            
            <Link 
              href="/leaves/apply" 
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold py-3.5 px-6 rounded-md hover:shadow-xl hover:shadow-amber-400/15 transition-all duration-300 active:scale-95 whitespace-nowrap"
            >
              <Palmtree className="w-5 h-5" />
              Apply for Leave
            </Link>
          </div>
        </div>
      </div>
      {/* Sticky floating mobile Apply Leave button */}
      {!isLeaveSummaryVisible && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Link
            href="/leaves/apply"
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-6 rounded-md shadow-xl shadow-amber-500/20 active:scale-95 transition-all duration-150 border border-amber-400/30"
          >
            <Plus className="w-5 h-5" />
            Apply Leave
          </Link>
        </div>
      )}
    </div>
  );
}

// Growing Together Card — Redesigned with 6 Metrics Boxes & Gold Accents
function GrowingTogetherCard({ liveStats, defaultStats }: { liveStats: any; defaultStats?: any }) {
  const current = liveStats || defaultStats;
  if (!current) return null;

  const years = current.years ?? 0;
  const months = current.months ?? 0;
  const days = current.days ?? 0;
  const hours = String(current.hours ?? 0).padStart(2, "0");
  const minutes = String(current.minutes ?? 0).padStart(2, "0");
  const seconds = String(current.seconds ?? 0).padStart(2, "0");

  const statBoxes = [
    { label: "YRS", value: years },
    { label: "MTH", value: months },
    { label: "DAYS", value: days },
    { label: "HRS", value: hours },
    { label: "MINS", value: minutes },
    { label: "SECS", value: seconds },
  ];

  return (
    <div className="w-full lg:w-auto bg-black/40 border border-white/15 rounded-md p-4 sm:p-4.5 shadow-2xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-6 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-amber-400/80 bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span style={{ fontFamily: '"Proxima Nova", sans-serif', color: '#fde047' }} className="hero-growing-title text-xs font-black uppercase tracking-wider">
            GROWING TOGETHER
          </span>
        </div>

        {/* Right Clock Icon */}
        <div className="flex items-center justify-center text-amber-300 pr-1">
          <Clock className="w-4 h-4 animate-spin [animation-duration:15s]" />
        </div>
      </div>

      {/* Horizontal Divider */}
      <div className="border-t border-white/10 my-2.5" />

      {/* 6 Stat Boxes */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {statBoxes.map((box, idx) => (
          <div
            key={idx}
            className="hero-stat-box rounded-md py-2 px-2 sm:px-2.5 flex flex-col items-center justify-center text-center min-w-[44px] sm:min-w-[50px] shadow-inner border border-white/15"
          >
            <span style={{ color: "#ffffff" }} className="hero-stat-value text-lg sm:text-xl font-black font-mono leading-none tracking-tight">
              {box.value}
            </span>
            <span style={{ fontFamily: '"Proxima Nova", sans-serif', color: "#cbd5e1" }} className="hero-stat-label text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-widest mt-1 leading-none">
              {box.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Avatar that always shows initials underneath — photo overlays on top, hidden on error
function PhotoAvatar({ src, name, className = "", textClass = "" }: { src?: string|null; name: string; className?: string; textClass?: string }) {
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div className={`relative overflow-hidden flex items-center justify-center font-bold ${className}`}>
      <span className={textClass}>{initials}</span>
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
  );
}

function SuperAdminDashboard({ data, user, time, greeting, leaveSummaryRef, isLeaveSummaryVisible }: any) {
  const { profile, admin_data, widgets } = data;
  const { kpis, activity_feed } = admin_data;
  const [leaveModalData, setLeaveModalData] = useState<{title: string, list: any[]} | null>(null);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState<any | null>(null);

  const handleSelectEmployee = async (item: any) => {
    if (item.id) {
      setSelectedEmployeeForAttendance(item);
      return;
    }
    // Fallback if ID was not in cached list: search by name
    try {
      const res = await api.get(`/employees?search=${encodeURIComponent(item.name)}`);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const matched = list.find((e: any) =>
        `${e.first_name || ""} ${e.last_name || ""}`.trim().toLowerCase() === (item.name || "").trim().toLowerCase()
      ) || list[0];
      if (matched) {
        setSelectedEmployeeForAttendance({
          ...matched,
          name: `${matched.first_name} ${matched.last_name}`,
        });
      } else {
        setSelectedEmployeeForAttendance(item);
      }
    } catch {
      setSelectedEmployeeForAttendance(item);
    }
  };
  
  const [activityPage, setActivityPage] = useState(1);
  const activityPerPage = 5;
  const totalActivityPages = Math.ceil(activity_feed.length / activityPerPage);
  const paginatedActivity = activity_feed.slice((activityPage - 1) * activityPerPage, activityPage * activityPerPage);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─────────────────────────────────────────────────────────────────────────────
          SUPER ADMIN KEKA-STYLE WELCOME HERO BANNER (MATCHING ALL ROLES)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div
        id="keka-welcome-hero-banner"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(12, 24, 45, 0.92) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(12, 24, 45, 0.92) 100%), url('/welcome-banner-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
        className="relative rounded-md overflow-hidden shadow-xl p-6 sm:p-8 min-h-[160px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border border-white/15 select-none"
      >
        <style>{`
          #keka-welcome-hero-banner, #keka-welcome-hero-banner * {
            box-sizing: border-box;
          }
          #keka-welcome-hero-banner a,
          #keka-welcome-hero-banner h1,
          #keka-welcome-hero-banner h2,
          #keka-welcome-hero-banner h3 {
            color: #ffffff !important;
          }
          #keka-welcome-hero-banner .hero-user-name,
          #keka-welcome-hero-banner .hero-user-name * {
            color: #ffffff !important;
          }
          #keka-welcome-hero-banner .hero-subtitle,
          #keka-welcome-hero-banner .hero-subtitle * {
            color: rgba(255, 255, 255, 0.95) !important;
          }
          #keka-welcome-hero-banner .hero-datetime,
          #keka-welcome-hero-banner .hero-datetime * {
            color: rgba(255, 255, 255, 0.90) !important;
          }
          #keka-welcome-hero-banner .hero-growing-title {
            color: #fde047 !important;
          }
          #keka-welcome-hero-banner .hero-stat-box {
            background-color: rgba(0, 0, 0, 0.6) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
          }
          #keka-welcome-hero-banner .hero-stat-value {
            color: #ffffff !important;
          }
          #keka-welcome-hero-banner .hero-stat-label {
            color: #cbd5e1 !important;
          }
          #keka-welcome-hero-banner .status-punched-in,
          #keka-welcome-hero-banner .status-punched-in * {
            color: #6ee7b7 !important;
          }
          #keka-welcome-hero-banner .status-punched-out,
          #keka-welcome-hero-banner .status-punched-out * {
            color: #fde047 !important;
          }
          #keka-welcome-hero-banner .status-not-punched,
          #keka-welcome-hero-banner .status-not-punched * {
            color: #fecdd3 !important;
          }
        `}</style>

        {/* Left: Avatar, Name, Role, Location, Attendance Status & Clock */}
        <div className="flex items-center gap-5 sm:gap-6 z-10 min-w-0">
          <div className="relative shrink-0">
            <RoyalAvatar
              src={profile.profile_photo_path}
              name={`${profile.first_name} ${profile.last_name || ""}`.trim()}
              userId={user?.id || profile?.id}
              employeeCode={profile?.employee_code || (user as any)?.employee_code}
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-white/80 shadow-2xl shrink-0"
              textClass="text-white text-xl font-bold"
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            {/* User Full Name with external link icon & Admin badge */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/profile"
                style={{ color: "#ffffff" }}
                className="hero-user-name text-2xl sm:text-3xl font-bold text-white hover:text-amber-300 transition-colors flex items-center gap-2 group truncate cursor-pointer"
              >
                <span style={{ color: "#ffffff" }} className="truncate font-bold">
                  {profile.first_name} {profile.last_name || ""}
                </span>
                <svg className="w-4 h-4 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-400/40 shadow-xs">
                <Crown className="w-3 h-3 text-amber-300" />
                Super Admin
              </span>
            </div>

            {/* Subtitle: Role • Location */}
            <p
              style={{
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "13px",
                lineHeight: "20px",
                color: "rgba(255, 255, 255, 0.95)",
                fontWeight: 400
              }}
              className="hero-subtitle flex items-center gap-2 flex-wrap"
            >
              <span style={{ color: "rgba(255, 255, 255, 0.95)" }}>{profile.designation || "Super Administrator"}</span>
              <span style={{ color: "rgba(255, 255, 255, 0.60)" }}>•</span>
              <span style={{ color: "rgba(255, 255, 255, 0.95)" }}>Inter Smart, Kochi</span>
            </p>

            {/* Real-time Date Time (Attendance status hidden for Super Admin) */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <span
                style={{
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "rgba(255, 255, 255, 0.90)"
                }}
                className="hero-datetime font-medium"
              >
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm:ss a")}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Pending Items Card Only (Growing Together hidden for Super Admin) */}
        <div className="z-10 shrink-0">
          <Link
            href="/leaves/approvals"
            className="group flex flex-col justify-center bg-black/40 border border-white/15 hover:border-amber-400/50 transition-all duration-300 rounded-md p-5 sm:p-6 shadow-2xl backdrop-blur-md cursor-pointer text-white min-w-[180px]"
          >
            <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Pending Items
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-black text-white font-mono">
                {kpis.pending_requests}
              </p>
              <p className="text-xs text-slate-300 font-semibold">request{kpis.pending_requests !== 1 ? 's' : ''}</p>
            </div>
            <p className="text-xs text-slate-300 mt-2 group-hover:text-amber-300 transition-colors">
              Awaiting review →
            </p>
          </Link>
        </div>
      </div>

      {/* KPI Cards (4 cols) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="Employees" value={kpis.total_employees} trend={kpis.trends.employees} icon={UserCircle} color="bg-blue-500" href="/employees" />
        <KPICard
          title="Essl Entries"
          value={kpis.present_today}
          trend={kpis.trends.attendance}
          icon={Fingerprint}
          color="bg-emerald-500"
          onClick={() => setLeaveModalData({
            title: "Essl Entries Today",
            list: kpis.present_today_list || []
          })}
        />
        <KPICard
          title="On Leave"
          value={kpis.on_leave_today}
          trend=""
          icon={Palmtree}
          color="bg-orange-500"
          onClick={() => setLeaveModalData({
            title: "On Leave Today",
            list: kpis.on_leave_today_list || []
          })}
        />
        <KPICard
          title="WFH"
          value={kpis.wfh_today}
          trend=""
          icon={Home}
          color="bg-cyan-500"
          onClick={() => setLeaveModalData({
            title: "Working From Home Today",
            list: kpis.wfh_today_list || []
          })}
        />

      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Employee Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-md p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <h2 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white mb-6 flex items-center gap-2 box-title">
            <Users className="w-5 h-5 text-blue-400" />
            Employee Status Distribution
          </h2>
          {kpis?.total_employees ? (
            <div className="h-80 flex flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={[
                      { name: 'Checked In', value: kpis.present_today ?? 0 },
                      { name: 'On Leave', value: kpis.on_leave_today ?? 0 },
                      { name: 'WFH', value: kpis.wfh_today ?? 0 },
                      { name: 'Not Checked In', value: Math.max(0, (kpis.total_employees ?? 0) - (kpis.present_today ?? 0) - (kpis.on_leave_today ?? 0) - (kpis.wfh_today ?? 0)) }
                    ]}
                    cx="50%"
                    cy="70%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={90}
                    outerRadius={120}
                    paddingAngle={2}
                    labelLine={false}
                    label={false}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#3B82F6" />
                    <Cell fill="#06B6D4" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${value} employees`}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 500 }}
                    labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                  />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" formatter={(value) => <span className="text-slate-600 dark:text-slate-400 text-sm">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400">No employee data available</div>
          )}
        </div>

        {/* Leave Requests Status Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-md p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <h2 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white mb-6 flex items-center gap-2 box-title">
            <Palmtree className="w-5 h-5 text-orange-400" />
            Leave Requests Today
          </h2>
          {kpis ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: 'Day 1', leaves: Math.max(0, (kpis.on_leave_today ?? 0) - 5) },
                    { name: 'Day 2', leaves: Math.max(0, (kpis.on_leave_today ?? 0) - 2) },
                    { name: 'Day 3', leaves: Math.max(0, (kpis.on_leave_today ?? 0) + 3) },
                    { name: 'Day 4', leaves: Math.max(0, (kpis.on_leave_today ?? 0) - 1) },
                    { name: 'Day 5', leaves: Math.max(0, (kpis.on_leave_today ?? 0) + 2) },
                    { name: 'Day 6', leaves: Math.max(0, (kpis.on_leave_today ?? 0) - 3) },
                    { name: 'Today', leaves: kpis.on_leave_today ?? 0 }
                  ]}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="monotone" dataKey="leaves" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeaves)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500 dark:text-slate-400">No data available</div>
          )}
        </div>
      </div>

      {/* 
        ========================================
        ENGAGEMENT SECTION: Updates, Celebrations, Birthdays
        ========================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-6">
        {/* Announcements — Rotating Card */}
        {widgets.company_updates.length > 1 ? (
          <RotatingCard
              title="Company Announcements"
              subtitle="Latest company news and updates"
              icon={Megaphone}
              iconColorClass="text-[#56348f] dark:text-purple-400"
              items={widgets.company_updates}
              emptyMessage="No announcements yet"
              renderItem={(update) => (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight break-words">{update.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">{update.content || 'No description'}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                    <p className="text-xs text-slate-500">{format(parseISO(update.created_at), "MMM d, yyyy")}</p>
                    <Link href="/announcements" className="text-xs font-semibold text-[#56348f] dark:text-purple-400 hover:underline">View →</Link>
                  </div>
                </div>
              )}
            />
        ) : (
          <div className="premium-card wave-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                  <Megaphone className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                  Company Announcements
                </h3>
                <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                  Latest company news and updates
                </p>
              </div>
              <Link href="/announcements" className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
                {widgets.company_updates.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent announcements.</p>
                ) : (
                  widgets.company_updates.slice(0, 1).map((update: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start border-b border-slate-200 dark:border-white/10 pb-3 last:border-0 last:pb-0">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-[#56348f] shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{update.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{format(new Date(update.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </div>
        )}

        {/* Work Anniversaries — rotating, 14-day filter */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const filteredAnni = (widgets.anniversaries || []).filter((a: any) => {
            const d = new Date(a.date); d.setHours(0,0,0,0);
            const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
            return diff >= 0 && diff <= 14;
          }).map((a: any) => {
            const d = new Date(a.date); d.setHours(0,0,0,0);
            return { ...a, days_remaining: Math.round((d.getTime() - today.getTime()) / 86400000) };
          });
          return (
            <RotatingCard
              title="Work Anniversaries"
              subtitle="Team milestones in the next 2 weeks"
              icon={PartyPopper}
              iconColorClass="text-pink-500 dark:text-pink-400"
              items={filteredAnni}
              emptyMessage="No work anniversaries in the next 2 weeks."
              renderItem={(a) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">🎉 {a.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.years} Year{a.years !== 1 ? 's' : ''} with Inter Smart</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{format(new Date(a.date), "MMM d")}</span>
                    {a.days_remaining === 0 ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-500 text-white px-2 py-0.5 rounded-lg">Today!</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-100 dark:bg-pink-500/30 text-pink-600 dark:text-pink-300 px-2 py-0.5 rounded-lg">In {Math.floor(a.days_remaining)} d</span>
                    )}
                  </div>
                </div>
              )}
            />
          );
        })()}

        {/* Upcoming Birthdays Widget with Wishes */}
        <div className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm min-h-[240px] flex flex-col justify-between">
          <UpcomingBirthdaysWithWishes items={widgets.upcoming_birthdays} />
        </div>

        {/* Leaderboard Widget */}
        <LeaderboardWidget />

        {/* Manage Employees Widget */}
        <Link href="/employees" className="block h-full group">
          <div className="premium-card p-6 h-full flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Manage Employees
                </h3>
                <span className="text-xs font-semibold text-emerald-400 group-hover:underline flex items-center gap-1">
                  Manage <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                View directory, create & edit employee profiles, and manage team allocations.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employee Directory</span>
              <span className="text-xs font-bold text-emerald-400">Go to section →</span>
            </div>
          </div>
        </Link>

        {/* Attendance Management Widget */}
        <Link href="/attendance/management" className="block h-full group">
          <div className="premium-card p-6 h-full flex flex-col justify-between hover:border-blue-500/40 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Attendance Management
                </h3>
                <span className="text-xs font-semibold text-blue-400 group-hover:underline flex items-center gap-1">
                  Manage <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Review daily attendance logs, biometric punches, check-in/out times & corrections.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Attendance</span>
              <span className="text-xs font-bold text-blue-400">Open Console →</span>
            </div>
          </div>
        </Link>
      </div>

      {/* 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* Left 70% (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
             {/* Quick Actions (Moved from right side to main area) */}
             <QuickActionCard href="/leaves" icon={Palmtree} title="Leaves" color="emerald" />
             <QuickActionCard href="/announcements" icon={Megaphone} title="Updates" color="blue" />
             <QuickActionCard href="/documents" icon={Download} title="Downloads" color="rose" />
             <QuickActionCard href="/policies" icon={BookOpen} title="Policies" color="cyan" />
             
             <Link 
              href="/hall" 
              className="lg:col-span-2 group relative overflow-hidden rounded-md p-6 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:shadow-md dark:hover:bg-slate-700 transition-all duration-300 border border-slate-200 dark:border-slate-700/60"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>
              <div className="relative z-10 flex items-center justify-between h-full">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white relative z-10">View The Hall</span>
                </div>
                <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-95 transition-transform">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Activity Feed */}
          <div className="premium-card wave-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                  <Activity className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                  Recent Activity
                </h3>
                <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                  Latest actions across the portal
                </p>
              </div>
              <Link href="/activities" className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline">View All</Link>
            </div>
            <div className="space-y-4">
              {paginatedActivity.map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.type === 'leave' ? 'bg-orange-500/20 text-orange-400' : act.type === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {act.type === 'leave' ? <Palmtree className="w-4 h-4"/> : act.type === 'user' ? <UserCircle className="w-4 h-4"/> : <BookOpen className="w-4 h-4"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{act.message}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(act.date), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
              {activity_feed.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity in the last 2 days.</p>}
              
              {/* Pagination */}
              {totalActivityPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className="text-xs font-semibold text-[#56348f] dark:text-purple-400 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Page {activityPage} of {totalActivityPages}</span>
                  <button
                    onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage === totalActivityPages}
                    className="text-xs font-semibold text-[#56348f] dark:text-purple-400 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right 30% (4 cols) */}
        <div className="lg:col-span-4 space-y-8">


          {/* Upcoming Holidays */}
          <UpcomingHolidaysCard holidays={widgets.upcoming_holidays || []} />

          {/* Leave Summary (Reused from regular dashboard) */}
           <div className="premium-card wave-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white flex items-center gap-2 box-title">
                  <CalendarDays className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Company Leave Overview
                </h3>
                <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
                  Leave summary for today
                </p>
              </div>
              <Link href="/manage-leaves" className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline">Manage</Link>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-md">
                 <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Pending Requests</span>
                 <span className="text-xl font-bold text-slate-900 dark:text-white">{kpis.pending_requests}</span>
               </div>
               <div className="flex justify-between items-center bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-md">
                 <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">On Leave Today</span>
                 <span className="text-xl font-bold text-slate-900 dark:text-white">{kpis.on_leave_today}</span>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Leave / Present Details Drawer Modal */}
      <Dialog
        open={!!leaveModalData && !selectedEmployeeForAttendance}
        onOpenChange={(open) => !open && setLeaveModalData(null)}
      >
        <DialogContent
          className="sm:max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-0 overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header with Royal Purple gradient accent matching other drawers */}
          <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 via-purple-50/30 to-white dark:from-slate-850 dark:to-slate-900 shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>{leaveModalData?.title}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#56348f]/10 text-[#56348f] dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50">
                  {leaveModalData?.list.length || 0}
                </span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click any employee to view their date-filtered attendance timeline
            </DialogDescription>
          </div>

          {/* Employee List Container */}
          <div className="flex-1 max-h-[calc(100vh-120px)] overflow-y-auto p-5 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
            {leaveModalData?.list.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No employees to show.
              </div>
            ) : (
              leaveModalData?.list.map((item: any, idx: number) => {
                const empId = item.id;
                const empCode = item.employee_code;
                const empName = item.name || `${item.first_name || ""} ${item.last_name || ""}`.trim();
                const empSubtitle = item.leave_type || item.designation || "Employee";

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectEmployee(item)}
                    className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-purple-50/50 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-200/80 hover:border-[#56348f]/40 dark:border-slate-700/80 dark:hover:border-purple-500/50 rounded-xl transition-all group text-left cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <RoyalAvatar
                        src={item.profile_photo_path}
                        name={empName}
                        userId={empId}
                        employeeCode={empCode}
                        className="w-10 h-10 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors truncate">
                          <RoyalName
                            name={empName}
                            userId={empId}
                            employeeCode={empCode}
                            className="font-bold"
                          />
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                          {empSubtitle}
                          {empCode ? ` • Code: ${empCode}` : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#56348f] dark:group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Attendance Side Popup Drawer */}
      <EmployeeAttendanceDrawer
        employee={selectedEmployeeForAttendance}
        isOpen={!!selectedEmployeeForAttendance}
        onClose={() => {
          setSelectedEmployeeForAttendance(null);
          setLeaveModalData(null);
        }}
        onBack={() => {
          setSelectedEmployeeForAttendance(null);
          // leaveModalData remains open so user seamlessly returns to Present Today list!
        }}
        backButtonLabel={leaveModalData ? `← Back to ${leaveModalData.title}` : "← Change Employee"}
      />
    </div>
  );
}

function KPICard({ title, value, trend, icon: Icon, color, href, onClick }: any) {
  const accentMap: Record<string, { icon: string; border: string; glow: string }> = {
    'bg-blue-500':    { icon: 'bg-blue-500/20 text-blue-400',     border: 'border-blue-500/25',    glow: 'shadow-blue-500/10' },
    'bg-emerald-500': { icon: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/10' },
    'bg-orange-500':  { icon: 'bg-orange-500/20 text-orange-400',  border: 'border-orange-500/25',  glow: 'shadow-orange-500/10' },
    'bg-cyan-500':    { icon: 'bg-cyan-500/20 text-cyan-400',      border: 'border-cyan-500/25',    glow: 'shadow-cyan-500/10' },
    'bg-rose-500':    { icon: 'bg-rose-500/20 text-rose-400',      border: 'border-rose-500/25',    glow: 'shadow-rose-500/10' },
  };
  const accent = accentMap[color] || accentMap['bg-blue-500'];

  const CardContent = (
    <div className={`wave-card relative overflow-hidden h-full rounded-md p-5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700/60 transition-all duration-300 ${(href || onClick) ? 'cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md' : ''}  `} style={{ '--wave-color': `var(--tw-color-${color.replace('bg-', '').replace('-500', '')}-50)` } as any}>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
          <h3
            style={{
              fontFamily: '"Proxima Nova", sans-serif',
              fontSize: "28px",
              lineHeight: "40px",
              fontWeight: 600,
              color: "rgb(15, 24, 36)",
            }}
            className="kpi-number dark:!text-white tracking-tight"
          >
            {value}
          </h3>
        </div>
        <div className={`w-11 h-11 rounded-md flex items-center justify-center ${accent.icon} shadow-sm ${(href || onClick) ? 'group-hover:scale-90 transition-transform duration-300' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend ? (
        <div className={`mt-2 text-xs font-bold flex items-center gap-1 ${trend.startsWith('+') ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
          <span>{trend.startsWith('+') ? '▲' : '▼'}</span>
          {trend} from yesterday
        </div>
      ) : (
        <div className="mt-2 h-4" aria-hidden="true" />
      )}
    </div>
  );

  if (href && !onClick) return <Link href={href} className="block h-full">{CardContent}</Link>;
  if (onClick) return <div onClick={onClick} className="block h-full w-full text-left">{CardContent}</div>;
  return CardContent;
}

function QuickActionCard({ href, icon: Icon, title, color }: any) {
  const iconAccent: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue:    'bg-blue-500/20 text-blue-400',
    violet:  'bg-violet-500/20 text-violet-400',
    amber:   'bg-amber-500/20 text-amber-400',
    rose:    'bg-rose-500/20 text-rose-400',
    cyan:    'bg-cyan-500/20 text-cyan-400',
    slate:   'bg-slate-500/20 text-slate-300',
  };
  const waveBgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-transparent',
    blue:    'bg-blue-50 dark:bg-transparent',
    violet:  'bg-violet-50 dark:bg-transparent',
    amber:   'bg-amber-50 dark:bg-transparent',
    rose:    'bg-rose-50 dark:bg-transparent',
    cyan:    'bg-cyan-50 dark:bg-transparent',
    slate:   'bg-slate-50 dark:bg-transparent',
  };
  const accent = iconAccent[color] || iconAccent.blue;
  const waveBg = waveBgMap[color] || waveBgMap.blue;

  return (
    <Link href={href}>
      <div className="bg-white dark:bg-slate-800 rounded-md p-5 h-full relative overflow-hidden shadow-sm dark:hover:bg-slate-700 hover:shadow-md border border-slate-200 dark:border-slate-700/60 transition-all duration-300 group flex flex-col items-start gap-3">
        <div className={`absolute -bottom-10 -left-10 w-6 h-6 rounded-full scale-0 group-hover:scale-[35] transition-transform duration-700 ease-out ${waveBg} z-0 dark:hidden`} />
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.03] rounded-bl-full -mr-4 -mt-4 group-hover:bg-white/[0.06] transition-colors z-0" />
        <div className={`w-10 h-10 rounded-md ${accent} flex items-center justify-center shadow-sm group-hover:scale-90 transition-transform duration-300 relative z-10`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white relative z-10">{title}</span>
      </div>
    </Link>
  );
}

function EngagementCard({ title, items, icon: Icon, colorClass = "bg-orange-50/70 text-orange-600" }: any) {
  const bg = colorClass.split(' ')[0];
  const colorName = bg.replace('bg-', '').replace('-50/70', '');
  return (
    <div className={`wave-card group ${bg} rounded-md p-5 shadow-sm border border-slate-200 dark:border-slate-700/60 transition-colors`} style={{ '--wave-color': `var(--tw-color-${colorName}-100, #ffedd5)` } as any}>
      <h3 className={`font-bold ${colorClass.split(' ')[1]} text-sm flex items-center gap-2 mb-3 relative z-10`}>
        <Icon className="w-5 h-5" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">None today</p>
      ) : (
        <div className="space-y-3 relative z-10">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-900 dark:text-white">{item.name} {item.years ? `(${item.years}Y)` : ''}</span>
              <span className="text-slate-600 dark:text-slate-300 bg-white/60 px-2 py-1 rounded-md shadow-sm font-semibold">{format(new Date(item.date), "MMM d")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Auto-rotating card: shows one item at a time, fades every 3s, pauses on hover
function RotatingCard({
  title, subtitle, icon: Icon, iconColorClass, headerClass, items, emptyMessage, renderItem, cardHeight = 224
}: {
  title: string; subtitle?: string; icon: any; iconColorClass?: string; headerClass?: string; items: any[];
  emptyMessage: string; renderItem: (item: any) => React.ReactNode; cardHeight?: number;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  // When items list changes, reset index
  useEffect(() => { setActiveIdx(0); setVisible(true); }, [count]);

  // Start fade-out every 6s
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setVisible(false), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  // When faded out, advance index then fade back in
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % Math.max(1, count));
      setVisible(true);
    }, 350);
    return () => clearTimeout(t);
  }, [visible, count]);

  const safeIdx = count > 0 ? activeIdx % count : 0;

  return (
    <div
      className="premium-card wave-card p-6 flex flex-col overflow-hidden"
      style={{ height: `${cardHeight}px` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3
            style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }}
            className="dark:text-white flex items-center gap-2 box-title"
          >
            <Icon className={`w-4 h-4 ${iconColorClass || (headerClass ? headerClass.replace('text-', 'text-') : 'text-[#56348f] dark:text-purple-400')}`} />
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: "12px", lineHeight: "20px", color: "rgb(94, 105, 120)" }} className="dark:text-slate-400 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        {count === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{emptyMessage}</p>
        ) : (
          <>
            <div
              className="flex-1"
              style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease' }}
            >
              {renderItem(items[safeIdx])}
            </div>
            {count > 1 && (
              <div className="flex items-center gap-1.5 justify-center pt-3 shrink-0">
                {items.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => { setVisible(false); setTimeout(() => { setActiveIdx(i); setVisible(true); }, 350); }}
                    className="p-1.5 -m-1.5 cursor-pointer flex items-center justify-center"
                  >
                    <span
                      className="block h-2 rounded-full transition-all duration-300"
                      style={{ width: i === safeIdx ? '16px' : '8px', background: i === safeIdx ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UpcomingBirthdaysWidget({ items }: { items: any[] }) {
  // Only show birthdays within the next 14 days
  const filtered = (items || []).filter((b: any) =>
    typeof b.days_remaining === 'number' && b.days_remaining >= 0 && b.days_remaining <= 14
  );

  return (
    <RotatingCard
      title="Upcoming Birthdays"
      icon={Gift}
      headerClass="text-fuchsia-300"
      items={filtered}
      emptyMessage="No upcoming birthdays in the next 2 weeks."
      renderItem={(b) => (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PhotoAvatar
              src={b.profile_photo_path}
              name={b.name}
              className="w-10 h-10 rounded-full border border-fuchsia-400/30 shrink-0 bg-fuchsia-500/20 text-sm"
              textClass="text-fuchsia-700 dark:text-fuchsia-300"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{b.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{b.designation || 'Employee'} • {b.department}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{format(new Date(b.date), "MMM d")}</span>
            {b.days_remaining === 0 ? (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-fuchsia-500/80 text-white px-2 py-0.5 rounded-lg">Today!</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-fuchsia-500/30 text-fuchsia-300 px-2 py-0.5 rounded-lg">In {Math.floor(b.days_remaining)} d</span>
            )}
          </div>
        </div>
      )}
    />
  );
}

function CelebrationCard({ recognition, firstName }: { recognition: any; firstName: string }) {
  return (
    <div
      className="relative rounded-md overflow-hidden mb-6"
      style={{
        background: 'linear-gradient(135deg, #16213E 0%, #243B67 50%, #3B2F80 100%)',
        boxShadow: '0 20px 60px rgba(67,56,202,0.35), 0 8px 24px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Floating particle layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + (i % 5) * 3}px`,
              height: `${4 + (i % 5) * 3}px`,
              background: i % 3 === 0
                ? 'rgba(255,215,0,0.35)'
                : i % 3 === 1
                ? 'rgba(167,139,250,0.30)'
                : 'rgba(255,255,255,0.18)',
              left: `${(i * 47 + 11) % 100}%`,
              top: `${(i * 31 + 7) % 100}%`,
              animation: `float-particle ${3.5 + (i % 4) * 1.2}s ease-in-out ${(i * 0.4) % 3}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Soft radial glow behind center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(99,102,241,0.22) 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* Three-column layout: anim | content | anim */}
      <div className="relative z-10 flex items-center gap-0">

        {/* Left Lottie — hidden on mobile */}
        <div className="hidden sm:flex items-center justify-center w-36 md:w-44 shrink-0 self-stretch">
          <DotLottiePlayer
            src="https://lottie.host/de999a51-b191-434c-8cb0-8e1844885ad7/IK6zp320mX.lottie"
            autoplay
            loop
            style={{ width: '140px', height: '140px' }}
          />
        </div>

        {/* Center: content */}
        <div className="flex-1 flex flex-col items-center text-center py-8 px-4 md:px-8">

          {/* Mobile-only top animation */}
          <div className="flex sm:hidden justify-center mb-2">
            <DotLottiePlayer
              src="https://lottie.host/de999a51-b191-434c-8cb0-8e1844885ad7/IK6zp320mX.lottie"
              autoplay
              loop
              style={{ width: '100px', height: '100px' }}
            />
          </div>

          {/* Trophy icon — pulsing glow */}
          <div
            className="mb-4 text-5xl md:text-6xl"
            style={{ animation: 'trophy-pulse 2s ease-in-out infinite' }}
          >
            {recognition.icon || '🏆'}
          </div>

          {/* Recognition title — glowing */}
          <div
            className="mb-3 px-5 py-2 rounded-md"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,215,0,0.25)',
              boxShadow: '0 0 24px rgba(255,215,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(1.25rem, 4vw, 2rem)',
                fontWeight: 800,
                color: '#FFD700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                textShadow: '0 0 24px rgba(255,215,0,0.55), 0 2px 4px rgba(0,0,0,0.4)',
              }}
            >
              {recognition.title}
            </h2>
          </div>

          {/* Name */}
          <p
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
            className="mb-3"
          >
            Congratulations, {firstName}! 🎊
          </p>

          {/* Description */}
          {recognition.description && (
            <p
              className="mb-5 italic max-w-lg text-sm md:text-base leading-relaxed px-4 py-3 rounded-md"
              style={{
                color: 'rgba(255,255,255,0.85)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(8px)',
              }}
            >
              "{recognition.description}"
            </p>
          )}

          {/* Validity badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(8px)',
            }}
          >
            📅 Valid: {format(new Date(recognition.start_date), "dd MMM yyyy")} — {format(new Date(recognition.end_date), "dd MMM yyyy")}
          </div>

          {/* Mobile-only bottom animation */}
          <div className="flex sm:hidden justify-center mt-2">
            <DotLottiePlayer
              src="https://lottie.host/64db1917-38b0-4233-8a8d-d109330691a5/O2ZACjATpn.lottie"
              autoplay
              loop
              style={{ width: '100px', height: '100px' }}
            />
          </div>
        </div>

        {/* Right Lottie — hidden on mobile */}
        <div className="hidden sm:flex items-center justify-center w-36 md:w-44 shrink-0 self-stretch">
          <DotLottiePlayer
            src="https://lottie.host/64db1917-38b0-4233-8a8d-d109330691a5/O2ZACjATpn.lottie"
            autoplay
            loop
            style={{ width: '140px', height: '140px' }}
          />
        </div>
      </div>
    </div>
  );
}

function MenuCard({ href, icon: Icon, title, subtitle, color, className = "" }: any) {
  const iconAccent: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue:    'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    violet:  'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
    amber:   'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    rose:    'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    cyan:    'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    indigo:  'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    purple:  'bg-purple-100 dark:bg-purple-500/20 text-[#56348f] dark:text-purple-300',
    slate:   'bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200',
  };

  const waveBgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-transparent',
    blue:    'bg-blue-50 dark:bg-transparent',
    violet:  'bg-violet-50 dark:bg-transparent',
    amber:   'bg-amber-50 dark:bg-transparent',
    rose:    'bg-rose-50 dark:bg-transparent',
    cyan:    'bg-cyan-50 dark:bg-transparent',
    indigo:  'bg-indigo-50 dark:bg-transparent',
    purple:  'bg-purple-50 dark:bg-transparent',
    slate:   'bg-slate-100 dark:bg-transparent',
  };

  const accent = iconAccent[color] || iconAccent.blue;
  const waveBg = waveBgMap[color] || waveBgMap.blue;

  return (
    <Link href={href} className={`block ${className}`}>
      <div className="bg-white dark:bg-slate-800 rounded-md p-5 h-full relative overflow-hidden shadow-sm hover:shadow-md dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-all duration-300 group">
        <div className={`absolute -bottom-10 -left-10 w-6 h-6 rounded-full scale-0 group-hover:scale-[35] transition-transform duration-700 ease-out ${waveBg} z-0 dark:hidden`} />
        <div className="absolute top-0 right-0 w-20 h-20 bg-black/[0.02] dark:bg-white/[0.03] rounded-bl-full -mr-4 -mt-4 group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.06] transition-colors z-0" />
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-md ${accent} flex items-center justify-center mb-4 shadow-sm group-hover:scale-90 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 style={{ fontFamily: '"Proxima Nova", sans-serif', fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgb(15, 24, 36)" }} className="dark:text-white leading-tight mb-1 box-title">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
