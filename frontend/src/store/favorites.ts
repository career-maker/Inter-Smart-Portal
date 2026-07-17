import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Favorite {
  href: string;
  label: string;
  timestamp: number;
}

interface FavoritesState {
  favorites: Favorite[];
  addFavorite: (href: string, label: string) => void;
  removeFavorite: (href: string) => void;
  isFavorited: (href: string) => boolean;
  getFavorites: () => Favorite[];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (href, label) =>
        set((state) => {
          const exists = state.favorites.some((fav) => fav.href === href);
          if (exists) return state;
          return {
            favorites: [...state.favorites, { href, label, timestamp: Date.now() }],
          };
        }),
      removeFavorite: (href) =>
        set((state) => ({
          favorites: state.favorites.filter((fav) => fav.href !== href),
        })),
      isFavorited: (href) => {
        return get().favorites.some((fav) => fav.href === href);
      },
      getFavorites: () => {
        return get().favorites.sort((a, b) => b.timestamp - a.timestamp);
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);
