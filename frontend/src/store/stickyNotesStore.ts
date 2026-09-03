import { create } from "zustand";

interface StickyNotesState {
  isOpen: boolean;
  notesCount: number;
  openStickyNotes: () => void;
  closeStickyNotes: () => void;
  toggleStickyNotes: () => void;
  setNotesCount: (count: number) => void;
}

export const useStickyNotesStore = create<StickyNotesState>((set) => ({
  isOpen: false,
  notesCount: 0,
  openStickyNotes: () => set({ isOpen: true }),
  closeStickyNotes: () => set({ isOpen: false }),
  toggleStickyNotes: () => set((state) => ({ isOpen: !state.isOpen })),
  setNotesCount: (count: number) => set({ notesCount: count }),
}));
