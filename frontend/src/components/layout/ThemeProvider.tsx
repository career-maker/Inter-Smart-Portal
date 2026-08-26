"use client";

import { useEffect, ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Purge any dark theme cached in local storage
    try {
      localStorage.removeItem("theme-storage");
      localStorage.removeItem("theme");
    } catch (e) {}

    const root = document.documentElement;
    root.style.colorScheme = "light";
    root.classList.remove("dark");
    root.classList.add("light");
  }, []);

  return (
    <>
      <style>{`
        :root {
          --bg-primary: #F8FAFC;
          --bg-secondary: #F1F5F9;
          --text-primary: rgb(15, 24, 36);
          --text-secondary: rgb(94, 105, 120);
          --border-color: rgba(226, 232, 240, 0.9);
          --card-bg: #FFFFFF;
          --card-border: rgba(226, 232, 240, 0.9);
          --accent: #56348f;
        }

        html, body {
          background-color: #F8FAFC !important;
          color: rgb(15, 24, 36) !important;
          color-scheme: light !important;
        }
      `}</style>
      {children}
    </>
  );
}
