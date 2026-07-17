"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import api from "@/services/api";
import { Trophy, Star, Users, Award, TrendingUp, Medal, Crown } from "lucide-react";

function TopPerformerCard({ name, designation }: { name: string; designation?: string }) {
  return (
    <>
      <style>{`
      .btn-wrapper {
        --color: #b5faff31;
        --txt-color: #ffffff;
        --txt-color-2: #a1a1a1;
        --point-size: 8px;
        --point-color: #ffffff;
        --line-color: #00000015;
        --line-style: solid;
        --line-weight: 1px;
        --anim-speed: 1s;

        position: relative;
        display: grid;
        place-items: center;
        padding: 1rem 1.5rem;
        min-width: 280px;
        min-height: 56px;
      }

      .txt-secondary {
        position: absolute;
        bottom: -2rem;
        font: 400 0.75em "Inter", sans-serif;
        color: #0006;
        font-style: italic;
        will-change: opacity;
        transition: opacity calc(var(--anim-speed, 1s) * 0.5) ease;
        opacity: 0;
      }
      #hint2 {
        opacity: 0;
      }

      .btn {
        filter: drop-shadow(0 6px 2px #00000055) drop-shadow(0 14px 4px #00000055)
          drop-shadow(0 32px 8px #00000055) drop-shadow(0 64px 16px #00000055);

        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        background: none;
        width: 100%;
        height: 100%;
      }

      .txt-box {
        position: absolute;
        display: grid;
        place-items: center;
        text-wrap: nowrap;
        inset: 0 0%;
        overflow: clip;
        will-change: inset, filter;
        transition: filter 0.25s ease;
        animation: frame-half calc(var(--anim-speed, 1s) * 0.5) forwards;
      }

      .txt-box::after {
        content: "";
        position: absolute;
        inset: var(--point-size, 8px);
        background: repeating-linear-gradient(45deg, #3f87a6, #ebf8e1 15%, #fff 20%);
        mix-blend-mode: hard-light;
        background-size: 440%;
        transition: background-size 0.4s ease-in;
        filter: blur(1px);
        z-index: 3;
        opacity: 0.1;
      }

      .txt {
        position: absolute;
        padding: 0.5rem 1rem;
        z-index: 2;
        font: 500 0.95em "Inter", sans-serif;
        color: var(--txt-color, #15104c);
        will-change: opacity, display, text-shadow;
        text-shadow:
          0 -1px 1px #ffffff60,
          0 2px 1px #00000015,
          0 4px 2px #00000015,
          0 8px 4px #00000015,
          0 16px 8px #00000015;
      }
      .txt:last-child {
        color: var(--txt-color-2, #15104c);
        opacity: 0;
        animation: none;
      }

      .frame {
        position: absolute;
        inset: 0 0%;
        z-index: 1;
        border: var(--line-style, solid) var(--line-weight, 1px)
          var(--line-color, #000000);
        background-color: var(--color, #f9d323);
        transition-delay: calc(var(--anim-speed, 1s) * 0.5);
        box-shadow: inset 0 1px 4px 1px #fff5;
        animation: frame-half calc(var(--anim-speed, 1s) * 0.5) forwards;
      }

      .point {
        position: absolute;
        box-sizing: border-box;
        width: var(--point-size, 8px);
        aspect-ratio: 1;
        border-radius: 25%;
        border: solid var(--line-weight, 1px) var(--line-color, #000000);
        background-color: var(--point-color, #fff);
        background-image: radial-gradient(circle at 50% 120%, #0005, #ffff);
      }
      .point.top {
        top: calc(var(--point-size, 8px) * -0.5);
      }
      .point.bottom {
        bottom: calc(var(--point-size, 8px) * -0.5);
      }
      .point.left {
        left: calc(var(--point-size, 8px) * -0.5);
      }
      .point.right {
        right: calc(var(--point-size, 8px) * -0.5);
      }

      .btn:hover .txt {
        animation: txt-out calc(var(--anim-speed, 1s) * 0.5) forwards;
      }
      .btn:hover .txt:last-child {
        animation: txt-in calc(var(--anim-speed, 1s) * 0.5) forwards;
      }

      .btn:hover .txt-box {
        animation: frame var(--anim-speed, 1s) ease;
      }

      .btn:hover .txt-box::after {
        background-size: 700%;
      }

      .btn:hover .frame {
        animation: frame var(--anim-speed, 1s) ease;
      }

      .btn:hover ~ #hint1 {
        opacity: 0;
      }
      .btn:hover ~ #hint2 {
        opacity: 1;
      }

      @keyframes txt-in {
        90% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @keyframes txt-out {
        50% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      @keyframes frame-half {
        0% {
          inset: 0 50%;
        }
        100% {
          inset: 0 0%;
        }
      }

      @keyframes frame {
        50% {
          inset: 0 50%;
        }
      }
    `}</style>
    <div className="btn-wrapper">
      <button className="btn">
        <span className="frame">
          <span className="point top left"></span>
          <span className="point top right"></span>
          <span className="point bottom left"></span>
          <span className="point bottom right"></span>
        </span>
        <span className="txt-box">
          <span className="txt">{name}</span>
          <span className="txt">{designation || "Employee"}</span>
        </span>
      </button>
      <div className="txt-secondary" id="hint1">Hover to reveal designation</div>
      <div className="txt-secondary" id="hint2">Top Performer</div>
    </div>
    </>
  );
}

const RANK_STYLES = [
  { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/40", text: "text-amber-300", icon: "🥇" },
  { bg: "from-slate-400/20 to-slate-500/10", border: "border-slate-400/40", text: "text-muted-foreground", icon: "🥈" },
  { bg: "from-amber-700/20 to-orange-700/10", border: "border-amber-700/40", text: "text-amber-700", icon: "🥉" },
];

function PhotoAvatar({ src, name, className = "" }: { src?: string | null; name: string; className?: string }) {
  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div className={`relative overflow-hidden flex items-center justify-center font-bold text-muted-foreground bg-slate-700 ${className}`}>
      <span>{initials}</span>
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`bg-white/5 border border-border rounded-2xl p-4 flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-base font-black text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, onClick }: { entry: any; onClick: () => void }) {
  const rankStyle = entry.rank <= 3 ? RANK_STYLES[entry.rank - 1] : null;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${
        rankStyle
          ? `bg-gradient-to-r ${rankStyle.bg} ${rankStyle.border}`
          : "bg-white/5 border-border hover:bg-white/10"
      }`}
    >
      {/* Rank */}
      <div className="w-10 shrink-0 text-center">
        {entry.rank <= 3 ? (
          <span className="text-2xl">{rankStyle!.icon}</span>
        ) : (
          <span className="text-lg font-black text-slate-500">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar with badge overlay */}
      <div className="relative shrink-0">
        <PhotoAvatar
          src={entry.profile_photo_path}
          name={entry.name}
          className="w-12 h-12 rounded-full text-sm"
        />
        {entry.active_achievement && (
          <div
            className="absolute -top-1 -right-1 text-base leading-none"
            title={entry.active_achievement.title}
          >
            {entry.active_achievement.icon || "🏆"}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm leading-tight">{entry.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {entry.designation} · {entry.department}
        </p>
        {entry.latest_achievement_title && (
          <p className="text-xs text-amber-400/80 mt-1 truncate">
            Latest: {entry.latest_achievement_icon} {entry.latest_achievement_title}
          </p>
        )}
      </div>

      {/* Achievement count */}
      <div className="shrink-0 text-right">
        <p className={`text-2xl font-black ${rankStyle ? rankStyle.text : "text-muted-foreground"}`}>
          {entry.total_achievements}
        </p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
          {entry.total_achievements === 1 ? "Award" : "Awards"}
        </p>
      </div>
    </div>
  );
}

export default function RecognitionLeaderboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"overall" | "week">("overall");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/recognitions/leaderboard?period=${tab}`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [tab]);

  const handleEmployeeClick = (userId: number) => {
    router.push(`/profile?employee_id=${userId}#achievements`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Trophy className="w-7 h-7 text-amber-400" />
            Recognition Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Celebrating outstanding achievements across Inter Smart.
          </p>
        </div>
        {/* Tab switcher */}
        <div className="flex bg-white/5 border border-border rounded-xl p-1 gap-1">
          {(["overall", "week"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t
                  ? "bg-amber-500 text-foreground shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {t === "overall" ? "Overall" : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Awards Issued"
            value={data.stats.total_issued}
            icon={Award}
            color="bg-amber-500/20 text-amber-400"
          />
          <StatCard
            label="Active Holders"
            value={data.stats.active_holders}
            icon={Star}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <div className="bg-white/5 backdrop-blur-md border border-border rounded-2xl p-4 flex flex-col items-center justify-center min-h-[120px]">
            <div className="flex items-center gap-2 mb-3 text-violet-400">
              <Crown className="w-5 h-5" />
              <h3 className="text-xs font-semibold text-muted-foreground">Top Performer</h3>
            </div>
            {data.stats.top_performer && data.stats.top_performer_designation ? (
              <TopPerformerCard
                name={data.stats.top_performer}
                designation={data.stats.top_performer_designation}
              />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <StatCard
            label="Most Awarded"
            value={data.stats.most_awarded || "—"}
            icon={TrendingUp}
            color="bg-blue-500/20 text-blue-400"
          />
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white/5 backdrop-blur-md border border-border rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Medal className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-foreground">
            {tab === "overall" ? "All-Time Rankings" : "This Week's Champions"}
          </h2>
          <span className="ml-auto text-xs text-slate-500 hidden sm:inline">
            Click any employee to view their full achievements
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No achievements recorded yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              {tab === "week" ? "No awards issued this week." : "Start by assigning recognitions to employees."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.data?.map((entry: any) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                onClick={() => handleEmployeeClick(entry.user_id)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-600 mt-4">
        {tab === "week"
          ? "Showing awards active during the current week (Mon–Sun). Resets automatically each week."
          : "All-time ranking based on total awards received. Click any employee to view their full achievement history."}
      </p>
    </div>
  );
}
