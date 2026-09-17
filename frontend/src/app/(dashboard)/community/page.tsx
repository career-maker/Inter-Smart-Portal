"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Palmtree,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/PageLoader";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO } from "date-fns";
import { BirthdayWishDrawer, WishTargetPerson } from "@/components/community/BirthdayWishDrawer";
import { CommunityHolidayCard } from "@/components/community/CommunityHolidayCard";
import { MilestoneCelebrationsWidget } from "@/components/community/MilestoneCelebrationsWidget";
import { CommunityFeed } from "@/components/community/CommunityFeed";

function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin =
    currentUser?.role === "Super Admin" ||
    (currentUser as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    (currentUser as any)?.is_super_admin === true;

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wishTarget, setWishTarget] = useState<WishTargetPerson | null>(null);

  // Backward compatibility: redirect any legacy /community?tab=chat links to /chat
  useEffect(() => {
    if (tabParam === "chat") {
      const convParam = searchParams.get("conversationId");
      router.replace(convParam ? `/chat?conversationId=${convParam}` : "/chat");
      return;
    }
    if (tabParam === "admin-chats" || tabParam === "audit") {
      router.replace("/chat?view=audit");
      return;
    }
    fetchSummary();
  }, [tabParam, searchParams, router]);

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

  if (tabParam === "chat" || tabParam === "admin-chats" || tabParam === "audit") {
    return <PageLoader />;
  }

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
      className="pb-12 space-y-6"
    >
      {/* ── COMMUNITY FEED & CELEBRATIONS ── */}
      <div className="space-y-6">
          {/* ── TOP CELEBRATION HIGHLIGHTS: UPCOMING HOLIDAY + MILESTONE CELEBRATIONS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 flex">
              <CommunityHolidayCard holiday={holiday} />
            </div>
            <div className="lg:col-span-7 flex">
              <MilestoneCelebrationsWidget
                celebrations={celebrations}
                onOpenWishDrawer={(person) => setWishTarget(person)}
              />
            </div>
          </div>

          {/* ── SIDEBAR & COMMUNITY FEED ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
            {/* ── LEFT SIDEBAR (4 Cols on desktop, lists downward naturally without scrollbar) ── */}
            <div className="lg:col-span-4 space-y-6">
              {/* 1. Today's Out of Office (Leaves & WFH) */}
              <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#56348f] dark:text-purple-400 flex items-center gap-1.5">
                  <Palmtree className="w-3.5 h-3.5" /> Out of Office Today
                </span>

                {/* On Leave Today */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      On Leave ({onLeave.length})
                    </span>
                  </div>
                  {onLeave.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-3.5">Everyone is in office today</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {onLeave.map((person: any) => (
                        <div
                          key={person.id}
                          className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-700/40 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RoyalAvatar
                              src={person.profile_photo_path}
                              name={person.name}
                              userId={person.id}
                              className="w-6 h-6 rounded-full text-[10px]"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              <RoyalName name={person.name} userId={person.id} />
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-2">
                            {person.leave_type || "Leave"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Working From Home Today */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Working Remotely ({onWfh.length})
                    </span>
                  </div>
                  {onWfh.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-3.5">No remote workers today</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {onWfh.map((person: any) => (
                        <div
                          key={person.id}
                          className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-700/40 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RoyalAvatar
                              src={person.profile_photo_path}
                              name={person.name}
                              userId={person.id}
                              className="w-6 h-6 rounded-full text-[10px]"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              <RoyalName name={person.name} userId={person.id} />
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                            WFH
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. My Available Leave Balances */}
              <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56348f] dark:text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> My Leave Balances
                  </span>
                  <Link
                    href="/leaves"
                    className="text-[11px] font-medium text-[#56348f] dark:text-purple-400 hover:underline"
                  >
                    Details
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-md">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Casual Leave</span>
                    <span className="text-xl font-bold text-[#56348f] dark:text-purple-400 mt-1 block">
                      {leaveBalances.casual}
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-md">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Sick Leave</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {leaveBalances.sick}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Quick Portal Shortcuts */}
              <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#56348f] dark:text-purple-400 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Quick Actions
                </span>
                <div className="space-y-1 text-xs">
                  {isSuperAdmin || currentUser?.role === "Team Lead" ? (
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
              {/* Live Community Feed (Post Publisher + Stream + Likes + Comments) */}
              <CommunityFeed />
            </div>

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

export default function CommunityPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CommunityPageContent />
    </Suspense>
  );
}
