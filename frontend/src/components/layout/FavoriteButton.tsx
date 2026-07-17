"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useFavoritesStore } from "@/store/favorites";
import { usePathname } from "next/navigation";

interface FavoriteButtonProps {
  label?: string;
}

export function FavoriteButton({ label }: FavoriteButtonProps) {
  const pathname = usePathname() ?? "";
  const { isFavorited, addFavorite, removeFavorite } = useFavoritesStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    setIsFav(isFavorited(pathname));
  }, [pathname, isFavorited]);

  if (!isHydrated) return null;

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isFav) {
        await removeFavorite(pathname);
        setIsFav(false);
      } else {
        let pageLabel: string = label || "";
        if (!pageLabel && pathname) {
          const parts = pathname.split("/").filter(Boolean);
          const lastPart = parts.pop() || "Page";
          const formatted = lastPart.replace(/-/g, " ");
          pageLabel = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        if (!pageLabel) pageLabel = "Page";
        await addFavorite(pathname, pageLabel);
        setIsFav(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Failed to update favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
      className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${
        isFav
          ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30"
          : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
      }`}
    >
      <Star
        className={`h-5 w-5 transition-all ${isFav ? "fill-current" : ""} ${isLoading ? "animate-pulse" : ""}`}
      />
    </button>
  );
}
