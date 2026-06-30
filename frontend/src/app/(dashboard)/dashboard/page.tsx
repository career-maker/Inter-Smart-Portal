"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  PartyPopper,
  Home,
  AlertCircle,
  ArrowRight,
  Award,
  Sparkles,
  Activity,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttendanceWidget } from "@/components/dashboard/AttendanceWidget";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [leaveModalData, setLeaveModalData] = useState<{title: string, list: any[]} | null>(null);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="relative flex justify-center items-center">
          <div className="absolute animate-ping w-16 h-16 rounded-full bg-primary/30"></div>
          <div className="w-8 h-8 rounded-full bg-primary shadow-lg shadow-primary/50"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="bg-red-50/70 text-red-700 p-6 rounded-xl border border-red-100 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-sm">{error || "No data received from server."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
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
    return <SuperAdminDashboard data={data} user={user} time={time} greeting={greeting} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Active Recognition Premium Badge */}
      {profile.active_recognition && (
        <div className="rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(234,179,8,0.2)] mb-6 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-900 relative overflow-hidden border border-yellow-200 group transition-all">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/30 blur-3xl rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-bounce">{profile.active_recognition.icon || '🏆'}</span>
              <h2 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-slate-900 drop-shadow-sm">
                {profile.active_recognition.title}
              </h2>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>{profile.active_recognition.icon || '🏆'}</span>
            </div>
            
            <p className="text-lg md:text-xl font-bold text-slate-800">
              Congratulations, {profile.first_name}!
            </p>
            
            {profile.active_recognition.description && (
              <p className="text-sm md:text-base font-medium text-slate-800/90 italic max-w-2xl mx-auto bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm shadow-inner">
                "{profile.active_recognition.description}"
              </p>
            )}
            
            <div className="inline-block mt-4 bg-slate-900/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-slate-900/10">
              <p className="text-xs font-bold text-slate-800 tracking-wider">
                VALID: {format(new Date(profile.active_recognition.start_date), "dd-MMM-yyyy")} TO {format(new Date(profile.active_recognition.end_date), "dd-MMM-yyyy")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================
        HEADER: Personalized Dashboard
        ========================================
      */}
      <div className="rounded-3xl p-5 md:p-6 shadow-lg mb-6 bg-[#F4B400] text-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8 relative z-10">
          {/* Left: Avatar, Greeting, Date */}
          <div className="flex items-center gap-5 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/40 flex items-center justify-center text-slate-900 text-xl md:text-2xl font-bold shadow-sm shrink-0 border border-white/50">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800/80 mb-1">
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center text-white">
                {greeting}, {profile.first_name} 
                <div className="relative w-[60px] h-[60px] ml-2 shrink-0">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <DotLottiePlayer src="https://lottie.host/5ec233ff-2cb3-499c-ac94-906625aeb28f/JZM0rMFaWb.lottie" autoplay loop style={{ width: '120px', height: '120px' }} />
                  </div>
                </div>
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                {profile.employee_code && (
                  <span className="inline-flex items-center gap-1.5 bg-black/5 text-slate-900 backdrop-blur-sm border border-black/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider shadow-sm">
                    {profile.employee_code}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-black/5 text-slate-900 backdrop-blur-sm border border-black/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {profile.designation}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                  profile.attendance_status === 'Punched In' 
                    ? 'bg-emerald-100 text-emerald-800'
                    : profile.attendance_status === 'Punched Out'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {profile.attendance_status}
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: Service Days */}
          {profile.service_stats && (
            <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-4 md:p-5 shadow-sm text-center lg:text-right w-full lg:w-auto mt-4 lg:mt-0 flex flex-col justify-center">
              <p className="text-sm md:text-base font-bold text-slate-800 tracking-wide flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                You have been with Intersmart for {profile.service_stats.years} Years {profile.service_stats.months} Months {profile.service_stats.days} Days
              </p>
            </div>
          )}
        </div>
      </div>

      <AttendanceWidget initialData={data.attendance_widget_data} />


      {/* 
        ========================================
        ENGAGEMENT SECTION: Updates, Celebrations, Birthdays
        ========================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Updates Widget */}
        <div className="bg-blue-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-500" />
              Latest Updates
            </h3>
            <Link href="/announcements" className="text-xs font-semibold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {widgets.company_updates.length === 0 ? (
              <p className="text-sm text-gray-500">No recent announcements.</p>
            ) : (
              widgets.company_updates.slice(0, 3).map((update: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-50/700 shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{update.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{format(parseISO(update.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Celebrations Widget (Anniversaries Only) */}
        <div className="bg-pink-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
          <h3 className="font-bold text-pink-700 flex items-center gap-2 mb-4">
            <PartyPopper className="w-5 h-5" />
            Work Anniversaries
          </h3>
          <div className="space-y-4">
            {widgets.anniversaries.length === 0 && (
              <p className="text-sm text-gray-500">No work anniversaries this week.</p>
            )}
            {widgets.anniversaries.map((a: any, idx: number) => (
              <div key={`a-${idx}`} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">🎉 {a.name} ({a.years}Y)</span>
                <span className="text-purple-600 font-semibold text-xs bg-purple-100 px-2 py-1 rounded-md">{format(new Date(a.date), "MMM d")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Birthdays Widget */}
        <UpcomingBirthdaysWidget items={widgets.upcoming_birthdays} />
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
                  <h3 className="text-2xl font-black tracking-tight">View The Hall</h3>
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
          RIGHT: DASHBOARD SUMMARY (4 Cols)
          ========================================
        */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-emerald-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6 md:p-8 sticky top-24">
            <h2 className="text-lg font-bold text-emerald-800 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Leave Summary
            </h2>
            
            <div className="space-y-6">
              {/* Casual Leave Indicator */}
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Casual Leaves</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{leave_metrics.casual_leave_balance}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Palmtree className="w-6 h-6" />
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full"></div>

              {/* Sick Leave Indicator */}
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sick Leaves</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{leave_metrics.sick_leave_balance}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full"></div>

              {/* Total Leaves Taken Indicator */}
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Taken</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{leave_metrics.total_leaves_taken}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-6 h-6" />
                </div>
              </div>

              {/* Pending visual (optional, but good for UI) */}
              {leave_metrics.pending_leaves > 0 && (
                <div className="mt-4 bg-orange-50/70 border border-orange-100 rounded-xl p-3 flex items-center gap-3 text-orange-800">
                  <Clock className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">Your {leave_metrics.pending_leaves} leave request(s) are pending approval</span>
                </div>
              )}

              <div className="pt-6">
                <Link 
                  href="/leaves/apply" 
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-bold py-4 px-6 rounded-2xl hover:bg-amber-50/700 hover:shadow-xl hover:shadow-amber-400/20 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Palmtree className="w-5 h-5" />
                  Apply for Leave
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuperAdminDashboard({ data, user, time, greeting }: any) {
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
      <div className="bg-[#F4B400] rounded-3xl p-5 md:p-6 shadow-lg mb-6 text-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/40 flex items-center justify-center text-slate-900 text-2xl font-bold backdrop-blur-sm border border-white/50 shrink-0">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800/80 mb-1">
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center text-white">
                {greeting}, {profile.first_name} (Admin) 
                <div className="relative w-[60px] h-[60px] ml-2 shrink-0">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <DotLottiePlayer src="https://lottie.host/5ec233ff-2cb3-499c-ac94-906625aeb28f/JZM0rMFaWb.lottie" autoplay loop style={{ width: '120px', height: '120px' }} />
                  </div>
                </div>
              </h1>
            </div>
          </div>
          
          {/* Right: Quick Summary Badges */}
          <Link href="/leaves/approvals" className="block flex flex-col justify-center bg-black/5 hover:bg-black/10 transition-colors rounded-2xl p-4 md:p-5 border border-black/10 hover:border-black/20 w-full md:w-auto shadow-sm cursor-pointer group">
            <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-800" />
              You have:
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/50 group-hover:bg-white/70 transition-colors flex items-center justify-center text-slate-800 shrink-0 shadow-sm border border-white/60">
                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="leading-tight pr-4">
                <p className="text-xl font-black text-slate-900">{kpis.pending_requests}</p>
                <p className="text-xs font-bold text-slate-800/80 uppercase tracking-wider mt-0.5">Pending Requests</p>
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
        <div className="bg-indigo-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
          <h2 className="text-lg font-bold text-indigo-800 mb-5 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Company Announcements
          </h2>
          <div className="space-y-3">
              {widgets.company_updates.length === 0 ? (
                <p className="text-sm text-gray-500">No recent announcements.</p>
              ) : (
                widgets.company_updates.map((update: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start border-b border-indigo-100/50 pb-3 last:border-0 last:pb-0">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-50/700 shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 leading-tight">{update.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{format(new Date(update.created_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>

        {/* Employee Engagement Widgets */}
        <div className="bg-pink-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
          <h2 className="text-lg font-bold text-pink-800 mb-5 flex items-center gap-2">
            <PartyPopper className="w-5 h-5" />
            Celebrations
          </h2>
          <div className="space-y-4">
            <h3 className="font-bold text-pink-700 text-sm flex items-center gap-2">
              <Award className="w-4 h-4" />
              Work Anniversaries
            </h3>
            {widgets.anniversaries.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium">None today</p>
            ) : (
              <div className="space-y-3">
                {widgets.anniversaries.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800">{item.name} {item.years ? `(${item.years}Y)` : ''}</span>
                    <span className="text-pink-600 bg-white/60 px-2 py-1 rounded-md shadow-sm font-semibold">{format(new Date(item.date), "MMM d")}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-pink-100">
               <h3 className="font-bold text-amber-600 text-sm flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4" />
                  Employee of the Month
               </h3>
               <p className="text-sm font-medium text-gray-800">Sarah Jenkins <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold ml-2 bg-amber-100 px-1 rounded">Marketing</span></p>
            </div>
          </div>
        </div>

        <UpcomingBirthdaysWidget items={widgets.upcoming_birthdays} />
      </div>

      {/* 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* Left 70% (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
             {/* Quick Actions (Moved from right side to main area) */}
             <QuickActionCard href="/leaves" icon={Palmtree} title="Leaves" color="text-emerald-600 bg-emerald-50/70" />
             <QuickActionCard href="/announcements" icon={Megaphone} title="Updates" color="text-blue-600 bg-blue-50/70" />
             <QuickActionCard href="/documents" icon={Download} title="Downloads" color="text-rose-600 bg-rose-50/70" />
             <QuickActionCard href="/policies" icon={BookOpen} title="Policies" color="text-cyan-600 bg-cyan-50/70" />
             
             <Link 
              href="/hall" 
              className="lg:col-span-2 group relative overflow-hidden rounded-3xl p-6 bg-slate-800 text-white shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all duration-300 border border-slate-700/50"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>
              <div className="relative z-10 flex items-center justify-between h-full">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight">View The Hall</h3>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.1)] group-hover:scale-95 transition-transform">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Activity Feed */}
          <div className="bg-cyan-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
            <h2 className="text-lg font-bold text-cyan-800 mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {paginatedActivity.map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.type === 'leave' ? 'bg-orange-100 text-orange-600' : act.type === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {act.type === 'leave' ? <Palmtree className="w-4 h-4"/> : act.type === 'user' ? <UserCircle className="w-4 h-4"/> : <BookOpen className="w-4 h-4"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{act.message}</p>
                    <p className="text-xs text-gray-500">{format(new Date(act.date), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
              {activity_feed.length === 0 && <p className="text-sm text-gray-500">No recent activity in the last 2 days.</p>}
              
              {/* Pagination */}
              {totalActivityPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className="text-xs font-semibold text-cyan-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">Page {activityPage} of {totalActivityPages}</span>
                  <button 
                    onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                    disabled={activityPage === totalActivityPages}
                    className="text-xs font-semibold text-cyan-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
              
              {/* View All Link */}
              <Link href="/activities" className="block text-center pt-3 border-t border-cyan-100 mt-2 text-sm font-bold text-cyan-700 hover:underline">
                View All Activities →
              </Link>
            </div>
          </div>

        </div>

        {/* Right 30% (4 cols) */}
        <div className="lg:col-span-4 space-y-8">


          {/* Upcoming Holidays */}
          <div className="bg-rose-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
            <h2 className="text-lg font-bold text-rose-800 mb-5 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Upcoming Holidays
            </h2>
            <div className="space-y-4">
              {widgets.upcoming_holidays.length === 0 && <p className="text-sm text-gray-500">No upcoming holidays.</p>}
              {widgets.upcoming_holidays.map((h: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{h.name}</span>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50/70 px-2 py-1 rounded-md">
                    {format(new Date(h.date), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Summary (Reused from regular dashboard) */}
           <div className="bg-emerald-50/70 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 p-6">
            <h2 className="text-lg font-bold text-emerald-800 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Company Leave Overview
            </h2>
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-gray-50/70 p-4 rounded-xl">
                 <span className="text-sm font-semibold text-gray-600">Pending Requests</span>
                 <span className="text-xl font-bold text-gray-900">{kpis.pending_requests}</span>
               </div>
               <div className="flex justify-between items-center bg-gray-50/70 p-4 rounded-xl">
                 <span className="text-sm font-semibold text-gray-600">On Leave Today</span>
                 <span className="text-xl font-bold text-gray-900">{kpis.on_leave_today}</span>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Leave Details Modal */}
      <Dialog open={!!leaveModalData} onOpenChange={(open) => !open && setLeaveModalData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{leaveModalData?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4">
            {leaveModalData?.list.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No employees to show.</p>
            ) : (
              leaveModalData?.list.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {item.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.leave_type}</p>
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
  const bgColor = color.replace('bg-', 'bg-').replace('-500', '-50/70');
  const CardContent = (
    <div className={`${bgColor} rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 relative overflow-hidden h-full ${(href || onClick) ? 'hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all cursor-pointer group' : ''}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color.replace('bg-', 'from-').replace('-500', '-200')} to-transparent rounded-bl-full -mr-4 -mt-4 opacity-30`}></div>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-sm font-bold text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-sm ${(href || onClick) ? 'group-hover:scale-95 transition-transform' : ''}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className={`mt-4 text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'} flex items-center`}>
          <span className="mr-1">{trend.startsWith('+') ? '▲' : '▼'}</span>
          {trend} from yesterday
        </div>
      )}
    </div>
  );

  if (href && !onClick) {
    return <Link href={href} className="block h-full">{CardContent}</Link>;
  }

  if (onClick) {
    return <div onClick={onClick} className="block h-full w-full text-left">{CardContent}</div>;
  }

  return CardContent;
}

function QuickActionCard({ href, icon: Icon, title, color }: any) {
  // color is e.g. "text-emerald-600 bg-emerald-50/70"
  return (
    <Link href={href} className={`${color} rounded-3xl p-4 flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 hover:bg-white/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all text-center`}>
      <Icon className="w-6 h-6" />
      <span className="text-xs font-bold">{title}</span>
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
        <p className="text-xs text-gray-500 font-medium">None today</p>
      ) : (
        <div className="space-y-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-800">{item.name} {item.years ? `(${item.years}Y)` : ''}</span>
              <span className="text-gray-600 bg-white/60 px-2 py-1 rounded-md shadow-sm font-semibold">{format(new Date(item.date), "MMM d")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpcomingBirthdaysWidget({ items }: { items: any[] }) {
  return (
    <div className="bg-fuchsia-50/70 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 w-full">
      <h3 className="font-bold text-fuchsia-700 flex items-center gap-2 mb-5">
        <Gift className="w-5 h-5" />
        Upcoming Birthdays
      </h3>
      <div className="space-y-4">
        {!items || items.length === 0 ? (
          <p className="text-sm text-gray-500 font-medium">No upcoming birthdays.</p>
        ) : (
          items.map((b: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-white/50 backdrop-blur-md bg-white/50 text-fuchsia-600 flex items-center justify-center font-bold text-sm shrink-0">
                  {b.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{b.name}</p>
                  <p className="text-xs text-gray-600 font-medium">{b.designation || 'Employee'} • {b.department}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-bold text-gray-700">{format(new Date(b.date), "MMM d")}</span>
                {b.days_remaining === 0 ? (
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-fuchsia-50/700 text-white px-2 py-0.5 rounded-lg shadow-sm">Today!</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-white text-fuchsia-600 px-2 py-0.5 rounded-lg shadow-sm">In {b.days_remaining} d</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MenuCard({ href, icon: Icon, title, subtitle, color, className = "" }: any) {
  const colors: Record<string, { bg: string, text: string }> = {
    emerald: { bg: 'bg-emerald-50/70', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50/70', text: 'text-blue-600' },
    violet: { bg: 'bg-violet-50/70', text: 'text-violet-600' },
    amber: { bg: 'bg-amber-50/70', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-50/70', text: 'text-rose-600' },
    cyan: { bg: 'bg-cyan-50/70', text: 'text-cyan-600' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
  };

  const style = colors[color] || colors.blue;

  return (
    <Link href={href} className={`block ${className}`}>
      <div className={`${style.bg} rounded-3xl p-5 h-full shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-2xl border border-white/60 hover:bg-white/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-300 group relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-bl-full -mr-4 -mt-4 opacity-50`}></div>
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm border border-white/50 backdrop-blur-md bg-white/50 group-hover:scale-95 transition-transform`}>
            <Icon className={`w-5 h-5 ${style.text}`} />
          </div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{title}</h3>
          <p className="text-xs text-gray-600 font-medium">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
