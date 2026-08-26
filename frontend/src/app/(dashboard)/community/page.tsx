"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Palmtree,
  Laptop,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  PartyPopper,
  Cake,
  HeartHandshake,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/PageLoader";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO } from "date-fns";
import { BirthdayWishDrawer, WishTargetPerson } from "@/components/community/BirthdayWishDrawer";
import { MilestoneCelebrationsWidget } from "@/components/community/MilestoneCelebrationsWidget";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export default function CommunityPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin =
    currentUser?.role === "Super Admin" ||
    (currentUser as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    (currentUser as any)?.is_super_admin === true;
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wishTarget, setWishTarget] = useState<WishTargetPerson | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [comRes, dashRes] = await Promise.allSettled([
        api.get("/community/summary"),
        api.get("/dashboard"),
      ]);

      const comData = comRes.status === "fulfilled" ? comRes.value.data : {};
      const dashData = dashRes.status === "fulfilled" ? dashRes.value.data : {};

      const cl =
        dashData?.leave_metrics?.casual_leave_balance ??
        comData?.leave_balances?.casual ??
        0;
      const sl =
        dashData?.leave_metrics?.sick_leave_balance ??
        comData?.leave_balances?.sick ??
        0;

      setSummary({
        ...comData,
        leave_balances: {
          casual: cl,
          sick: sl,
        },
      });
    } catch (err) {
      console.error("Failed to load community summary", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return <PageLoader />;
  }

  const holiday = summary?.upcoming_holiday;
  const onLeave = summary?.on_leave_today || [];
  const onWfh = summary?.wfh_today || [];
  const leaveBalances = {
    casual: summary?.leave_balances?.casual ?? 0,
    sick: summary?.leave_balances?.sick ?? 0,
  };
  const celebrations = summary?.celebrations || {
    birthdays_today: [],
    birthdays_upcoming: [],
    anniversaries_today: [],
    anniversaries_upcoming: [],
    recently_joined: [],
  };

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="pb-12"
    >
      {/* ── 2-COLUMN COMMUNITY LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT SIDEBAR (4 Cols on desktop) ── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Upcoming Holiday Card */}
          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#56348f] dark:text-purple-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Upcoming Holiday
              </span>
              <Link
                href="/holidays"
                className="text-[11px] font-medium text-[#56348f] dark:text-purple-400 hover:underline"
              >
                View All
              </Link>
            </div>

            {holiday ? (
              <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-4 rounded-md border border-purple-200/60 dark:border-purple-900/30">
                <h3
                  style={{
                    fontSize: "16px",
                    lineHeight: "24px",
                    fontWeight: 600,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white truncate"
                >
                  🎉 {holiday.name}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: "rgb(94, 105, 120)",
                  }}
                  className="dark:text-slate-400 mt-1"
                >
                  {format(new Date(holiday.date), "EEEE, dd MMMM yyyy")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                No upcoming public holidays this month.
              </p>
            )}
          </div>

          {/* 2. On Leave Today Card */}
          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
            <h3
              style={{
                fontSize: "15px",
                lineHeight: "24px",
                fontWeight: 600,
                color: "rgb(15, 24, 36)",
              }}
              className="dark:text-white flex items-center gap-2 mb-3"
            >
              <Palmtree className="w-4 h-4 text-emerald-500" />
              <span>On Leave Today</span>
            </h3>

            {onLeave.length === 0 ? (
              <div className="py-4 text-center bg-slate-50 dark:bg-slate-900/40 rounded-md border border-dashed border-slate-200 dark:border-slate-700/60">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Everyone is at office!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No one is on leave today.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {onLeave.map((emp: any) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RoyalAvatar
                        src={emp.profile_photo_path}
                        name={emp.name}
                        userId={emp.id}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {emp.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {emp.designation}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full shrink-0">
                      {emp.leave_type || "Leave"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Working Remotely (WFH) Today Card */}
          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
            <h3
              style={{
                fontSize: "15px",
                lineHeight: "24px",
                fontWeight: 600,
                color: "rgb(15, 24, 36)",
              }}
              className="dark:text-white flex items-center gap-2 mb-3"
            >
              <Laptop className="w-4 h-4 text-sky-500" />
              <span>Working Remotely</span>
            </h3>

            {onWfh.length === 0 ? (
              <div className="py-4 text-center bg-slate-50 dark:bg-slate-900/40 rounded-md border border-dashed border-slate-200 dark:border-slate-700/60">
                <CheckCircle2 className="w-6 h-6 text-sky-500 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Everyone is at office!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No one is working remotely today.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {onWfh.map((emp: any) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RoyalAvatar
                        src={emp.profile_photo_path}
                        name={emp.name}
                        userId={emp.id}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {emp.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {emp.designation}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full shrink-0">
                      WFH
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Leave Balances Card (Hidden for Super Admin) */}
          {!isSuperAdmin && (
            <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3
                  style={{
                    fontSize: "15px",
                    lineHeight: "24px",
                    fontWeight: 600,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white"
                >
                  Leave Balances
                </h3>
                <Link
                  href="/leaves"
                  className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline"
                >
                  Request Leave
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200/70 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                    {leaveBalances.casual}
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Casual Leave
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200/70 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-full border-4 border-sky-500 flex items-center justify-center font-bold text-sm text-sky-600 dark:text-sky-400 mb-1">
                    {leaveBalances.sick}
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Sick Leaves
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-center">
                <Link
                  href="/leaves"
                  className="text-[11px] font-semibold text-[#56348f] dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                >
                  View All Balances <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* 5. Quick Links Card */}
          <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
            <h3
              style={{
                fontSize: "15px",
                lineHeight: "24px",
                fontWeight: 600,
                color: "rgb(15, 24, 36)",
              }}
              className="dark:text-white flex items-center gap-2 mb-3"
            >
              <LinkIcon className="w-4 h-4 text-purple-500" />
              <span>Quick Links</span>
            </h3>

            <div className="space-y-1 text-xs">
              {isSuperAdmin ? (
                <Link
                  href="/leaves/approvals"
                  className="block p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition text-slate-700 dark:text-slate-300 hover:text-[#56348f] font-semibold"
                >
                  📋 Review Leave & WFH Approvals
                </Link>
              ) : (
                <Link
                  href="/leaves"
                  className="block p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition text-slate-700 dark:text-slate-300 hover:text-[#56348f]"
                >
                  🏝️ Apply for Leave or WFH
                </Link>
              )}
              <Link
                href="/policies"
                className="block p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition text-slate-700 dark:text-slate-300 hover:text-[#56348f]"
              >
                📖 Company HR Policies
              </Link>
              <Link
                href="/documents"
                className="block p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition text-slate-700 dark:text-slate-300 hover:text-[#56348f]"
              >
                📄 Request HR Documents
              </Link>
              <Link
                href="/recognitions/leaderboard"
                className="block p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition text-slate-700 dark:text-slate-300 hover:text-[#56348f]"
              >
                🏆 View Hall of Fame Leaderboard
              </Link>
            </div>
          </div>

        </div>

        {/* ── MAIN COMMUNITY STREAM (8 Cols on desktop) ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Milestone Celebrations Carousel / Tabs (Birthdays, Anniversaries, New Joiners) */}
          <MilestoneCelebrationsWidget
            celebrations={celebrations}
            onOpenWishDrawer={(person) => setWishTarget(person)}
          />

          {/* Live Community Feed (Post Publisher + Stream + Likes + Comments) */}
          <CommunityFeed />
        </div>

      </div>

      {/* ── BIRTHDAY & ANNIVERSARY WISH SLIDE-OVER DRAWER ── */}
      <BirthdayWishDrawer
        person={wishTarget}
        onClose={() => setWishTarget(null)}
        onWishSent={() => fetchSummary()}
      />
    </div>
  );
}
