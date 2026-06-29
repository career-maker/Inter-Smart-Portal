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
  AlertCircle,
  ArrowRight,
  Award,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

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
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 max-w-md text-center">
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 
        ========================================
        HEADER: Personalized Dashboard
        ========================================
      */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          {/* Left: Avatar, Greeting, Date */}
          <div className="flex items-center gap-5 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg shrink-0">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                {format(time, "EEEE, d MMMM yyyy")} • {format(time, "h:mm a")}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
                {greeting}, {profile.first_name} 👋
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {profile.designation}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                  profile.attendance_status === 'Punched In' 
                    ? 'bg-emerald-100 text-emerald-700'
                    : profile.attendance_status === 'Punched Out'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {profile.attendance_status}
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: Quick Summary Badges */}
          <div className="flex flex-col justify-center bg-gray-50 rounded-2xl p-5 border border-gray-100 w-full xl:w-auto">
            <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              You have:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-black text-gray-900">{leave_metrics.pending_leaves}</p>
                  <p className="text-xs font-medium text-gray-500">Pending Approvals</p>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200 hidden sm:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-black text-gray-900">{leave_metrics.employees_on_leave_today}</p>
                  <p className="text-xs font-medium text-gray-500">On Leave Today</p>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-200 hidden sm:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-black text-gray-900">{widgets.company_updates.length}</p>
                  <p className="text-xs font-medium text-gray-500">Announcements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
              gradient="from-emerald-400 to-teal-500" 
            />
            <MenuCard 
              href="/announcements" 
              icon={Megaphone} 
              title="Updates" 
              subtitle="Company news"
              gradient="from-blue-400 to-indigo-500" 
            />
            <MenuCard 
              href="/calendar" 
              icon={CalendarDays} 
              title="Leave Calendar" 
              subtitle="Your schedule"
              gradient="from-violet-400 to-purple-500" 
            />
            <MenuCard 
              href="/documents" 
              icon={FileText} 
              title="Request HR Documents" 
              subtitle="Request letters"
              gradient="from-amber-400 to-orange-500" 
            />
            <MenuCard 
              href="/documents" 
              icon={Download} 
              title="Downloads" 
              subtitle="Approved files"
              gradient="from-rose-400 to-pink-500" 
            />
            <MenuCard 
              href="/policies" 
              icon={BookOpen} 
              title="HR Policies" 
              subtitle="Rules & guidelines"
              gradient="from-cyan-400 to-blue-500" 
            />
            <MenuCard 
              href="/profile" 
              icon={UserCircle} 
              title="My Profile" 
              subtitle="View details"
              gradient="from-slate-600 to-gray-700" 
              className="md:col-span-2 lg:col-span-1"
            />
            
            {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
              <Link 
                href="/hall" 
                className="md:col-span-3 lg:col-span-2 group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl shadow-gray-900/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-700"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors"></div>
                <div className="relative z-10 flex items-center justify-between h-full">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="w-5 h-5" />
                      <span className="text-sm font-medium uppercase tracking-wider">Management Only</span>
                    </div>
                    <h3 className="text-2xl font-bold">View The Hall</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* LOWER LEFT: UPDATES & CELEBRATIONS WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {/* Updates Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 leading-tight">{update.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{format(parseISO(update.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Celebrations Widget */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl shadow-sm border border-pink-100 p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <PartyPopper className="w-4 h-4 text-pink-500" />
                Celebrations
              </h3>
              <div className="space-y-4">
                {widgets.birthdays.length === 0 && widgets.anniversaries.length === 0 && (
                  <p className="text-sm text-gray-500">No celebrations this week.</p>
                )}
                {widgets.birthdays.map((b: any, idx: number) => (
                  <div key={`b-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">🎂 {b.name}</span>
                    <span className="text-pink-600 font-semibold text-xs bg-pink-100 px-2 py-1 rounded-md">{format(parseISO(b.date), "MMM d")}</span>
                  </div>
                ))}
                {widgets.anniversaries.map((a: any, idx: number) => (
                  <div key={`a-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">🎉 {a.name} ({a.years}Y)</span>
                    <span className="text-purple-600 font-semibold text-xs bg-purple-100 px-2 py-1 rounded-md">{format(parseISO(a.date), "MMM d")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 
          ========================================
          RIGHT: DASHBOARD SUMMARY (4 Cols)
          ========================================
        */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
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
                <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-3 text-orange-800">
                  <Clock className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">You have {leave_metrics.pending_leaves} pending request(s)</span>
                </div>
              )}

              {/* Massive CTA Button */}
              <div className="pt-6">
                <Link 
                  href="/leaves/apply" 
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-bold py-4 px-6 rounded-2xl hover:bg-amber-500 hover:shadow-xl hover:shadow-amber-400/20 transition-all duration-300 hover:-translate-y-0.5"
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

function MenuCard({ href, icon: Icon, title, subtitle, gradient, className = "" }: any) {
  return (
    <Link 
      href={href} 
      className={`relative group overflow-hidden rounded-2xl p-5 md:p-6 bg-white shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 hover:-translate-y-1 ${className}`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 shadow-md`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg leading-tight">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 font-medium">{subtitle}</p>
      </div>
    </Link>
  );
}
