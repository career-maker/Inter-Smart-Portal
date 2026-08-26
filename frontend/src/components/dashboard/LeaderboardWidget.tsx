"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Award, Sparkles, ChevronRight } from "lucide-react";
import api from "@/services/api";
import { RoyalName } from "@/components/ui/RoyalAvatar";

const RANK_STYLES = [
  { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/40", text: "text-amber-300", icon: "🥇" },
  { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/40", text: "text-slate-300", icon: "🥈" },
  { bg: "from-amber-700/20 to-orange-700/10", border: "border-amber-700/40", text: "text-amber-700", icon: "🥉" },
];

export function LeaderboardWidget() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                fontSize: "16px",
                lineHeight: "28px",
                fontWeight: 500,
                color: "rgb(15, 24, 36)"
              }}
              className="dark:text-white flex items-center gap-2"
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{rankStyle.icon}</span>
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
        <Link
          href="/recognitions"
          style={{
            fontSize: "12px",
            lineHeight: "18px",
            color: "#56348f"
          }}
          className="font-medium dark:text-purple-400 hover:underline flex items-center gap-0.5"
        >
          Recognize <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
