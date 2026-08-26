"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
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
        setLeaders(res.data.data.slice(0, 3));
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
      className="bg-white dark:bg-slate-800 rounded-md p-5 border border-slate-200/90 dark:border-slate-700/60 shadow-sm"
    >
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
            Top recognized employees and awardees
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
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">No achievements yet.</p>
        ) : (
          leaders.map((entry: any) => {
            const rankStyle = RANK_STYLES[entry.rank - 1] || RANK_STYLES[2];
            return (
              <div
                key={entry.user_id}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200/60 dark:border-slate-800"
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
                      {entry.total_achievements} Award{entry.total_achievements !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
