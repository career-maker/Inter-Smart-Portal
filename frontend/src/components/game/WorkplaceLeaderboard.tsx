"use client";

import React, { useState, useMemo } from "react";
import { 
  Trophy, Award, Crown, Flame, Sparkles, Play, Gamepad2, ChevronRight 
} from "lucide-react";
import { 
  GameKeyType, GAME_INFO_MAP, getGameLeaderboard, GameLeaderboardEntry, CurrentUserInfo 
} from "@/lib/gameLeaderboards";

interface WorkplaceLeaderboardProps {
  currentUser: CurrentUserInfo;
  onLaunchGame?: (gameKey: GameKeyType) => void;
  initialGame?: GameKeyType;
  compact?: boolean;
}

export function WorkplaceLeaderboard({
  currentUser,
  onLaunchGame,
  initialGame = "neongalaxy",
  compact = false,
}: WorkplaceLeaderboardProps) {
  const [selectedGame, setSelectedGame] = useState<GameKeyType>(initialGame);

  const gameInfo = GAME_INFO_MAP[selectedGame];
  const leaderboard = useMemo(() => {
    return getGameLeaderboard(selectedGame, currentUser);
  }, [selectedGame, currentUser]);

  // Current user metrics
  const currentUserIndex = leaderboard.findIndex((p) => p.isCurrentUser);
  const currentUserEntry = currentUserIndex >= 0 ? leaderboard[currentUserIndex] : null;
  const currentRank = currentUserIndex >= 0 ? currentUserIndex + 1 : leaderboard.length;
  const higherScorers = currentUserIndex > 0 ? leaderboard.slice(0, currentUserIndex) : [];
  const nextTarget = higherScorers.length > 0 ? higherScorers[higherScorers.length - 1] : null;

  const gameKeys: GameKeyType[] = [
    "neongalaxy",
    "cybermatrix",
    "bugsmart",
    "battleroyale",
    "imposter",
    "runner",
  ];

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all ${compact ? "p-4 sm:p-6" : "p-6 sm:p-8"}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Workplace Champions & High Scores</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300/50">
                Live
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real high scores from your Inter Smart team members. Compete and claim the #1 spot!
            </p>
          </div>
        </div>

        {/* Current User Rank Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#56348f]/10 text-[#56348f] dark:bg-purple-500/15 dark:text-purple-300 border border-[#56348f]/25 dark:border-purple-500/30 shrink-0">
          <Award className="w-4 h-4" />
          <span>Your Rank: #{currentRank}</span>
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="pt-4 pb-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {gameKeys.map((key) => {
          const info = GAME_INFO_MAP[key];
          const isSelected = selectedGame === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedGame(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shrink-0 ${
                isSelected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-102"
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Game Comparison Banner */}
      <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/70 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{gameInfo.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {gameInfo.title}
              </span>
              <span className="text-[11px] text-slate-400">
                ({gameInfo.subtitle})
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {currentRank === 1 ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Crown className="w-4 h-4 text-amber-500" />
                  Outstanding! You hold the #1 High Score on the team with {currentUserEntry?.score || 0} {gameInfo.scoreUnit}!
                </span>
              ) : nextTarget ? (
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <strong>{nextTarget.name}</strong> is ahead by {nextTarget.score - (currentUserEntry?.score || 0)} {gameInfo.scoreUnit} ({nextTarget.score} {gameInfo.scoreUnit}). Beat it to take Rank #{currentRank - 1}!
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  Play to log your score on the workplace leaderboard!
                </span>
              )}
            </div>
          </div>
        </div>

        {onLaunchGame && (
          <button
            onClick={() => onLaunchGame(selectedGame)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#472a77] text-white text-xs font-black shadow-md shadow-purple-900/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play {gameInfo.title}</span>
          </button>
        )}
      </div>

      {/* Leaderboard Entries List */}
      <div className="space-y-2">
        {leaderboard.map((player, idx) => {
          const rank = idx + 1;
          const isUser = player.isCurrentUser;
          const medal =
            rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

          return (
            <div
              key={player.id || `${player.name}-${idx}`}
              className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 rounded-2xl transition-all ${
                isUser
                  ? "bg-purple-50 dark:bg-purple-950/40 border-2 border-[#56348f] dark:border-purple-600 shadow-sm"
                  : "bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {/* Left Player Info */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 text-center text-sm font-extrabold text-slate-600 dark:text-slate-300">
                  {medal}
                </span>
                <div
                  className={`w-8 h-8 rounded-full ${player.avatarBg || "bg-[#56348f]"} text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs`}
                >
                  {player.avatarText || "IS"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm font-bold truncate ${
                        isUser
                          ? "text-[#56348f] dark:text-purple-300 font-extrabold"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {player.name}
                    </span>
                    {isUser && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#56348f] text-white rounded-md tracking-wider shadow-2xs">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {player.role || "Team Member"}
                  </p>
                </div>
              </div>

              {/* Right Score */}
              <div className="text-right shrink-0 pl-3">
                <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                  {player.formattedScore || `${player.score.toLocaleString()} ${gameInfo.scoreUnit}`}
                </span>
                {rank === 1 && (
                  <p className="text-[10.5px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-end gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>#1 Leader</span>
                  </p>
                )}
                {isUser && higherScorers.length > 0 && rank !== 1 && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">
                    -{leaderboard[0].score - player.score} from #1
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkplaceLeaderboard;
