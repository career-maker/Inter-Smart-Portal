"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";

export function CommonSpinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-[3px]",
    lg: "w-10 h-10 border-4",
  };

  return (
    <div
      className={cn(
        "rounded-full border-slate-200 dark:border-slate-800 border-t-[var(--portal-primary-color)] dark:border-t-purple-400 animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Page loader: intentionally renders nothing (page loaders and the preloader were removed
 * from the portal). Pages still return it while their data loads, so they show an empty
 * content area instead of rendering with missing data. Button/action spinners
 * (CommonSpinner and friends) are unaffected.
 */
export function PageLoader({ fullScreen = false }: { className?: string; fullScreen?: boolean }) {
  React.useEffect(() => {
    if (fullScreen) toastManager.dismissAll();
  }, [fullScreen]);
  return null;
}

/** Former first-load preloader: renders nothing, see PageLoader. */
export function DashboardPageLoader(_props: { className?: string }) {
  React.useEffect(() => {
    toastManager.dismissAll();
  }, []);
  return null;
}
