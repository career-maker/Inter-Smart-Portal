"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Crown } from "lucide-react";
import api from "@/services/api";

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
        // Get top 3
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
    <div className="premium-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Hall of Fame
        </h3>
        <Link href="/recognitions/leaderboard" className="text-xs font-semibold text-amber-500 hover:underline">
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No achievements yet.</p>
        ) : (
          leaders.map((entry: any, i: number) => {
            const rankStyle = RANK_STYLES[entry.rank - 1] || RANK_STYLES[2];
            return (
              <div key={entry.user_id} className="flex items-center gap-3">
                <div className="w-8 shrink-0 text-center text-xl">
                  {rankStyle.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {entry.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate uppercase tracking-wider">
                    {entry.total_achievements} Award{entry.total_achievements !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
