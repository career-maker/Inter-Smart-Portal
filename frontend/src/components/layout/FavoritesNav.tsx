"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, X } from "lucide-react";
import { useFavoritesStore, type Favorite } from "@/store/favorites";

interface FavoritesNavProps {
  onClose?: () => void;
}

export function FavoritesNav({ onClose }: FavoritesNavProps) {
  const pathname = usePathname();
  const { fetchFavorites, removeFavorite, getFavorites } = useFavoritesStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    setIsHydrated(true);
    // Fetch favorites from server on mount
    fetchFavorites().then(() => {
      setFavorites(getFavorites());
    });
  }, [fetchFavorites, getFavorites]);

  const handleRemove = async (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeFavorite(href);
      setFavorites(getFavorites());
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  if (!isHydrated || favorites.length === 0) return null;

  return (
    <div className="px-2 py-3 border-b border-slate-200 dark:border-white/10">
      <div className="flex items-center gap-2 px-2 pb-2">
        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Favorites
        </span>
      </div>
      <div className="space-y-1">
        {favorites.map((favorite) => {
          const active = pathname === favorite.page_href;
          return (
            <Link
              key={favorite.page_href}
              href={favorite.page_href}
              onClick={onClose}
              className={`group flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg transition-colors mx-0.5 ${
                active
                  ? "bg-amber-500/20 text-amber-400 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <span className="truncate">{favorite.page_label}</span>
              <button
                onClick={(e) => handleRemove(favorite.page_href, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
