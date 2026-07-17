import { create } from 'zustand';
import api from '@/services/api';

export interface Favorite {
  page_href: string;
  page_label: string;
  created_at: string;
}

interface FavoritesState {
  favorites: Favorite[];
  isLoading: boolean;
  addFavorite: (href: string, label: string) => Promise<void>;
  removeFavorite: (href: string) => Promise<void>;
  isFavorited: (href: string) => boolean;
  getFavorites: () => Favorite[];
  fetchFavorites: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  isLoading: false,

  fetchFavorites: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/favorites');
      set({ favorites: res.data.data || [] });
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addFavorite: async (href, label) => {
    try {
      const response = await api.post('/favorites', {
        page_href: href,
        page_label: label,
      });

      if (response.data?.success) {
        // Optimistically update local state
        set((state) => ({
          favorites: [...state.favorites, { page_href: href, page_label: label, created_at: new Date().toISOString() }],
        }));
      } else {
        throw new Error(response.data?.message || 'Failed to add favorite');
      }
    } catch (error) {
      console.error('Failed to add favorite:', error);
      throw error;
    }
  },

  removeFavorite: async (href) => {
    try {
      // Use path encoding that preserves slashes for routes like /leaves, /employees
      const encodedHref = href.split('/').map(encodeURIComponent).join('/');
      const response = await api.delete(`/favorites/${encodedHref}`);

      if (response.data?.success) {
        // Optimistically update local state
        set((state) => ({
          favorites: state.favorites.filter((fav) => fav.page_href !== href),
        }));
      } else {
        throw new Error(response.data?.message || 'Failed to remove favorite');
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      throw error;
    }
  },

  isFavorited: (href) => {
    return get().favorites.some((fav) => fav.page_href === href);
  },

  getFavorites: () => {
    return get().favorites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
}));
