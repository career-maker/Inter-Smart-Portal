"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "./layout/ThemeProvider";
import { Toaster } from "@/components/ui/toast";
import { TopAwardeeProvider } from "@/context/TopAwardeeContext";
import { CustomizationProvider } from "@/context/CustomizationContext";
import { PageTitleManager } from "@/components/layout/PageTitleManager";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes — avoids refetching static-ish data on every mount
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <CustomizationProvider>
        <QueryClientProvider client={queryClient}>
          <TopAwardeeProvider>
            <PageTitleManager />
            {children}
            <Toaster />
          </TopAwardeeProvider>
        </QueryClientProvider>
      </CustomizationProvider>
    </ThemeProvider>
  );
}
