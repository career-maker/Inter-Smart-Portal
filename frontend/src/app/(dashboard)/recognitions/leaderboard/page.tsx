"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import api from "@/services/api";
import { Trophy, Star, Award, TrendingUp, Crown, Info, X, Loader2 } from "lucide-react";
import { AchievementFlipCard } from "@/components/recognition/AchievementFlipCard";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { useTopAwardee } from "@/context/TopAwardeeContext";

function LaurelLeft() {
  return (
    <svg className="w-8 h-12 text-violet-400 shrink-0 select-none pointer-events-none" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 4C23 10 17 18 10 26C7 29.5 4 34 2 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M23 6C20 4 14 5 15 10C16 14 21 11 23 6Z" fill="currentColor"/>
      <path d="M19 14C15 13 10 15 12 20C14 23 18 19 19 14Z" fill="currentColor"/>
      <path d="M14 23C10 23 6 26 9 30C11 33 15 28 14 23Z" fill="currentColor"/>
      <path d="M9 32C5 33 2 37 6 41C9 43 12 37 9 32Z" fill="currentColor"/>
    </svg>
  );
}

function LaurelRight() {
  return (
    <svg className="w-8 h-12 text-violet-400 shrink-0 scale-x-[-1] select-none pointer-events-none" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 4C23 10 17 18 10 26C7 29.5 4 34 2 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M23 6C20 4 14 5 15 10C16 14 21 11 23 6Z" fill="currentColor"/>
      <path d="M19 14C15 13 10 15 12 20C14 23 18 19 19 14Z" fill="currentColor"/>
      <path d="M14 23C10 23 6 26 9 30C11 33 15 28 14 23Z" fill="currentColor"/>
      <path d="M9 32C5 33 2 37 6 41C9 43 12 37 9 32Z" fill="currentColor"/>
    </svg>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-md p-5 flex items-center gap-4 shadow-md">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-black text-white truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function TopPerformerBox({
  name,
  designation,
  department,
  photo,
  onClick,
}: {
  name?: string | null;
  designation?: string | null;
  department?: string | null;
  photo?: string | null;
  onClick?: () => void;
}) {
  if (!name) {
    return (
      <div className="bg-slate-900/90 border border-violet-500/30 rounded-md p-5 flex flex-col items-center justify-center text-center shadow-md shadow-violet-500/5">
        <div className="flex items-center gap-1.5 text-violet-400 mb-2">
          <Crown className="w-4 h-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">TOP PERFORMER</span>
        </div>
        <p className="text-sm font-semibold text-slate-400">No Top Performer Yet</p>
      </div>
    );
  }

  const roleText = [designation, department].filter(Boolean).join(" • ");

  return (
    <div
      onClick={onClick}
      className="bg-slate-900/95 border-2 border-violet-500/40 rounded-md p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg shadow-violet-500/10 cursor-pointer hover:border-violet-400 transition-all duration-200"
    >
      {/* Top Header Badge */}
      <div className="flex items-center gap-1.5 text-violet-400 mb-2.5">
        <Crown className="w-4 h-4" />
        <span className="text-[11px] font-bold uppercase tracking-wider">TOP PERFORMER</span>
      </div>

      {/* Center Avatar with Laurels */}
      <div className="flex items-center justify-center gap-1 my-1">
        <LaurelLeft />
        <div className="relative">
          <RoyalAvatar
            src={photo}
            name={name}
            isTopAwardee={true}
            className="w-14 h-14 rounded-full ring-2 ring-violet-400/40 shadow-md"
          />
        </div>
        <LaurelRight />
      </div>

      {/* Name and Designation */}
      <div className="mt-2 min-w-0 w-full px-2">
        <h4 className="text-sm font-bold truncate leading-tight">
          <RoyalName name={name} isTopAwardee={true} />
        </h4>
        <p className="text-xs text-slate-400 truncate mt-0.5">{roleText || "Employee"}</p>
      </div>
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-amber-500/25 ring-2 ring-amber-300/50 shrink-0">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-slate-400/25 ring-2 ring-slate-300/50 shrink-0">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 flex items-center justify-center text-white font-black text-sm shadow-md shadow-amber-700/25 ring-2 ring-amber-600/50 shrink-0">
        3
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-800/90 text-slate-400 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-700/80">
      {rank}
    </div>
  );
}

export default function RecognitionLeaderboardPage() {
  const [tab, setTab] = useState<"overall" | "week">("overall");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { setTopAwardeeFromLeaderboard } = useTopAwardee();

  // Employee Awards Modal State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any | null>(null);
  const [employeeAwards, setEmployeeAwards] = useState<any[]>([]);
  const [loadingAwards, setLoadingAwards] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/recognitions/leaderboard?period=${tab}`);
        setData(res.data);
        if (res.data) {
          setTopAwardeeFromLeaderboard(res.data);
        }
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [tab, setTopAwardeeFromLeaderboard]);

  const handleEmployeeClick = async (userId: number) => {
    setSelectedUserId(userId);
    setLoadingAwards(true);
    setEmployeeDetails(null);
    setEmployeeAwards([]);

    try {
      const res = await api.get(`/recognitions/employee/${userId}`);
      setEmployeeDetails(res.data.employee);
      setEmployeeAwards(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch employee recognitions", err);
    } finally {
      setLoadingAwards(false);
    }
  };

  const closeAwardsModal = () => {
    setSelectedUserId(null);
    setEmployeeDetails(null);
    setEmployeeAwards([]);
  };

  if (loading && !data) return <PageLoader />;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-white">
            <Trophy className="w-7 h-7 text-amber-400" />
            Recognition Leaderboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Celebrating outstanding achievements across Inter Smart.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-900/90 border border-white/10 rounded-xl p-1 gap-1">
          {(["overall", "week"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "overall" ? "Overall" : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <StatCard
            label="TOTAL AWARDS ISSUED"
            value={data.stats.total_issued}
            icon={Award}
            color="bg-amber-500/20 text-amber-400"
          />

          <StatCard
            label="ACTIVE HOLDERS"
            value={data.stats.active_holders}
            icon={Star}
            color="bg-emerald-500/20 text-emerald-400"
          />

          <TopPerformerBox
            name={data.stats.top_performer}
            designation={data.stats.top_performer_designation}
            department={data.stats.top_performer_department}
            photo={data.stats.top_performer_photo}
            onClick={() => {
              if (data.stats.top_performer_user_id) {
                handleEmployeeClick(data.stats.top_performer_user_id);
              }
            }}
          />

          <StatCard
            label="MOST AWARDED"
            value={data.stats.most_awarded || "—"}
            icon={TrendingUp}
            color="bg-blue-500/20 text-blue-400"
          />
        </div>
      )}

      {/* Hall of Fame Leaderboard Table */}
      <div className="bg-slate-900/90 border border-white/10 rounded-md overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Table Header Section */}
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                HALL OF FAME
              </h2>
              <p className="text-xs text-slate-400">
                {tab === "overall" ? "All-time Top Performers" : "This Week's Top Performers"}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Rankings based on total awards received
          </span>
        </div>

        {/* Table / Empty State */}
        {(() => {
          const awardedEntries = data?.data?.filter((e: any) => e.total_achievements > 0) || [];

          if (awardedEntries.length === 0) {
            return (
              <div className="text-center py-16 px-4">
                <Trophy className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
                <p className="text-white font-bold text-base">No achievements recorded yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  {tab === "week"
                    ? "No awards have been issued for this week."
                    : "Start by assigning recognitions to employees from the recognitions management page."}
                </p>
              </div>
            );
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase font-semibold text-slate-400 tracking-wider">
                    <th className="px-3 py-3 w-24">RANK</th>
                    <th className="px-3 py-3">EMPLOYEE</th>
                    <th className="px-3 py-3">DESIGNATION</th>
                    <th className="px-3 py-3">DEPARTMENT</th>
                    <th className="px-3 py-3 text-center">TOTAL AWARDS</th>
                    <th className="px-3 py-3">LATEST AWARD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {awardedEntries.map((entry: any) => {
                    const isRank1 = entry.rank === 1;

                    return (
                      <tr
                        key={entry.user_id}
                        onClick={() => handleEmployeeClick(entry.user_id)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isRank1
                            ? "bg-amber-500/10 hover:bg-amber-500/15"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-3">
                          <RankMedal rank={entry.rank} />
                        </td>

                        {/* Employee */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <RoyalAvatar
                              src={entry.profile_photo_path}
                              name={entry.name}
                              userId={entry.user_id}
                              isTopAwardee={isRank1 || undefined}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <div className="font-bold text-sm leading-snug">
                                <RoyalName
                                  name={entry.name}
                                  userId={entry.user_id}
                                  isTopAwardee={isRank1 || undefined}
                                />
                              </div>
                              {entry.latest_achievement_title && (
                                <div className="text-xs text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                  <span>{entry.latest_achievement_icon || "🏆"}</span>
                                  <span>{entry.latest_achievement_title}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="px-3 py-3 text-slate-300 font-medium text-sm">
                          {entry.designation || "—"}
                        </td>

                        {/* Department */}
                        <td className="px-3 py-3 text-slate-400 font-medium text-sm">
                          {entry.department || "—"}
                        </td>

                        {/* Total Awards */}
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5 font-bold text-amber-300 text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{entry.total_achievements}</span>
                          </div>
                        </td>

                        {/* Latest Award */}
                        <td className="px-3 py-3">
                          {entry.latest_achievement_title ? (
                            <div>
                              <div className="text-amber-300 font-semibold text-sm flex items-center gap-1.5">
                                <span>{entry.latest_achievement_icon || "🏆"}</span>
                                <span>{entry.latest_achievement_title}</span>
                              </div>
                              {entry.latest_achievement_date && (
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <span>🏆</span>
                                  <span>{entry.latest_achievement_date}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No awards yet</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Footer info note */}
        <div className="p-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400 bg-white/[0.01]">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Click on any employee to view their full achievement history and award details.</span>
        </div>
      </div>

      {/* ── Employee Awards Grid Modal ── */}
      {selectedUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/15 rounded-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <RoyalAvatar
                  src={employeeDetails?.profile_photo_path}
                  name={employeeDetails?.name || "Employee"}
                  userId={employeeDetails?.id}
                  className="w-14 h-14 rounded-md text-lg shadow-md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold truncate">
                      <RoyalName
                        name={employeeDetails?.name || "Employee Awards"}
                        userId={employeeDetails?.id}
                      />
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {employeeAwards.length} Award{employeeAwards.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {[employeeDetails?.designation, employeeDetails?.department].filter(Boolean).join(" • ") || "Achievement History"}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={closeAwardsModal}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Grid Boxes */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
              {loadingAwards ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Loading achievement history…</p>
                </div>
              ) : employeeAwards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Trophy className="w-16 h-16 text-slate-600 mb-3" />
                  <h4 className="text-base font-bold text-white">No awards on record</h4>
                  <p className="text-xs text-slate-400 mt-1">This employee has not received any recognition awards yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {employeeAwards.map((rec) => (
                    <div key={rec.id} className="w-full">
                      <AchievementFlipCard
                        recognition={rec}
                        employeeName={employeeDetails?.name || "Employee"}
                        firstName={employeeDetails?.first_name || "Employee"}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Click card to flip • View & download verified certificate
              </span>
              <button
                onClick={closeAwardsModal}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
