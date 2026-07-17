"use client";

import { useEffect, useState, ReactNode } from "react";
import { useThemeStore } from "@/store/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useThemeStore((state) => state.isDark);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const root = document.documentElement;
    if (isDark) {
      root.style.colorScheme = "dark";
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.style.colorScheme = "light";
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDark, isHydrated]);

  return (
    <>
      <style>{`
      :root {
        ${
          isDark
            ? `
          --bg-primary: rgb(15, 23, 42);
          --bg-secondary: rgb(30, 41, 59);
          --text-primary: rgb(255, 255, 255);
          --text-secondary: rgb(148, 163, 184);
          --border-color: rgba(255, 255, 255, 0.1);
          --card-bg: rgba(255, 255, 255, 0.05);
          --card-border: rgba(255, 255, 255, 0.1);
          --accent: rgb(251, 191, 36);
        `
            : `
          --bg-primary: #E8E8E8;
          --bg-secondary: #F5F5F5;
          --text-primary: rgb(15, 23, 42);
          --text-secondary: rgb(71, 85, 105);
          --border-color: rgba(0, 0, 0, 0.1);
          --card-bg: rgba(255, 255, 255, 0.8);
          --card-border: rgba(0, 0, 0, 0.1);
          --accent: rgb(251, 191, 36);
        `
        }
      }

      body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
        transition: background-color 0.3s ease, color 0.3s ease;
      }
    `}</style>
      {children}
    </>
  );
}
