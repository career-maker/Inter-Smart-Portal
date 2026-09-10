"use client";

import React, { useState } from "react";
import { Gamepad2, Bug, Play, ArrowLeft, Trophy, Sparkles, ShieldAlert, Zap, Maximize2, Swords, Flame } from "lucide-react";
import { NetworkErrorWithGame } from "@/components/ui/NetworkErrorWithGame";

export default function GamePage() {
  const [activeGame, setActiveGame] = useState<"runner" | "bugsmart" | "battleroyale" | null>(null);

  // ── Fullscreen BugSmart Bounty Mode ──
  if (activeGame === "bugsmart") {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#06101a] w-screen h-screen overflow-hidden flex flex-col">
        {/* Floating Back to Games Button */}
        <button
          onClick={() => setActiveGame(null)}
          className="absolute top-3.5 left-4 z-[100000] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#081521]/95 hover:bg-[#0e2438] text-white font-bold text-xs border border-[#1e4460] shadow-2xl backdrop-blur-md transition-all cursor-pointer group"
          title="Exit game and return to games hub"
        >
          <ArrowLeft className="w-4 h-4 text-[#43ddff] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Games</span>
        </button>

        {/* Embedded BugSmart Bounty HTML Game */}
        <iframe
          src="/games/bugsmart-bounty.html"
          className="w-full h-full border-0 flex-1"
          title="BugSmart Bounty Game"
          allow="fullscreen; autoplay"
        />
      </div>
    );
  }

  // ── Fullscreen Bug Battle Royale Mode ──
  if (activeGame === "battleroyale") {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#060b14] w-screen h-screen overflow-hidden flex flex-col">
        {/* Floating Back to Games Button */}
        <button
          onClick={() => setActiveGame(null)}
          className="absolute top-3.5 left-4 z-[100000] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#081521]/95 hover:bg-[#0e2438] text-white font-bold text-xs border border-[#1e4460] shadow-2xl backdrop-blur-md transition-all cursor-pointer group"
          title="Exit game and return to games hub"
        >
          <ArrowLeft className="w-4 h-4 text-[#46d9ff] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Games</span>
        </button>

        {/* Embedded Bug Battle Royale Game */}
        <iframe
          src="/games/bug-battle-royale.html"
          className="w-full h-full border-0 flex-1"
          title="Bug Battle Royale Game"
          allow="fullscreen; autoplay"
        />
      </div>
    );
  }

  // ── Runner Game Mode ──
  if (activeGame === "runner") {
    return (
      <div className="w-full max-w-6xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveGame(null)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-[#56348f] dark:text-purple-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Games</span>
          </button>
        </div>

        <NetworkErrorWithGame standalone />
      </div>
    );
  }

  // ── Games Hub / Arcade Library ──
  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-indigo-300 border border-white/10">
            <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>InterSmart Arcade & Training Games</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Play, Learn & Compete
          </h1>
          <p className="text-sm text-indigo-200/80 leading-relaxed">
            Take a quick mental reset, challenge colleagues on the high-score leaderboard, or test your QA bug-spotting and troubleshooting skills in interactive battle arenas.
          </p>
        </div>

        {/* Ambient decorative elements */}
        <div className="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none opacity-20">
          <Gamepad2 className="w-48 h-48 text-white stroke-[1]" />
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Game Card 1: BugSmart Bounty */}
        <div className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
          {/* Card Preview Header */}
          <div className="relative h-44 sm:h-48 bg-gradient-to-br from-[#0c283d] via-[#081724] to-[#040e17] p-5 flex flex-col justify-between overflow-hidden border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#163a52] text-[#43ddff] text-[10px] font-extrabold border border-[#2b607c]">
                <Sparkles className="w-3 h-3 text-[#ffd45c]" />
                QA INVESTIGATION
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#68ef9a]/15 text-[#68ef9a] border border-[#68ef9a]/30">
                8 Defects
              </span>
            </div>

            <div className="z-10 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0e293c] border-2 border-[#2b6480] flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                🐞
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  BugSmart Bounty
                </h2>
                <p className="text-xs text-[#789cb4] font-medium">
                  Cartoon Bug Hunt & Classification
                </p>
              </div>
            </div>

            {/* Subtle background graphics */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-[#43ddff]/10 blur-2xl pointer-events-none" />
            <div className="absolute right-4 bottom-2 text-6xl opacity-15 pointer-events-none select-none">
              🔍
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Step into a simulated live e-commerce store. Click suspicious UI elements, trigger detective animations, identify defects across functional, security, and visual categories, and earn bounties!
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-700/60 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Mode</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">Time Attack</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Screen</div>
                <div className="text-xs font-bold text-[#43ddff] mt-0.5">Fullscreen</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Reward</div>
                <div className="text-xs font-bold text-[#68ef9a] mt-0.5">Bounty Rank</div>
              </div>
            </div>

            <button
              onClick={() => setActiveGame("bugsmart")}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#173f60] to-[#0c2b44] hover:from-[#1e4e75] hover:to-[#123857] text-[#43ddff] font-black text-sm border border-[#2b688c] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Launch BugSmart Bounty</span>
            </button>
          </div>
        </div>

        {/* Game Card 2: Bug Battle Royale */}
        <div className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
          {/* Card Preview Header */}
          <div className="relative h-44 sm:h-48 bg-gradient-to-br from-[#381024] via-[#1c0a1a] to-[#080d1a] p-5 flex flex-col justify-between overflow-hidden border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 text-[10px] font-extrabold border border-rose-800/60">
                <Swords className="w-3 h-3 text-rose-400" />
                CO-OP & VERSUS BATTLE
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                10 Rounds
              </span>
            </div>

            <div className="z-10 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#2a0e1c] border-2 border-rose-600/50 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                👾
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  Bug Battle Royale
                </h2>
                <p className="text-xs text-rose-300/80 font-medium">
                  Team QA vs Team DEV · Boss Fight
                </p>
              </div>
            </div>

            {/* Subtle background graphics */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
            <div className="absolute right-4 bottom-2 text-6xl opacity-15 pointer-events-none select-none">
              ⚔️
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Two teams battle a terrifying production monster! Take turns answering real-world bug severities, security vulnerabilities, and logic flaws to deal lethal damage and win the round.
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-700/60 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Style</div>
                <div className="text-xs font-bold text-rose-500 dark:text-rose-400 mt-0.5">Pass & Play</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Screen</div>
                <div className="text-xs font-bold text-[#46d9ff] mt-0.5">Fullscreen</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Teams</div>
                <div className="text-xs font-bold text-amber-500 mt-0.5">QA vs DEV</div>
              </div>
            </div>

            <button
              onClick={() => setActiveGame("battleroyale")}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#63142a] to-[#3b0818] hover:from-[#781833] hover:to-[#4a0a1f] text-rose-200 font-black text-sm border border-rose-500/40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Swords className="w-4 h-4 text-rose-300" />
              <span>Launch Battle Royale</span>
            </button>
          </div>
        </div>

        {/* Game Card 3: InterSmart Pixel Runner */}
        <div className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
          {/* Card Preview Header */}
          <div className="relative h-44 sm:h-48 bg-gradient-to-br from-[#2e1065] via-[#1e1b4b] to-[#0f172a] p-5 flex flex-col justify-between overflow-hidden border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/80 text-purple-300 text-[10px] font-extrabold border border-purple-800/60">
                <Trophy className="w-3 h-3 text-amber-400" />
                OFFICE LEADERBOARD
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                Endless Jumper
              </span>
            </div>

            <div className="z-10 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border-2 border-purple-600/50 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                🏃💨
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  InterSmart Pixel Runner
                </h2>
                <p className="text-xs text-purple-300/80 font-medium">
                  Retro Office Obstacle Sprint
                </p>
              </div>
            </div>

            {/* Subtle background graphics */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
            <div className="absolute right-4 bottom-2 text-6xl opacity-15 pointer-events-none select-none">
              🎮
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Dodge office obstacles, jump over servers and flying coffee mugs, experience dynamic day-and-night cycles, and compete against team members on the live high-score board!
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-700/60 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Style</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">8-bit Pixel</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Controls</div>
                <div className="text-xs font-bold text-purple-600 dark:text-purple-300 mt-0.5">Space / Tap</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Feature</div>
                <div className="text-xs font-bold text-amber-500 mt-0.5">Leaderboard</div>
              </div>
            </div>

            <button
              onClick={() => setActiveGame("runner")}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#56348f] to-[#3b1d6b] hover:from-[#673fb0] hover:to-[#482482] text-white font-black text-sm border border-purple-500/40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Pixel Runner</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
