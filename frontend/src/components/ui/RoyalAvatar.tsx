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
    forcedIsTopAwardee ??
    (userId
      ? checkTopAwardee(userId)
      : employeeCode
      ? checkTopAwardee(employeeCode)
      : false);

  const initials = (name || "Employee")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-block shrink-0">
      {/* Outer Royal Golden Honor Ring */}
      {isEligible && (
        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.65)] ring-1 ring-amber-200/50 z-0 animate-pulse pointer-events-none" />
      )}

      {/* Avatar Container */}
      <div
        className={cn(
          "relative overflow-hidden flex items-center justify-center font-bold bg-slate-800 shrink-0 select-none z-10",
          isEligible ? "border-2 border-slate-950" : "border border-white/10",
          className
        )}
      >
        <span className={cn("text-slate-300", textClass)}>{initials}</span>
        {src && (
          <img
            src={src}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Royal Crown Badge Overlay */}
      {isEligible && showCrownBadge && (
        <div
          title="Most Awarded Employee (Honorary Gold Badge)"
          className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 rounded-full flex items-center justify-center text-[9px] shadow-md shadow-amber-500/50 ring-1 ring-slate-950 text-slate-950 z-20"
        >
          <Crown className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
        </div>
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
    forcedIsTopAwardee ??
    (userId
      ? checkTopAwardee(userId)
      : employeeCode
      ? checkTopAwardee(employeeCode)
      : false);

  if (isEligible) {
    return (
      <span
        title="Most Awarded Employee"
        className={cn(
          "font-bold text-amber-400 dark:text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)] inline-flex items-center gap-1.5",
          className
        )}
      >
        <span>{name}</span>
        {showCrownIcon && <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
      </span>
    );
  }

  return <span className={className}>{name}</span>;
}
