"use client";

import React from "react";
import { Crown } from "lucide-react";
import { useTopAwardee } from "@/context/TopAwardeeContext";
import { cn } from "@/lib/utils";

interface RoyalAvatarProps {
  src?: string | null;
  name: string;
  userId?: number | null;
  employeeCode?: string | null;
  isTopAwardee?: boolean;
  className?: string;
  textClass?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCrownBadge?: boolean;
}

function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://workplace.intersmart.in";
  const origin = baseUrl.replace(/\/api\/?$/, "");
  if (url.startsWith("/storage/")) return `${origin}${url}`;
  if (url.startsWith("storage/")) return `${origin}/${url}`;
  if (url.startsWith("/")) return `${origin}${url}`;
  return `${origin}/api/photos/${url}`;
}

export function RoyalAvatar({
  src,
  name,
  userId,
  employeeCode,
  isTopAwardee: forcedIsTopAwardee,
  className = "",
  textClass = "",
  showCrownBadge = true,
}: RoyalAvatarProps) {
  const { isTopAwardee: checkTopAwardee } = useTopAwardee();

  const isEligible =
    forcedIsTopAwardee !== undefined
      ? forcedIsTopAwardee
      : Boolean(
          (userId && checkTopAwardee(userId)) ||
          (employeeCode && checkTopAwardee(employeeCode)) ||
          (name && checkTopAwardee(name))
        );

  const resolvedSrc = resolveAvatarUrl(src);
  const initials = (name || "Employee")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (isEligible) {
    return (
      <div className="relative inline-flex items-center justify-center shrink-0">
        {/* Luminous Golden Aura */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 blur-[5px] opacity-75 animate-pulse pointer-events-none" />

        {/* Physical Golden Halo Ring */}
        <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 shadow-[0_0_14px_rgba(245,158,11,0.85)] ring-1 ring-amber-300/80 z-10">
          <div
            className={cn(
              "relative overflow-hidden rounded-full flex items-center justify-center font-bold bg-gradient-to-tr from-[#2563eb] to-[#4f46e5] text-white shrink-0 select-none border border-slate-950/20",
              className
            )}
          >
            <span style={{ color: "#ffffff" }} className={cn("text-white font-bold tracking-wider", textClass)}>
              {initials}
            </span>
            {resolvedSrc && (
              <img
                src={resolvedSrc}
                alt={name}
                className="absolute inset-0 w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        </div>

        {/* Royal Crown Badge Overlay */}
        {showCrownBadge && (
          <div
            title="Most Awarded Employee (Honorary Gold Badge)"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md shadow-amber-500/60 ring-2 ring-white dark:ring-slate-900 text-slate-950 z-20"
          >
            <Crown className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full flex items-center justify-center font-bold bg-gradient-to-tr from-[#2563eb] to-[#4f46e5] text-white shrink-0 select-none border border-white/10",
        className
      )}
    >
      <span style={{ color: "#ffffff" }} className={cn("text-white font-bold tracking-wider", textClass)}>
        {initials}
      </span>
      {resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}

interface RoyalNameProps {
  name: string;
  userId?: number | null;
  employeeCode?: string | null;
  isTopAwardee?: boolean;
  className?: string;
  showCrownIcon?: boolean;
}

export function RoyalName({
  name,
  userId,
  employeeCode,
  isTopAwardee: forcedIsTopAwardee,
  className = "",
  showCrownIcon = true,
}: RoyalNameProps) {
  const { isTopAwardee: checkTopAwardee } = useTopAwardee();

  const isEligible =
    forcedIsTopAwardee !== undefined
      ? forcedIsTopAwardee
      : Boolean(
          (userId && checkTopAwardee(userId)) ||
          (employeeCode && checkTopAwardee(employeeCode)) ||
          (name && checkTopAwardee(name))
        );

  if (isEligible) {
    // Strip any conflicting neutral text colors (e.g. text-white, text-slate-*, text-gray-*)
    const safeClasses = className
      .replace(/\btext-(white|slate|gray|zinc|neutral|stone|black)(-[^\s]+)?\b/gi, "")
      .trim();

    return (
      <span
        title="Most Awarded Employee (Honorary Royal Gold)"
        className={cn(
          "inline-flex items-center gap-1.5 font-black text-amber-500 dark:text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] tracking-wide",
          safeClasses
        )}
        style={{ color: "#d97706" }}
      >
        <span
          className="font-black text-amber-500 dark:text-amber-300 tracking-wide"
          style={{ color: "#d97706", textShadow: "0 0 12px rgba(251,191,36,0.45)" }}
        >
          {name}
        </span>
        {showCrownIcon && (
          <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-amber-300 dark:text-amber-300 shrink-0 inline animate-bounce" />
        )}
      </span>
    );
  }

  return <span className={className}>{name}</span>;
}

export default RoyalAvatar;
