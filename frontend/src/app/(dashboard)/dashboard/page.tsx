"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
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
  ChevronRight,
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
  Crown
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttendanceWidget } from "@/components/dashboard/AttendanceWidget";
import { AchievementFlipCard } from "@/components/recognition/AchievementFlipCard";
import { LeaderboardWidget } from "@/components/dashboard/LeaderboardWidget";
import { BirthdayWishBox } from "@/components/dashboard/BirthdayWishBox";


export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [leaveModalData, setLeaveModalData] = useState<{title: string, list: any[]} | null>(null);

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
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard");
        setData(res.data);
      } catch (e: any) {
        console.error("Failed to fetch dashboard data", e);
        setError(e.response?.data?.message || e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <PageLoader />;

  if (error || !data) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="bg-rose-500/10 text-rose-300 p-6 rounded-xl border border-rose-500/30 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2 text-white">Error Loading Dashboard</h2>
          <p className="text-sm">{error || "No data received from server."}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { profile, leave_metrics, widgets } = data;
  
  const hour = time.getHours();
  let greeting = "Good Evening";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";

  if (user?.role === "Super Admin" && data.admin_data) {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 
        ========================================
        HEADER: Welcome Card + Achievement Flip Card (two-column)
        ========================================
      */}
      <div className={`flex gap-5 mb-6 ${hasActiveRec ? 'flex-col lg:flex-row items-stretch' : ''}`}>
        {/* Welcome Card — full width when no achievement, 72% when active achievement */}
        <div
          className={`rounded-3xl p-5 md:p-6 shadow-lg border border-white/10 bg-white/5 backdrop-blur-md text-white relative overflow-hidden transition-all duration-500 ${hasActiveRec ? 'w-full lg:w-[72%]' : 'w-full'}`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8 relative z-10">
            {/* Left: Avatar, Greeting, Date */}
            <div className="flex items-center gap-5 md:gap-6">
              <PhotoAvatar
                src={profile.profile_photo_path}
                name={`${profile.first_name} ${profile.last_name}`}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 text-white text-xl md:text-2xl shadow-sm shrink-0 border border-white/10"
                textClass="text-white"
              />
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">
                  {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  <span className="block">{greeting},</span>
                  <span className="inline-flex items-center gap-2 mt-1.5">
                    <span className="text-[#FEB800]">{profile.first_name}</span>
                    <span className="relative w-[40px] h-[40px] shrink-0 inline-block ml-3">
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none block">
                        <DotLottiePlayer 
                          src="https://lottie.host/5ec233ff-2cb3-499c-ac94-906625aeb28f/JZM0rMFaWb.lottie" 
                          autoplay 
                          loop 
                          style={{ width: '80px', height: '80px' }} 
                        />
                      </span>
                    </span>
                  </span>
                </h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                  {profile.employee_code && (
                    <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider shadow-sm">
                      {profile.employee_code}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {profile.designation}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                    profile.attendance_status === 'Punched In'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : profile.attendance_status === 'Punched Out'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {profile.attendance_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Service Days — premium glass pill */}
            {profile.service_stats && (
              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.1)] shrink-0 w-full lg:w-auto">
                <p className="text-sm md:text-base font-extrabold tracking-wide flex flex-wrap items-center justify-center gap-2 whitespace-nowrap text-slate-300">
                  <span className="text-base leading-none">🌟</span>
                  Growing Together for{' '}
                  <span className="text-amber-400 font-black">
                    {profile.service_stats.years}Y {profile.service_stats.months}M {profile.service_stats.days}D
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Achievement Flip Card — only shown when employee has an active recognition */}
        {hasActiveRec && (
          <div className="w-full lg:w-[28%] lg:flex-1 min-h-[220px]">
            <AchievementFlipCard
              recognition={profile.active_recognition}
              employeeName={`${profile.first_name} ${profile.last_name}`}
              firstName={profile.first_name}
            />
          </div>
        )}
      </div>

      <AttendanceWidget initialData={data.attendance_widget_data} />


      {/* 
        ========================================
        ENGAGEMENT SECTION: Updates, Celebrations, Birthdays
        ========================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Updates Widget */}
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-500" />
              Latest Updates
            </h3>
            <Link href="/announcements" className="text-xs font-semibold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {widgets.company_updates.length === 0 ? (
              <p className="text-sm text-slate-400">No recent announcements.</p>
            ) : (
              widgets.company_updates.slice(0, 3).map((update: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-white leading-tight">{update.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(update.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
              icon={PartyPopper}
              headerClass="text-pink-300"
              items={filteredAnni}
              emptyMessage="No work anniversaries in the next 2 weeks."
              renderItem={(a) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">🎉 {a.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.years} Year{a.years !== 1 ? 's' : ''} with Intersmart</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold text-slate-300">{format(new Date(a.date), "MMM d")}</span>
                    {a.days_remaining === 0 ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-500/80 text-white px-2 py-0.5 rounded-lg">Today!</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-lg">In {a.days_remaining} d</span>
                    )}
                  </div>
                </div>
              )}
            />
          );
        })()}

        {/* Upcoming Birthdays Widget */}
        <UpcomingBirthdaysWidget items={widgets.upcoming_birthdays} />

        {/* Leaderboard Widget */}
        <LeaderboardWidget />
      </div>

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
              color="slate" 
              className="md:col-span-2 lg:col-span-1"
            />
            
            <Link 
              href="/hall" 
              className="md:col-span-3 lg:col-span-2 group relative overflow-hidden rounded-3xl p-6 bg-slate-800 text-white shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all duration-300 border border-slate-700/50"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>
              <div className="relative z-10 flex items-center justify-between h-full">
                <div className="space-y-1">
                  {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Building2 className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase tracking-wider">Management Only</span>
                    </div>
                  )}
                  <span className="text-sm font-bold text-white relative z-10">View The Hall</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.1)] group-hover:scale-95 transition-transform">
                  <ArrowRight className="w-6 h-6" />
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
          <div className="premium-card p-6 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-rose-300 mb-5 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Upcoming Holidays
              </h2>
              <div className="space-y-4">
                {widgets.upcoming_holidays.length === 0 && <p className="text-sm text-slate-400">No upcoming holidays.</p>}
                {widgets.upcoming_holidays.map((h: any, i: number) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">{h.name}</span>
                    <span className="text-xs font-semibold text-rose-600 bg-rose-500/30 px-2 py-1 rounded-md text-rose-300">
                      {format(new Date(h.date), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 
        ========================================
        BOTTOM: FULL-WIDTH HORIZONTAL LEAVE SUMMARY
        ========================================
      */}
      <div ref={leaveSummaryRef} className="premium-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left section: title and stats grid */}
          <div className="flex-1 space-y-5">
            <h2 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Leave Summary
            </h2>

            {/* Probation notice */}
            {leave_metrics.is_in_probation && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm space-y-1">
                <p className="font-bold flex items-center gap-2">🔒 Currently Under Probation</p>
                <p className="text-amber-300/80 text-xs">Paid leave benefits will become active on <strong className="text-amber-200">{new Date(leave_metrics.probation_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>. All leaves during probation are treated as Unpaid (LOP).</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Casual Leave Indicator */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Casual Leaves</p>
                  <p className="text-2xl font-black text-white mt-1">{leave_metrics.casual_leave_balance}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Palmtree className="w-5 h-5" />
                </div>
              </div>

              {/* Sick Leave Indicator */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sick Leaves</p>
                  <p className="text-2xl font-black text-white mt-1">{leave_metrics.sick_leave_balance}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Total Leaves Taken Indicator */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all duration-300">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Taken</p>
                  <p className="text-2xl font-black text-white mt-1">{leave_metrics.total_leaves_taken}</p>
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
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 flex items-center gap-2 text-orange-400 text-xs justify-center lg:justify-start w-full">
                <Clock className="w-4 h-4 shrink-0 animate-pulse" />
                <span>{leave_metrics.pending_leaves} request(s) pending approval</span>
              </div>
            )}
            
            <Link 
              href="/leaves/apply" 
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold py-3.5 px-6 rounded-2xl hover:shadow-xl hover:shadow-amber-400/15 transition-all duration-300 active:scale-95 whitespace-nowrap"
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
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all duration-150 border border-amber-400/30"
          >
            <Plus className="w-5 h-5" />
            Apply Leave
          </Link>
        </div>
      )}
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
  
  const [activityPage, setActivityPage] = useState(1);
  const activityPerPage = 5;
  const totalActivityPages = Math.ceil(activity_feed.length / activityPerPage);
  const paginatedActivity = activity_feed.slice((activityPage - 1) * activityPerPage, activityPage * activityPerPage);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Super Admin Welcome Banner */}
      <div className="border border-white/10 bg-white/5 backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-lg mb-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <PhotoAvatar
              src={profile.profile_photo_path}
              name={`${profile.first_name} ${profile.last_name}`}
              className="w-16 h-16 rounded-full bg-white/10 text-white text-2xl backdrop-blur-sm border border-white/10 shrink-0"
              textClass="text-white"
            />
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                <span className="block">{greeting},</span>
                <span className="inline-flex items-center gap-2 mt-1.5">
                  <span className="text-[#FEB800]">{profile.first_name} (Admin)</span>
                  <span className="relative w-[40px] h-[40px] shrink-0 inline-block ml-3">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none block">
                      <DotLottiePlayer 
                        src="https://lottie.host/5ec233ff-2cb3-499c-ac94-906625aeb28f/JZM0rMFaWb.lottie" 
                        autoplay 
                        loop 
                        style={{ width: '80px', height: '80px' }} 
                      />
                    </span>
                  </span>
                </span>
              </h1>
            </div>
          </div>
          
          {/* Right: Quick Summary Badges */}
          <Link href="/leaves/approvals" className="block flex flex-col justify-center bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-4 md:p-5 border border-white/10 hover:border-white/20 w-full md:w-auto shadow-sm cursor-pointer group">
            <p className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              You have:
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors flex items-center justify-center text-amber-400 shrink-0 shadow-sm border border-white/10">
                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="leading-tight pr-4">
                <p className="text-xl font-black text-white">{kpis.pending_requests}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pending Requests</p>
              </div>
            </div>
          </Link>
          
        </div>
      </div>

      {/* KPI Cards (4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard title="Employees" value={kpis.total_employees} trend={kpis.trends.employees} icon={UserCircle} color="bg-blue-500" href="/employees" />
        <KPICard title="Present" value={kpis.present_today} trend={kpis.trends.attendance} icon={Building2} color="bg-emerald-500" href="/attendance" />
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
        <KPICard title="Open Issues" value={data.issue_metrics?.total_open || 0} trend="" icon={AlertCircle} color="bg-rose-500" href="/issues" />
      </div>

      {/* 
        ========================================
        ENGAGEMENT SECTION: Updates, Celebrations, Birthdays
        ========================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-6">
        {/* Announcements */}
        <div className="premium-card p-6">
          <h2 className="text-lg font-bold text-indigo-300 mb-5 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Company Announcements
          </h2>
          <div className="space-y-3">
              {widgets.company_updates.length === 0 ? (
                <p className="text-sm text-slate-400">No recent announcements.</p>
              ) : (
                widgets.company_updates.map((update: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start border-b border-white/10 pb-3 last:border-0 last:pb-0">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-white leading-tight">{update.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{format(new Date(update.created_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>

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
              icon={PartyPopper}
              headerClass="text-pink-300"
              items={filteredAnni}
              emptyMessage="No work anniversaries in the next 2 weeks."
              renderItem={(a) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">🎉 {a.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.years} Year{a.years !== 1 ? 's' : ''} with Intersmart</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-bold text-slate-300">{format(new Date(a.date), "MMM d")}</span>
                    {a.days_remaining === 0 ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-500/80 text-white px-2 py-0.5 rounded-lg">Today!</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-lg">In {a.days_remaining} d</span>
                    )}
                  </div>
                </div>
              )}
            />
          );
        })()}

        <UpcomingBirthdaysWidget items={widgets.upcoming_birthdays} />

        {/* Leaderboard Widget */}
        <LeaderboardWidget />
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
              className="lg:col-span-2 group relative overflow-hidden rounded-3xl p-6 bg-slate-800 text-white shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all duration-300 border border-slate-700/50"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>
              <div className="relative z-10 flex items-center justify-between h-full">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white relative z-10">View The Hall</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.1)] group-hover:scale-95 transition-transform">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Activity Feed */}
          <div className="premium-card p-6">
            <h2 className="text-lg font-bold text-cyan-300 mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {paginatedActivity.map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.type === 'leave' ? 'bg-orange-500/20 text-orange-400' : act.type === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {act.type === 'leave' ? <Palmtree className="w-4 h-4"/> : act.type === 'user' ? <UserCircle className="w-4 h-4"/> : <BookOpen className="w-4 h-4"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{act.message}</p>
                    <p className="text-xs text-slate-400">{format(new Date(act.date), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
              {activity_feed.length === 0 && <p className="text-sm text-slate-400">No recent activity in the last 2 days.</p>}
              
              {/* Pagination */}
              {totalActivityPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className="text-xs font-semibold text-cyan-400 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400">Page {activityPage} of {totalActivityPages}</span>
                  <button
                    onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage === totalActivityPages}
                    className="text-xs font-semibold text-cyan-400 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
              
              {/* View All Link */}
              <Link href="/activities" className="block text-center pt-3 border-t border-white/10 mt-2 text-sm font-bold text-cyan-400 hover:underline">
                View All Activities →
              </Link>
            </div>
          </div>

        </div>

        {/* Right 30% (4 cols) */}
        <div className="lg:col-span-4 space-y-8">


          {/* Upcoming Holidays */}
          <div className="premium-card p-6">
            <h2 className="text-lg font-bold text-rose-300 mb-5 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Upcoming Holidays
            </h2>
            <div className="space-y-4">
              {widgets.upcoming_holidays.length === 0 && <p className="text-sm text-slate-400">No upcoming holidays.</p>}
              {widgets.upcoming_holidays.map((h: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">{h.name}</span>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-500/30 px-2 py-1 rounded-md text-rose-300">
                    {format(new Date(h.date), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Summary (Reused from regular dashboard) */}
           <div className="premium-card p-6">
            <h2 className="text-lg font-bold text-emerald-300 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Company Leave Overview
            </h2>
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl">
                 <span className="text-sm font-semibold text-slate-300">Pending Requests</span>
                 <span className="text-xl font-bold text-white">{kpis.pending_requests}</span>
               </div>
               <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl">
                 <span className="text-sm font-semibold text-slate-300">On Leave Today</span>
                 <span className="text-xl font-bold text-white">{kpis.on_leave_today}</span>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Leave Details Modal */}
      <Dialog open={!!leaveModalData} onOpenChange={(open) => !open && setLeaveModalData(null)}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{leaveModalData?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4">
            {leaveModalData?.list.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No employees to show.</p>
            ) : (
              leaveModalData?.list.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                      {item.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.leave_type}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
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
    <div className={`
      relative overflow-hidden h-full rounded-3xl p-6
      bg-gradient-to-br from-slate-800/90 to-slate-900/90
      shadow-[8px_8px_20px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.03)]
      border ${accent.border}
      backdrop-blur-xl
      transition-all duration-300
      ${(href || onClick) ? 'cursor-pointer group hover:shadow-[inset_6px_6px_14px_rgba(0,0,0,0.5),inset_-3px_-3px_10px_rgba(255,255,255,0.03)] hover:border-white/10' : ''}
    `}>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${accent.icon}
          shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.04)]
          ${(href || onClick) ? 'group-hover:scale-90 transition-transform duration-300' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend ? (
        <div className={`mt-4 text-xs font-bold flex items-center gap-1 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
          <span>{trend.startsWith('+') ? '▲' : '▼'}</span>
          {trend} from yesterday
        </div>
      ) : (
        <div className="mt-4 h-4" aria-hidden="true" />
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
  const accent = iconAccent[color] || iconAccent.blue;

  return (
    <Link href={href}>
      <div className="bg-slate-800 rounded-3xl p-5 h-full relative overflow-hidden
        shadow-[6px_6px_14px_rgba(0,0,0,0.45),-6px_-6px_14px_rgba(255,255,255,0.04)]
        hover:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.45),inset_-4px_-4px_10px_rgba(255,255,255,0.04)]
        border border-slate-700/50
        transition-all duration-300 group flex flex-col items-start gap-3">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.03] rounded-bl-full -mr-4 -mt-4 group-hover:bg-white/[0.06] transition-colors" />
        <div className={`w-10 h-10 rounded-2xl ${accent} flex items-center justify-center
          shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]
          group-hover:scale-90 transition-transform duration-300 relative z-10`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold text-white relative z-10">{title}</span>
      </div>
    </Link>
  );
}

function EngagementCard({ title, items, icon: Icon, colorClass = "bg-orange-50/70 text-orange-600" }: any) {
  const bg = colorClass.split(' ')[0];
  return (
    <div className={`${bg} rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60`}>
      <h3 className={`font-bold ${colorClass.split(' ')[1]} text-sm flex items-center gap-2 mb-3`}>
        <Icon className="w-5 h-5" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium">None today</p>
      ) : (
        <div className="space-y-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">{item.name} {item.years ? `(${item.years}Y)` : ''}</span>
              <span className="text-slate-300 bg-white/60 px-2 py-1 rounded-md shadow-sm font-semibold">{format(new Date(item.date), "MMM d")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Auto-rotating card: shows one item at a time, fades every 3s, pauses on hover
function RotatingCard({
  title, icon: Icon, headerClass, items, emptyMessage, renderItem, cardHeight = 224
}: {
  title: string; icon: any; headerClass: string; items: any[];
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
      className="premium-card p-6 flex flex-col overflow-hidden"
      style={{ height: `${cardHeight}px` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <h3 className={`font-bold ${headerClass} flex items-center gap-2 mb-4 shrink-0`}>
        <Icon className="w-5 h-5" />
        {title}
      </h3>
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        {count === 0 ? (
          <p className="text-sm text-slate-400 font-medium">{emptyMessage}</p>
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
              textClass="text-fuchsia-300"
            />
            <div>
              <p className="text-sm font-bold text-white leading-tight">{b.name}</p>
              <p className="text-xs text-slate-300 font-medium">{b.designation || 'Employee'} • {b.department}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-bold text-slate-300">{format(new Date(b.date), "MMM d")}</span>
            {b.days_remaining === 0 ? (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-fuchsia-500/80 text-white px-2 py-0.5 rounded-lg">Today!</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-fuchsia-500/30 text-fuchsia-300 px-2 py-0.5 rounded-lg">In {b.days_remaining} d</span>
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
      className="relative rounded-3xl overflow-hidden mb-6"
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
            className="mb-3 px-5 py-2 rounded-2xl"
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
              className="mb-5 italic max-w-lg text-sm md:text-base leading-relaxed px-4 py-3 rounded-xl"
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
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue:    'bg-blue-500/20 text-blue-400',
    violet:  'bg-violet-500/20 text-violet-400',
    amber:   'bg-amber-500/20 text-amber-400',
    rose:    'bg-rose-500/20 text-rose-400',
    cyan:    'bg-cyan-500/20 text-cyan-400',
    slate:   'bg-slate-500/20 text-slate-300',
  };

  const accent = iconAccent[color] || iconAccent.blue;

  return (
    <Link href={href} className={`block ${className}`}>
      <div className="bg-slate-800 rounded-3xl p-5 h-full relative overflow-hidden
        shadow-[6px_6px_14px_rgba(0,0,0,0.45),-6px_-6px_14px_rgba(255,255,255,0.04)]
        hover:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.45),inset_-4px_-4px_10px_rgba(255,255,255,0.04)]
        border border-slate-700/50
        transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.03] rounded-bl-full -mr-4 -mt-4 group-hover:bg-white/[0.06] transition-colors" />
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-2xl ${accent} flex items-center justify-center mb-4
            shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]
            group-hover:scale-90 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm leading-tight mb-1">{title}</h3>
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
