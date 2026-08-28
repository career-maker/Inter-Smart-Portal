"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Award,
  Sparkles,
  ChevronRight,
  X,
  Star,
  Clock,
  Crown,
  CheckCircle2,
  Mail,
  HelpCircle,
  Flame
} from "lucide-react";
import api from "@/services/api";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { useAuthStore } from "@/store/auth";

const RANK_STYLES = [
  { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/40", text: "text-amber-300", icon: "🥇" },
  { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/40", text: "text-slate-300", icon: "🥈" },
  { bg: "from-amber-700/20 to-orange-700/10", border: "border-amber-700/40", text: "text-amber-700", icon: "🥉" },
];

export function LeaderboardWidget() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "Super Admin";

  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuideDrawer, setShowGuideDrawer] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/recognitions/leaderboard?period=overall");
        setLeaders(res.data?.data?.slice(0, 4) || []);
      } catch (err) {
        console.error("Failed to load leaderboard widget", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <>
      <div
        style={{
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
        className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm min-h-[220px] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                style={{
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 500,
                  color: "rgb(15, 24, 36)"
                }}
                className="dark:text-white flex items-center gap-2 box-title"
              >
                <Trophy className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                Hall of Fame
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  lineHeight: "20px",
                  color: "rgb(94, 105, 120)"
                }}
                className="dark:text-slate-400 font-normal"
              >
                Top recognized employees & awardees
              </p>
            </div>
            <Link
              href="/recognitions/leaderboard"
              className="text-xs font-medium text-[#56348f] dark:text-purple-400 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaders.length === 0 ? (
              <div className="py-6 text-center">
                <Trophy className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5 opacity-50" />
                <p className="text-xs text-slate-500 dark:text-slate-400">No achievements recorded yet.</p>
              </div>
            ) : (
              leaders.map((entry: any) => {
                const rankStyle = RANK_STYLES[entry.rank - 1] || RANK_STYLES[2];
                return (
                  <div
                    key={entry.user_id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{rankStyle.icon}</span>
                      <RoyalAvatar
                        src={entry.profile_photo_path}
                        name={entry.name}
                        userId={entry.user_id}
                        employeeCode={entry.employee_code}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="min-w-0">
                        <p
                          style={{
                            fontSize: "13px",
                            lineHeight: "20px",
                            fontWeight: 500
                          }}
                          className="text-slate-900 dark:text-white truncate"
                        >
                          <RoyalName name={entry.name} userId={entry.user_id} className="text-slate-900 dark:text-white" />
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            lineHeight: "16px",
                            color: "rgb(94, 105, 120)"
                          }}
                          className="dark:text-slate-400 truncate"
                        >
                          {entry.designation || (entry.total_achievements ? `${entry.total_achievements} Award${entry.total_achievements !== 1 ? 's' : ''}` : 'Top Contributor')}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                      {entry.total_achievements} Award{entry.total_achievements !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recognition Footer Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <span
            style={{
              fontSize: "11px",
              lineHeight: "16px",
              color: "rgb(94, 105, 120)"
            }}
            className="dark:text-slate-400 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Celebrate peer milestones
          </span>

          {isSuperAdmin ? (
            <Link
              href="/recognitions"
              style={{
                fontSize: "12px",
                lineHeight: "18px",
                color: "#56348f"
              }}
              className="font-medium dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Recognize <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => setShowGuideDrawer(true)}
              style={{
                fontSize: "12px",
                lineHeight: "18px",
                color: "#56348f"
              }}
              className="font-medium dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Recognize <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT-SIDE SLIDE-OVER DRAWER FOR EMPLOYEES & TEAM LEADS ── */}
      {showGuideDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setShowGuideDrawer(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <h2
                  style={{
                    fontSize: "17px",
                    lineHeight: "24px",
                    fontWeight: 600,
                    color: "rgb(15, 24, 36)"
                  }}
                  className="dark:text-white flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                  How to Get Recognized
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: "rgb(94, 105, 120)"
                  }}
                  className="dark:text-slate-400 mt-0.5"
                >
                  Inter Smart Recognition & Award Guidelines
                </p>
              </div>
              <button
                onClick={() => setShowGuideDrawer(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
              {/* Award Categories */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Recognition Categories
                </h3>
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-750">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white text-sm">
                      <span>👑</span>
                      <span>Hubstaff King / Top Tracked Hours</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Awarded for highest productivity, consistent billable hours, and active contribution.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-750">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white text-sm">
                      <span>⭐</span>
                      <span>Employee of the Month / Week</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Given for outstanding project milestones, client appreciation, and leadership initiative.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-750">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white text-sm">
                      <span>🏆</span>
                      <span>QA Champion & Code Excellence</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Recognizes zero-defect releases, rigorous testing, and exceptional technical solutions.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-750">
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white text-sm">
                      <span>⏰</span>
                      <span>Attendance & Punctuality Star</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Awarded for perfect on-time biometric check-ins and regular attendance.
                    </p>
                  </div>
                </div>
              </div>

              {/* How Nominations Work */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> How It Works
                </h3>
                <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#56348f]/10 text-[#56348f] dark:text-purple-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      <strong>Peer & Lead Nomination:</strong> Team Leads and colleagues highlight exceptional peer work to HR and Management.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#56348f]/10 text-[#56348f] dark:text-purple-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      <strong>Monthly Review:</strong> Management evaluates project metrics, feedback, and team impact.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#56348f]/10 text-[#56348f] dark:text-purple-400 font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      <strong>Hall of Fame & Badges:</strong> Winners receive official digital badges on their portal profile, Hall of Fame spotlight, and verified certificates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowGuideDrawer(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
              >
                Close
              </button>
              <a
                href="mailto:hr@intersmart.in?subject=Peer%20Recognition%20Nomination"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#56348f] hover:bg-[#452773] rounded-md transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                Nominate via HR
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
