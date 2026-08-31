"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Palmtree,
  Sparkles,
  Link as LinkIcon,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/PageLoader";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO } from "date-fns";
import { BirthdayWishDrawer, WishTargetPerson } from "@/components/community/BirthdayWishDrawer";
import { MilestoneCelebrationsWidget } from "@/components/community/MilestoneCelebrationsWidget";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { DirectChatModule } from "@/components/chat/DirectChatModule";
import { AdminChatAuditView } from "@/components/chat/AdminChatAuditView";

export default function CommunityPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin =
    currentUser?.role === "Super Admin" ||
    (currentUser as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    (currentUser as any)?.is_super_admin === true;
  const [activeTab, setActiveTab] = useState<"feed" | "chat" | "admin-chats">("feed");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wishTarget, setWishTarget] = useState<WishTargetPerson | null>(null);

  useEffect(() => {
    // Read query parameter if present
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "chat") {
        setActiveTab("chat");
      } else if (tabParam === "admin-chats" || tabParam === "audit") {
        setActiveTab("admin-chats");
      }
    }
    fetchSummary();
  }, []);

  const handleTabChange = (tab: "feed" | "chat" | "admin-chats") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
      const url = new URL(window.location.href);
      if (tab === "feed") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

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
      className={activeTab === "chat" ? "pb-2 space-y-2.5" : "pb-12 space-y-6"}
    >
      {/* ── TOP SUB-TABS (FEED, DIRECT CHAT, ADMIN AUDIT) ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange("feed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "feed"
                ? "bg-[#56348f] text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feed & Celebrations</span>
          </button>

          <button
            onClick={() => handleTabChange("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "chat"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Chat</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => handleTabChange("admin-chats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "admin-chats"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>View All Chats (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TAB 1: DIRECT CHAT MODULE ── */}
      {activeTab === "chat" && <DirectChatModule />}

      {/* ── TAB 2: SUPER ADMIN CHAT AUDIT ── */}
      {activeTab === "admin-chats" && isSuperAdmin && <AdminChatAuditView />}

      {/* ── TAB 3: COMMUNITY FEED & CELEBRATIONS ── */}
      {activeTab === "feed" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          
          {/* ── LEFT SIDEBAR (4 Cols on desktop, Sticky pinned when scrolling posts) ── */}
          <div className="lg:col-span-4 relative">
            <div className="space-y-6 lg:sticky lg:top-[120px] lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto custom-scrollbar pr-1 pb-4">
              
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
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "13px",
                        lineHeight: "20px",
                        fontWeight: 500,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:text-white truncate box-title"
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
                      {holiday.date ? format(parseISO(holiday.date), "EEEE, dd MMMM yyyy") : "TBD"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No upcoming holidays scheduled</p>
                )}
              </div>

              {/* 2. Today's Out of Office (Leaves & WFH) */}
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

              {/* 3. My Available Leave Balances */}
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

              {/* 4. Quick Portal Shortcuts */}
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
      )}

      {/* ── BIRTHDAY & ANNIVERSARY WISH SLIDE-OVER DRAWER ── */}
      <BirthdayWishDrawer
        person={wishTarget}
        onClose={() => setWishTarget(null)}
        onWishSent={() => fetchSummary()}
      />
    </div>
  );
}
