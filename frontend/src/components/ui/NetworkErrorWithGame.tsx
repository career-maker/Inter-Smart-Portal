"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { WifiOff, RefreshCw, Trophy, Gamepad2, ArrowUp, Sparkles, Award, Flame, Crown } from "lucide-react";
import { useAuthStore } from "@/store/auth";

interface NetworkErrorWithGameProps {
  onRetry?: () => void;
  errorMessage?: string;
}

interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
  role?: string;
  isCurrentUser: boolean;
  avatarBg?: string;
  avatarText?: string;
}

export function NetworkErrorWithGame({ onRetry, errorMessage }: NetworkErrorWithGameProps) {
  const { user } = useAuthStore();
  const [retrying, setRetrying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Current logged in user details
  const currentUserName = useMemo(() => {
    if (!user) return "Abhiram P Mohan";
    const full = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return full || user.email || "Abhiram P Mohan";
  }, [user]);

  const currentUserId = useMemo(() => {
    return user?.id ? String(user.id) : "user-current";
  }, [user]);

  const currentUserRole = useMemo(() => {
    return user?.designation || user?.role || "Lead QA Analyst";
  }, [user]);

  const currentUserInitials = useMemo(() => {
    if (user?.first_name || user?.last_name) {
      return `${(user.first_name?.[0] || "A")}${(user.last_name?.[0] || "P")}`.toUpperCase();
    }
    return "AP";
  }, [user]);

  // Load and sync Leaderboard from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedHs = localStorage.getItem("iss_offline_game_highscore");
    const initialHs = savedHs ? parseInt(savedHs, 10) || 0 : 0;
    setHighScore(initialHs);

    const storedLb = localStorage.getItem("iss_offline_game_leaderboard_v2");
    if (storedLb) {
      try {
        const parsed: LeaderboardPlayer[] = JSON.parse(storedLb);
        // Ensure current user is marked correctly with current name
        let foundUser = false;
        const normalized = parsed.map((p) => {
          if (p.isCurrentUser || p.id === currentUserId || p.name === currentUserName) {
            foundUser = true;
            return {
              ...p,
              id: currentUserId,
              name: currentUserName,
              role: currentUserRole,
              isCurrentUser: true,
              score: Math.max(p.score, initialHs),
              avatarBg: "bg-[#56348f]",
              avatarText: currentUserInitials,
            };
          }
          return { ...p, isCurrentUser: false };
        });

        if (!foundUser) {
          normalized.push({
            id: currentUserId,
            name: currentUserName,
            score: initialHs,
            role: currentUserRole,
            isCurrentUser: true,
            avatarBg: "bg-[#56348f]",
            avatarText: currentUserInitials,
          });
        }

        normalized.sort((a, b) => b.score - a.score);
        setLeaderboard(normalized);
        localStorage.setItem("iss_offline_game_leaderboard_v2", JSON.stringify(normalized));
        return;
      } catch (e) {
        console.warn("Failed parsing saved leaderboard, resetting defaults:", e);
      }
    }

    // Default seed players reflecting company colleagues
    const defaultRoster: LeaderboardPlayer[] = [
      {
        id: "colleague-1",
        name: "Aswathi M Ashok",
        score: 148,
        role: "Team Lead",
        isCurrentUser: false,
        avatarBg: "bg-pink-600",
        avatarText: "AA",
      },
      {
        id: "colleague-2",
        name: "Amal Tomy",
        score: 112,
        role: "System Administrator",
        isCurrentUser: false,
        avatarBg: "bg-blue-600",
        avatarText: "AT",
      },
      {
        id: "colleague-3",
        name: "Ashmi Mathew",
        score: 76,
        role: "Social Media Lead",
        isCurrentUser: false,
        avatarBg: "bg-amber-600",
        avatarText: "AM",
      },
      {
        id: currentUserId,
        name: currentUserName,
        score: initialHs > 0 ? initialHs : 23,
        role: currentUserRole,
        isCurrentUser: true,
        avatarBg: "bg-[#56348f]",
        avatarText: currentUserInitials,
      },
    ];

    defaultRoster.sort((a, b) => b.score - a.score);
    setLeaderboard(defaultRoster);
    localStorage.setItem("iss_offline_game_leaderboard_v2", JSON.stringify(defaultRoster));
  }, [currentUserId, currentUserName, currentUserRole, currentUserInitials]);

  // Update leaderboard with new score
  const recordScore = useCallback((finalScore: number) => {
    if (finalScore <= 0) return;

    setLeaderboard((prev) => {
      const updated = prev.map((p) => {
        if (p.isCurrentUser || p.id === currentUserId) {
          return {
            ...p,
            name: currentUserName,
            role: currentUserRole,
            score: Math.max(p.score, finalScore),
            isCurrentUser: true,
          };
        }
        return p;
      });

      updated.sort((a, b) => b.score - a.score);
      if (typeof window !== "undefined") {
        localStorage.setItem("iss_offline_game_leaderboard_v2", JSON.stringify(updated));
      }
      return updated;
    });
  }, [currentUserId, currentUserName, currentUserRole]);

  // Rank computation for current logged-in user
  const currentUserRankIndex = leaderboard.findIndex((p) => p.isCurrentUser);
  const currentUserEntry = currentUserRankIndex >= 0 ? leaderboard[currentUserRankIndex] : null;
  const currentRank = currentUserRankIndex >= 0 ? currentUserRankIndex + 1 : leaderboard.length;
  const higherScorers = currentUserRankIndex > 0 ? leaderboard.slice(0, currentUserRankIndex) : [];
  const nextTargetPlayer = higherScorers.length > 0 ? higherScorers[higherScorers.length - 1] : null;

  // Listen to online events to auto-retry
  useEffect(() => {
    const handleOnline = () => {
      if (onRetry) {
        setRetrying(true);
        onRetry();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onRetry]);

  const handleRetry = () => {
    setRetrying(true);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
    setTimeout(() => setRetrying(false), 3000);
  };

  // Game Engine State
  const gameRef = useRef({
    state: "idle" as "idle" | "playing" | "gameover",
    runnerY: 0,
    runnerVY: 0,
    isJumping: false,
    groundY: 125,
    runnerWidth: 24,
    runnerHeight: 30,
    obstacles: [] as Array<{ x: number; width: number; height: number; type: number }>,
    clouds: [] as Array<{ x: number; y: number; speed: number; width: number }>,
    groundOffset: 0,
    speed: 4.5,
    frameCount: 0,
    score: 0,
    highScore: 0,
    legPhase: 0,
  });

  // Keep highscore ref synced
  useEffect(() => {
    gameRef.current.highScore = highScore;
  }, [highScore]);

  // Jump action (Fixed physics: positive upward velocity and downward gravity)
  const triggerJump = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "idle" || g.state === "gameover") {
      // Start / Restart game
      g.state = "playing";
      g.runnerY = 0;
      g.runnerVY = 10.5; // Initial upward jump hop
      g.isJumping = true;
      g.obstacles = [];
      g.speed = 4.5;
      g.frameCount = 0;
      g.score = 0;
      setScore(0);
      setGameState("playing");
      return;
    }

    if (g.state === "playing" && !g.isJumping) {
      // UPWARD JUMP: Positive velocity increases runnerY above ground
      g.runnerVY = 10.5;
      g.isJumping = true;
    }
  }, []);

  // Keyboard handler: Space or ArrowUp to jump
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (e.repeat) return;
        triggerJump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerJump]);

  // Initialize and run Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI Canvas scaling
    const dpr = window.devicePixelRatio || 1;
    const width = 560;
    const height = 150;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const g = gameRef.current;
    g.groundY = height - 25;

    // Initialize clouds
    g.clouds = [
      { x: 100, y: 25, speed: 0.8, width: 45 },
      { x: 320, y: 40, speed: 0.5, width: 55 },
      { x: 480, y: 20, speed: 0.9, width: 40 },
    ];

    let animationId: number;

    const loop = () => {
      const isDark = document.documentElement.classList.contains("dark");

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Background fill
      ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Clouds
      ctx.fillStyle = isDark ? "#1e293b" : "#e2e8f0";
      g.clouds.forEach((cloud) => {
        if (g.state === "playing") {
          cloud.x -= cloud.speed;
          if (cloud.x < -cloud.width) cloud.x = width + Math.random() * 50;
        }
        ctx.beginPath();
        ctx.arc(cloud.x + 12, cloud.y + 8, 10, 0, Math.PI * 2);
        ctx.arc(cloud.x + 24, cloud.y + 4, 12, 0, Math.PI * 2);
        ctx.arc(cloud.x + 36, cloud.y + 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cloud.x + 10, cloud.y + 8, 30, 10);
      });

      // 2. Draw Ground
      const groundColor = isDark ? "#334155" : "#cbd5e1";
      const groundDotColor = isDark ? "#475569" : "#94a3b8";

      ctx.strokeStyle = groundColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, g.groundY);
      ctx.lineTo(width, g.groundY);
      ctx.stroke();

      // Ground bumps/dots
      if (g.state === "playing") {
        g.groundOffset = (g.groundOffset + g.speed) % 24;
      }
      ctx.fillStyle = groundDotColor;
      for (let x = -g.groundOffset; x < width; x += 24) {
        ctx.fillRect(x + 4, g.groundY + 4, 6, 2);
        ctx.fillRect(x + 16, g.groundY + 8, 3, 2);
      }

      // 3. Update & Draw Obstacles
      if (g.state === "playing") {
        g.frameCount++;

        // Increase score
        if (g.frameCount % 5 === 0) {
          g.score++;
          setScore(g.score);

          // Update High Score
          if (g.score > g.highScore) {
            g.highScore = g.score;
            setHighScore(g.score);
            if (typeof window !== "undefined") {
              localStorage.setItem("iss_offline_game_highscore", g.score.toString());
            }
          }

          // Gradual speed up
          if (g.score % 100 === 0 && g.speed < 8.5) {
            g.speed += 0.3;
          }
        }

        // Spawn obstacles with fair clearance spacing
        const minGap = 175 + Math.random() * 110;
        const lastObstacle = g.obstacles[g.obstacles.length - 1];
        if (!lastObstacle || width - lastObstacle.x > minGap) {
          const type = Math.random() > 0.5 ? 1 : 2;
          const obsWidth = type === 1 ? 16 : 24;
          const obsHeight = type === 1 ? 26 : 20;
          g.obstacles.push({
            x: width + 20,
            width: obsWidth,
            height: obsHeight,
            type,
          });
        }

        // Move obstacles & collision check
        // Hitbox coordinates
        const runnerLeft = 45;
        const runnerRight = runnerLeft + g.runnerWidth - 4;
        const runnerBottom = g.groundY - g.runnerY;
        const runnerTop = runnerBottom - g.runnerHeight + 4;

        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          obs.x -= g.speed;

          // Obstacle Hitbox
          const obsLeft = obs.x + 2;
          const obsRight = obs.x + obs.width - 2;
          const obsTop = g.groundY - obs.height + 2;
          const obsBottom = g.groundY;

          // AABB Hitbox detection
          if (
            runnerRight > obsLeft &&
            runnerLeft < obsRight &&
            runnerBottom > obsTop &&
            runnerTop < obsBottom
          ) {
            // Collision detected: Game Over
            g.state = "gameover";
            setGameState("gameover");
            recordScore(g.score);
          }

          // Remove off-screen obstacles
          if (obs.x < -40) {
            g.obstacles.splice(i, 1);
          }
        }
      }

      // Draw Obstacles (Clean corporate red barriers)
      ctx.fillStyle = isDark ? "#f43f5e" : "#e11d48";
      g.obstacles.forEach((obs) => {
        const obsY = g.groundY - obs.height;
        if (obs.type === 1) {
          // Tall Cactus / Barrier
          ctx.fillRect(obs.x + 5, obsY, 6, obs.height);
          ctx.fillRect(obs.x, obsY + 6, 5, 8);
          ctx.fillRect(obs.x + 11, obsY + 4, 5, 10);
        } else {
          // Double Barrier
          ctx.fillRect(obs.x + 2, obsY + 4, 9, obs.height - 4);
          ctx.fillRect(obs.x + 14, obsY, 10, obs.height);
        }
      });

      // 4. Update & Draw Runner (Upward Jump Physics with Gravity)
      if (g.state === "playing") {
        if (g.isJumping) {
          g.runnerY += g.runnerVY;
          g.runnerVY -= 0.62; // Gravity pulls runner back towards ground (runnerY -> 0)
          if (g.runnerY <= 0) {
            g.runnerY = 0;
            g.runnerVY = 0;
            g.isJumping = false;
          }
        } else {
          // Alternating running legs on ground
          if (g.frameCount % 6 === 0) {
            g.legPhase = g.legPhase === 0 ? 1 : 0;
          }
        }
      }

      const rx = 45;
      const ry = g.groundY - g.runnerHeight - g.runnerY;

      ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";

      // Head & Body (Inter Smart Runner Dino)
      ctx.fillRect(rx + 8, ry + 2, 14, 10); // Head
      ctx.fillRect(rx + 16, ry + 12, 6, 4); // Snout
      ctx.fillRect(rx + 6, ry + 10, 12, 14); // Torso
      ctx.fillRect(rx + 2, ry + 16, 6, 6); // Tail

      // Eye
      ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
      if (g.state === "gameover") {
        ctx.fillRect(rx + 15, ry + 5, 3, 3);
      } else {
        ctx.fillRect(rx + 16, ry + 4, 3, 3);
      }

      // Inter Smart Purple Tie
      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(rx + 12, ry + 13, 3, 6);

      // Legs
      ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";
      if (g.isJumping) {
        // Jump legs tucked
        ctx.fillRect(rx + 6, ry + 24, 4, 3);
        ctx.fillRect(rx + 12, ry + 24, 4, 3);
      } else if (g.legPhase === 0) {
        ctx.fillRect(rx + 8, ry + 24, 3, 6);
        ctx.fillRect(rx + 14, ry + 22, 3, 4);
      } else {
        ctx.fillRect(rx + 8, ry + 22, 3, 4);
        ctx.fillRect(rx + 14, ry + 24, 3, 6);
      }

      // 5. Draw Game Overlay UI
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.textAlign = "right";
      const formatNum = (n: number) => n.toString().padStart(5, "0");

      ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
      ctx.fillText(`HI ${formatNum(g.highScore)}  ${formatNum(g.score)}`, width - 15, 22);

      // Idle State Overlay
      if (g.state === "idle") {
        ctx.fillStyle = isDark ? "#e2e8f0" : "#1e293b";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SPACE, UP ARROW or TAP to Jump & Run", width / 2, height / 2 - 10);
      }

      // Game Over Overlay
      if (g.state === "gameover") {
        ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("G A M E   O V E R", width / 2, height / 2 - 15);

        ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
        ctx.font = "11px sans-serif";
        ctx.fillText("Press SPACE or Tap to Play Again", width / 2, height / 2 + 10);
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationId);
  }, [recordScore]);

  return (
    <div className="flex justify-center items-center min-h-[75vh] p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center relative overflow-hidden transition-all">
        {/* Network Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200/80 dark:border-rose-500/30 mb-3 shadow-2xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Server Connection Interrupted</span>
        </div>

        {/* Header Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Unable to Reach Workplace Server
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1.5">
          {errorMessage || "We couldn't connect to the employee portal. While your network re-establishes, enjoy the offline runner game!"}
        </p>

        {/* Embedded Chrome-style Offline Runner Game Canvas */}
        <div className="mt-6 mb-4 relative group">
          <div
            onClick={triggerJump}
            onTouchStart={(e) => {
              e.preventDefault();
              triggerJump();
            }}
            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-2xl overflow-hidden cursor-pointer shadow-inner relative transition-colors"
          >
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: "140px", display: "block" }}
            />

            {/* Quick Game Hint Pill */}
            <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Tap, Space, or ↑ to Jump</span>
            </div>

            {/* Live Score Pill */}
            <div className="absolute top-2 left-3 pointer-events-none flex items-center gap-2 text-xs font-bold font-mono">
              <span className="text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800">
                Score: {score}
              </span>
              {highScore > 0 && (
                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> {highScore}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 mb-5">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#56348f] hover:bg-[#472a77] text-white text-sm font-bold rounded-xl shadow-md shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
            <span>{retrying ? "Connecting..." : "Try Reconnecting"}</span>
          </button>

          <button
            onClick={triggerJump}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <ArrowUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{gameState === "playing" ? "Jump!" : "Start Game"}</span>
          </button>
        </div>

        {/* ── LEADERBOARD SECTION (SHOWING WHO SCORED MORE ACCORDING TO LOGGED-IN USER) ── */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Workplace High Scores
              </h3>
            </div>

            {/* Current user rank pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-[#56348f] dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Award className="w-3 h-3" />
              <span>Your Rank: #{currentRank}</span>
            </div>
          </div>

          {/* Leaderboard status comparison banner */}
          <div className="p-2.5 rounded-xl mb-3 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5">
            {currentRank === 1 ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Outstanding!</strong> You hold the #1 High Score on the team ({currentUserEntry?.score || highScore} pts)!
                </span>
              </div>
            ) : nextTargetPlayer ? (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                <span>
                  <strong>{nextTargetPlayer.name}</strong> scored {nextTargetPlayer.score - (currentUserEntry?.score || 0)} more pts than you ({nextTargetPlayer.score} pts). Score {nextTargetPlayer.score - (currentUserEntry?.score || 0) + 1} more to take Rank #{currentRank - 1}!
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Play to set your first score on the workplace leaderboard!</span>
              </div>
            )}
          </div>

          {/* Ranked Players List */}
          <div className="space-y-1.5">
            {leaderboard.map((player, idx) => {
              const rank = idx + 1;
              const isUser = player.isCurrentUser;
              const medal =
                rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    isUser
                      ? "bg-purple-50 dark:bg-purple-950/40 border-2 border-[#56348f]/60 shadow-xs"
                      : "bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                      {medal}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full ${player.avatarBg || "bg-[#56348f]"} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                    >
                      {player.avatarText || "IS"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isUser
                              ? "text-[#56348f] dark:text-purple-300 font-bold"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {player.name}
                        </span>
                        {isUser && (
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-[#56348f] text-white rounded-md tracking-wider">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-400 truncate">
                        {player.role || "Team Member"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {player.score} pts
                    </span>
                    {isUser && higherScorers.length > 0 && (
                      <p className="text-[10px] text-rose-500 dark:text-rose-400">
                        -{leaderboard[0].score - player.score} from #1
                      </p>
                    )}
                    {rank === 1 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        🏆 Leader
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-reconnect note */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Will automatically reconnect when your internet is back online</span>
        </p>
      </div>
    </div>
  );
}

export default NetworkErrorWithGame;
