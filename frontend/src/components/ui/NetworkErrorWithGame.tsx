"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WifiOff, RefreshCw, Trophy, Gamepad2, ArrowUp, Sparkles } from "lucide-react";

interface NetworkErrorWithGameProps {
  onRetry?: () => void;
  errorMessage?: string;
}

export function NetworkErrorWithGame({ onRetry, errorMessage }: NetworkErrorWithGameProps) {
  const [retrying, setRetrying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load high score from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("iss_offline_game_highscore");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    }
  }, []);

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

  // Jump action
  const triggerJump = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "idle" || g.state === "gameover") {
      // Start / Restart game
      g.state = "playing";
      g.runnerY = 0;
      g.runnerVY = 0;
      g.isJumping = false;
      g.obstacles = [];
      g.speed = 4.5;
      g.frameCount = 0;
      g.score = 0;
      setScore(0);
      setGameState("playing");
      return;
    }

    if (g.state === "playing" && !g.isJumping) {
      g.runnerVY = -11.5;
      g.isJumping = true;
    }
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        // Prevent window scrolling when playing
        e.preventDefault();
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
        // Simple pixel-art fluffy cloud
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
          if (g.score % 100 === 0 && g.speed < 9) {
            g.speed += 0.3;
          }
        }

        // Spawn obstacles
        const minGap = 160 + Math.random() * 120;
        const lastObstacle = g.obstacles[g.obstacles.length - 1];
        if (!lastObstacle || width - lastObstacle.x > minGap) {
          const type = Math.random() > 0.5 ? 1 : 2;
          const obsWidth = type === 1 ? 16 : 26;
          const obsHeight = type === 1 ? 28 : 22;
          g.obstacles.push({
            x: width + 20,
            width: obsWidth,
            height: obsHeight,
            type,
          });
        }

        // Move obstacles & collision check
        const runnerLeft = 45;
        const runnerRight = runnerLeft + g.runnerWidth - 4;
        const runnerBottom = g.groundY - g.runnerY;
        const runnerTop = runnerBottom - g.runnerHeight + 4;

        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          obs.x -= g.speed;

          // Collision Box
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
            // Collision!
            g.state = "gameover";
            setGameState("gameover");
          }

          // Remove off-screen obstacles
          if (obs.x < -40) {
            g.obstacles.splice(i, 1);
          }
        }
      }

      // Draw Obstacles (Clean pixel-styled obstacles)
      ctx.fillStyle = isDark ? "#f43f5e" : "#e11d48";
      g.obstacles.forEach((obs) => {
        const obsY = g.groundY - obs.height;
        if (obs.type === 1) {
          // Tall Cactus / Barrier
          ctx.fillRect(obs.x + 5, obsY, 6, obs.height);
          ctx.fillRect(obs.x, obsY + 6, 5, 8);
          ctx.fillRect(obs.x + 11, obsY + 4, 5, 10);
        } else {
          // Double Obstacle / Coffee Cup & Briefcase
          ctx.fillRect(obs.x + 2, obsY + 4, 9, obs.height - 4);
          ctx.fillRect(obs.x + 14, obsY, 10, obs.height);
        }
      });

      // 4. Update & Draw Runner (Cute Corporate Dino Runner)
      if (g.state === "playing") {
        if (g.isJumping) {
          g.runnerY += g.runnerVY;
          g.runnerVY += 0.65; // Gravity
          if (g.runnerY <= 0) {
            g.runnerY = 0;
            g.runnerVY = 0;
            g.isJumping = false;
          }
        } else {
          // Alternating running legs
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
        // X X dead eyes
        ctx.fillRect(rx + 15, ry + 5, 3, 3);
      } else {
        ctx.fillRect(rx + 16, ry + 4, 3, 3);
      }

      // Tie / Badge accent
      ctx.fillStyle = "#8b5cf6"; // Purple tie
      ctx.fillRect(rx + 12, ry + 13, 3, 6);

      // Legs
      ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";
      if (g.isJumping) {
        // Tucked jump legs
        ctx.fillRect(rx + 6, ry + 24, 4, 3);
        ctx.fillRect(rx + 12, ry + 24, 4, 3);
      } else if (g.legPhase === 0) {
        // Leg 1 down, Leg 2 back
        ctx.fillRect(rx + 8, ry + 24, 3, 6);
        ctx.fillRect(rx + 14, ry + 22, 3, 4);
      } else {
        // Leg 1 back, Leg 2 down
        ctx.fillRect(rx + 8, ry + 22, 3, 4);
        ctx.fillRect(rx + 14, ry + 24, 3, 6);
      }

      // 5. Draw Game Overlay UI
      // Scores
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
        ctx.fillText("SPACE or TAP to Jump & Start", width / 2, height / 2 - 10);
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
  }, []);

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
        <div className="mt-6 mb-5 relative group">
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
              <span>Tap or Space to Jump</span>
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#56348f] hover:bg-[#472a77] text-white text-sm font-bold rounded-xl shadow-md shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
            <span>{retrying ? "Connecting..." : "Try Reconnecting"}</span>
          </button>

          <button
            onClick={triggerJump}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ArrowUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{gameState === "playing" ? "Jump!" : "Start Game"}</span>
          </button>
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
