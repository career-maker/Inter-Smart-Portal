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
        {/* Physical Golden Halo Ring */}
        <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 ring-1 ring-amber-300/80 z-10">
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
  style?: React.CSSProperties;
  showCrownIcon?: boolean;
}

export function RoyalName({
  name,
  userId,
  employeeCode,
  isTopAwardee: forcedIsTopAwardee,
  className = "",
  style,
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

  const resolvedStyle = { ...style };
  // Only force white color when text-white is an explicit standalone class token,
  // NOT when it appears as a suffix of "dark:text-white" etc.
  const hasExplicitWhite = /(?:^|\s)!?text-white(?:\s|$)/.test(className);
  if (hasExplicitWhite && !resolvedStyle.color) {
    resolvedStyle.color = "#ffffff";
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)} style={resolvedStyle}>
      <span style={{ color: resolvedStyle.color || "inherit" }}>{name}</span>
    </span>
  );
}

export default RoyalAvatar;
