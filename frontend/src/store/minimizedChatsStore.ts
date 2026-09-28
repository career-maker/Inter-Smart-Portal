import { create } from "zustand";

interface MinimizedChat {
  conversationId: number;
  userId: number;
  name: string;
  avatar?: string;
  isOpen: boolean;
}

interface MinimizedChatsState {
  chats: MinimizedChat[];
  minimizeChat: (conversationId: number, userId: number, name: string, avatar?: string) => void;
  openSideChat: (conversationId: number) => void;
  closeSideChat: (conversationId: number) => void;
  removeMinimizedChat: (conversationId: number) => void;
}

export const useMinimizedChatsStore = create<MinimizedChatsState>((set) => ({
  chats: [],
  minimizeChat: (conversationId, userId, name, avatar) => set((state) => {
    const existing = state.chats.find(c => c.conversationId === conversationId);
    if (existing) {
      return {
        chats: state.chats.map(c => c.conversationId === conversationId ? { ...c, isOpen: true } : c)
      };
    }
    // Limit to max 3 chats in the bottom bar
    const newChats = [...state.chats, { conversationId, userId, name, avatar, isOpen: false }];
    if (newChats.length > 3) newChats.shift();
    return { chats: newChats };
  }),
  openSideChat: (conversationId) => set((state) => ({
    chats: state.chats.map(c => c.conversationId === conversationId ? { ...c, isOpen: true } : c)
  })),
  closeSideChat: (conversationId) => set((state) => ({
    chats: state.chats.map(c => c.conversationId === conversationId ? { ...c, isOpen: false } : c)
  })),
  removeMinimizedChat: (conversationId) => set((state) => ({
    chats: state.chats.filter(c => c.conversationId !== conversationId)
  }))
}));
