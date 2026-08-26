import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(() => ({
  isDark: false,
  toggleTheme: () => {},
}));
