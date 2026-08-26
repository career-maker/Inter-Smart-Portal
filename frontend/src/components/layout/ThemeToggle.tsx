"use client";

import { useThemeStore } from "@/store/theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/15 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 text-white hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
