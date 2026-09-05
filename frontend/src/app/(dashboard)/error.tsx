"use client";

import { useEffect } from "react";
import { NetworkErrorWithGame } from "@/components/ui/NetworkErrorWithGame";

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary:", error);
  }, [error]);

  return (
    <NetworkErrorWithGame
      onRetry={reset}
      errorMessage={error?.message || "Connection to the portal server was interrupted."}
    />
  );
}
