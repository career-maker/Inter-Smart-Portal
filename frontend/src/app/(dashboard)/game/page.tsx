"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Gamepad2, Play, ArrowLeft, Trophy, Sparkles, Zap, 
  Maximize2, Swords, Crosshair, Rocket, Cpu, Search, Filter, ExternalLink, X
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { NetworkErrorWithGame } from "@/components/ui/NetworkErrorWithGame";
import { WorkplaceLeaderboard } from "@/components/game/WorkplaceLeaderboard";
import { GameKeyType, recordGameScore } from "@/lib/gameLeaderboards";

type GameKey = "runner" | "bugsmart" | "battleroyale" | "imposter" | "neongalaxy" | "cybermatrix" | null;
type CategoryKey = "all" | "arcade" | "puzzle" | "qa";

interface GameDef {
  id: GameKey;
  title: string;
  subtitle: string;
  category: "arcade" | "puzzle" | "qa";
  badge: string;
  badgeColor: string;
  tag: string;
  icon: string;
  image: string;
  gradient: string;
  description: string;
  accentColor: string;
  stats: [string, string][];
  launchText: string;
  buttonGradient: string;
}

// ── Static Games Definition (Outside component to adhere to Rules of Hooks) ──
const GAMES: GameDef[] = [
  {
    id: "neongalaxy",
    title: "Neon Galaxy",
    subtitle: "Star Fighter Space Arcade",
    category: "arcade",
    badge: "60 FPS Synth",
    badgeColor: "bg-sky-400/15 text-sky-400 border-sky-400/30",
    tag: "SPACE DEFENDER",
    icon: "🚀",
    image: "/games/cards/neon-galaxy.jpg",
    gradient: "from-[#0a1a2f] via-[#040c17] to-[#02050b]",
    description: "Pilot your starfighter through hyperspace! Blast rogue drone swarms, collect weapon power-ups, and enjoy retro synth sound effects.",
    accentColor: "#38bdf8",
    stats: [
      ["Engine", "Canvas 60fps"],
      ["Audio", "Web Synth"],
      ["Upgrades", "Tri-Beam & Shield"]
    ],
    launchText: "Play Neon Galaxy",
    buttonGradient: "from-[#0284c7] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] text-white border-sky-500/40"
  },
  {
    id: "cybermatrix",
    title: "Cyber Matrix",
    subtitle: "Terminal Code Breaker",
    category: "puzzle",
    badge: "Cipher Memory",
    badgeColor: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    tag: "NEURAL TERMINAL",
    icon: "⚡",
    image: "/games/cards/cyber-matrix.jpg",
    gradient: "from-[#06241e] via-[#031411] to-[#010a08]",
    description: "Infiltrate high-security mainframes! Memorize flashing hex node sequences, bypass firewalls, and climb from Script Kiddie to Ghost rank.",
    accentColor: "#00ffcc",
    stats: [
      ["Mode", "Pattern Recall"],
      ["FX", "CRT Scanline"],
      ["Theme", "Cyberpunk"]
    ],
    launchText: "Hack The Matrix",
    buttonGradient: "from-[#0d9488] to-[#065f46] hover:from-[#14b8a6] hover:to-[#047857] text-[#ccfbf1] border-emerald-500/40"
  },
  {
    id: "bugsmart",
    title: "BugSmart Bounty",
    subtitle: "Cartoon Bug Hunt & QA",
    category: "qa",
    badge: "8 Defects",
    badgeColor: "bg-[#68ef9a]/15 text-[#68ef9a] border-[#68ef9a]/30",
    tag: "QA INVESTIGATION",
    icon: "🐞",
    image: "/games/cards/bugsmart-bounty.jpg",
    gradient: "from-[#0c283d] via-[#081724] to-[#040e17]",
    description: "Step into a simulated e-commerce storefront. Click suspicious UI elements, trigger detective animations, identify bugs, and earn bounties!",
    accentColor: "#43ddff",
    stats: [
      ["Mode", "Time Attack"],
      ["Screen", "Fullscreen"],
      ["Reward", "Bounty Rank"]
    ],
    launchText: "Launch BugSmart Bounty",
    buttonGradient: "from-[#173f60] to-[#0c2b44] hover:from-[#1e4e75] hover:to-[#123857] text-[#43ddff] border-[#2b688c]"
  },
  {
    id: "battleroyale",
    title: "Bug Battle Royale",
    subtitle: "Team QA vs Team DEV Boss",
    category: "qa",
    badge: "10 Rounds",
    badgeColor: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    tag: "CO-OP & VERSUS",
    icon: "👾",
    image: "/games/cards/bug-battle-royale.jpg",
    gradient: "from-[#381024] via-[#1c0a1a] to-[#080d1a]",
    description: "Two teams battle a terrifying production monster! Take turns answering real-world bug severities, security vulnerabilities, and logic flaws to win.",
    accentColor: "#fb7185",
    stats: [
      ["Style", "Pass & Play"],
      ["Screen", "Fullscreen"],
      ["Teams", "QA vs DEV"]
    ],
    launchText: "Launch Battle Royale",
    buttonGradient: "from-[#63142a] to-[#3b0818] hover:from-[#781833] hover:to-[#4a0a1f] text-rose-200 border-rose-500/40"
  },
  {
    id: "imposter",
    title: "Imposter Aircraft",
    subtitle: "Rogue Jet Air Squad Intercept",
    category: "arcade",
    badge: "1 Chance",
    badgeColor: "bg-orange-400/15 text-orange-300 border-orange-400/30",
    tag: "RADAR INTERCEPT",
    icon: "✈️",
    image: "/games/cards/imposter-aircraft.jpg",
    gradient: "from-[#1c120c] via-[#100c08] to-[#040404]",
    description: "There is an impostor aircraft flying in our fighter squad! Watch the high-speed radar flight paths and capture the rogue jet on your single chance.",
    accentColor: "#fb923c",
    stats: [
      ["Chances", "1 Shot"],
      ["Screen", "Fullscreen"],
      ["Target", "Imposter Jet"]
    ],
    launchText: "Launch Imposter Aircraft",
    buttonGradient: "from-[#9a3412] to-[#431407] hover:from-[#c2410c] hover:to-[#571b09] text-orange-100 border-orange-500/40"
  },
  {
    id: "runner",
    title: "InterSmart Pixel Runner",
    subtitle: "Retro Office Obstacle Sprint",
    category: "arcade",
    badge: "Leaderboard",
    badgeColor: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    tag: "OFFICE RUNNER",
    icon: "🏃💨",
    image: "/games/cards/pixel-runner.jpg",
    gradient: "from-[#2e1065] via-[#1e1b4b] to-[#0f172a]",
    description: "Dodge office obstacles, jump over servers and flying coffee mugs, experience dynamic day-and-night cycles, and compete on the company leaderboard!",
    accentColor: "#c084fc",
    stats: [
      ["Style", "8-bit Pixel"],
      ["Controls", "Space / Tap"],
      ["Feature", "High Scores"]
    ],
    launchText: "Play Pixel Runner",
    buttonGradient: "from-[#56348f] to-[#3b1d6b] hover:from-[#673fb0] hover:to-[#482482] text-white border-purple-500/40"
  }
];

const GAME_IFRAME_MAP: Record<
  "neongalaxy" | "cybermatrix" | "bugsmart" | "battleroyale" | "imposter",
  { src: string; title: string; bg: string; accentColor: string }
> = {
  neongalaxy: {
    src: "/games/neon-galaxy.html",
    title: "Neon Galaxy Star Fighter",
    bg: "#030611",
    accentColor: "#38bdf8",
  },
  cybermatrix: {
    src: "/games/cyber-matrix.html",
    title: "Cyber Matrix Code Breaker",
    bg: "#050811",
    accentColor: "#00ffcc",
  },
  bugsmart: {
    src: "/games/bugsmart-bounty.html",
    title: "BugSmart Bounty Game",
    bg: "#06101a",
    accentColor: "#43ddff",
  },
  battleroyale: {
    src: "/games/bug-battle-royale.html",
    title: "Bug Battle Royale Game",
    bg: "#060b14",
    accentColor: "#46d9ff",
  },
  imposter: {
    src: "/games/imposter-aircraft.html",
    title: "Imposter Aircraft Game",
    bg: "#000000",
    accentColor: "#fb923c",
  },
};

const TOP_RECORDS: Record<string, string> = {
  neongalaxy: "Vishal Ramesh • 8,950 pts",
  cybermatrix: "Vishnu Sasidharan • 3,250 pts",
  bugsmart: "Aswathi M Ashok • ₹5,200",
  battleroyale: "Team QA • 4,600 pts",
  imposter: "Bonies Doyal • 26 jets",
  runner: "Manu K O • 285 pts",
};

export default function GamePage() {
  // ── All Hooks Defined at the Very Top (Strict Rules of Hooks Compliance) ──
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [activeGame, setActiveGame] = useState<GameKey>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInGameLeaderboard, setShowInGameLeaderboard] = useState(false);

  const currentUserInfo = useMemo(() => {
    const full = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    return {
      id: user?.id ? String(user.id) : "user-current",
      name: full || user?.email || "Aswathi M Ashok",
      role: user?.designation || user?.role || "Lead QA Analyst",
      initials: user?.first_name
        ? `${user.first_name[0]}${user.last_name?.[0] || ""}`.toUpperCase()
        : "AA",
    };
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for ESC key to exit active game mode or close leaderboard drawer
  useEffect(() => {
    if (!activeGame) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showInGameLeaderboard) {
          setShowInGameLeaderboard(false);
        } else {
          setActiveGame(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGame, showInGameLeaderboard]);

  // Listen for score postMessage from iframe games
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "GAME_SCORE_SUBMIT" && e.data.game && typeof e.data.score === "number") {
        recordGameScore(e.data.game as GameKeyType, e.data.score, currentUserInfo);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentUserInfo]);

  const filteredGames = useMemo(() => {
    return GAMES.filter(g => {
      const matchCat = selectedCategory === "all" || g.category === selectedCategory;
      const matchSearch = !searchQuery || 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        g.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // ── Fullscreen Game Overlay (Using React Portal to escape dashboard layout isolation) ──
  if (activeGame && activeGame !== "runner") {
    const config = GAME_IFRAME_MAP[activeGame];
    if (config && mounted) {
      return createPortal(
        <div 
          style={{ backgroundColor: config.bg }}
          className="fixed inset-0 z-[999999] w-full h-full h-[100dvh] overflow-hidden flex flex-col select-none relative"
        >
          {/* Top Control Bar */}
          <div className="h-12 sm:h-14 px-2.5 sm:px-4 bg-black/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-[1000000] shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowInGameLeaderboard(false);
                  setActiveGame(null);
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 shadow-md transition-all cursor-pointer group"
                title="Return to Arcade (Press Esc)"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-1" style={{ color: config.accentColor }} />
                <span>Back to Games</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 text-xs text-white/70">
                <span className="font-semibold text-white">{config.title}</span>
                <span className="text-white/40">•</span>
                <span className="text-[11px] text-white/50">Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 text-[10px] font-mono">Esc</kbd> to exit</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Leaderboard Toggle Button */}
              <button
                onClick={() => setShowInGameLeaderboard((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  showInGameLeaderboard
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-102"
                    : "bg-white/10 hover:bg-white/20 text-amber-300 border-amber-400/30"
                }`}
                title="Toggle workplace scoreboard"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">Scoreboard</span>
              </button>

              <a
                href={`${config.src}?v=3`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
                title="Open game in dedicated window/tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Open in New Tab</span>
              </a>
            </div>
          </div>

          {/* Embedded Game Frame */}
          <iframe
            src={`${config.src}?v=3`}
            className="w-full h-full border-0 flex-1 bg-transparent"
            title={config.title}
            allow="fullscreen; autoplay"
          />

          {/* In-Game Slide-over Leaderboard Drawer */}
          {showInGameLeaderboard && (
            <div className="absolute top-12 sm:top-14 right-0 bottom-0 w-full sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-[1000001] shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Workplace High Scores</span>
                </div>
                <button
                  onClick={() => setShowInGameLeaderboard(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <WorkplaceLeaderboard
                currentUser={currentUserInfo}
                initialGame={activeGame as GameKeyType}
                compact
              />
            </div>
          )}
        </div>,
        document.body
      );
    }
  }

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
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-indigo-300 border border-white/10">
            <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>InterSmart Arcade & Training Games</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Play, Learn & Compete
          </h1>
          <p className="text-sm text-indigo-200/85 leading-relaxed">
            Take a quick mental reset during work hours. Enjoy retro-futuristic arcade action, cyberpunk terminal puzzles, defect-hunting investigation arenas, and office leaderboard sprints.
          </p>

          {/* Quick Highlight Metrics */}
          <div className="pt-2 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span><strong>6</strong> Unique Games</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Full-Screen Immersive</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-200">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Web Audio Synthesizer</span>
            </div>
          </div>
        </div>

        {/* Ambient decorative elements */}
        <div className="absolute right-[-20px] bottom-[-20px] w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none opacity-20">
          <Gamepad2 className="w-56 h-56 text-white stroke-[1]" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 overflow-x-auto [scrollbar-width:none]">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "all"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All Games ({GAMES.length})
          </button>
          <button
            onClick={() => setSelectedCategory("arcade")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "arcade"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Arcade & Action (3)
          </button>
          <button
            onClick={() => setSelectedCategory("puzzle")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "puzzle"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Brain & Puzzle (1)
          </button>
          <button
            onClick={() => setSelectedCategory("qa")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "qa"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            QA & Training (2)
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1"
          >
            {/* Card Preview Header with Generated Cover Art */}
            <div className="relative h-48 sm:h-52 overflow-hidden border-b border-slate-200 dark:border-slate-700 group/header bg-slate-950">
              {/* Background Cover Image */}
              <img
                src={game.image}
                alt={game.title}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                loading="lazy"
              />

              {/* Multi-layered Cinematic Gradient Scrim for Contrast & Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-[#050b14]/50 to-black/35 pointer-events-none" />

              {/* Top Badges */}
              <div className="relative z-10 p-4 flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-black border border-white/15 shadow-sm"
                  style={{ color: game.accentColor }}
                >
                  <Sparkles className="w-3 h-3" />
                  {game.tag}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-md border ${game.badgeColor}`}>
                  {game.badge}
                </span>
              </div>

              {/* Bottom Title & Icon Overlay */}
              <div className="absolute bottom-3.5 left-4 right-4 z-10 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                  {game.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md truncate">
                    {game.title}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium drop-shadow-xs truncate">
                    {game.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                {game.description}
              </p>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-700/60 text-center">
                {game.stats.map(([lbl, val], idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">{lbl}</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5" style={idx === 1 ? { color: game.accentColor } : {}}>
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 truncate">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">CHAMPION</span>
                  <span className="truncate">{TOP_RECORDS[game.id || ""] || "Top Champion"}</span>
                </span>
              </div>

              <button
                onClick={() => setActiveGame(game.id)}
                className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${game.buttonGradient} font-black text-sm border flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer`}
              >
                <Maximize2 className="w-4 h-4" />
                <span>{game.launchText}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div className="text-3xl mb-2">🎮</div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No games matched your filter</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting your search query or selecting "All Games".</p>
          <button
            onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* ── WORKPLACE HIGH SCORES & LEADERBOARDS SECTION (ALL GAMES WITH REAL EMPLOYEES) ── */}
      <section className="pt-2">
        <WorkplaceLeaderboard
          currentUser={currentUserInfo}
          onLaunchGame={(k) => setActiveGame(k)}
        />
      </section>
    </div>
  );
}
