"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useFavoritesStore, type Favorite } from "@/store/favorites";

// Helper to derive a clean human-readable title for the current route
function getPageLabelFromPath(pathname: string): string {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean || clean === "dashboard") return "Dashboard";

  const segments = clean.split("/");
  const last = segments[segments.length - 1];

  // Common mapping
  const map: Record<string, string> = {
    employees: "Employee Directory",
    tasks: "Task Directory",
    projects: "Projects",
    leaves: "Leave Management",
    "leave-balances": "Leave Balances",
    approvals: "Leave Approvals",
    attendance: "Attendance",
    "regularization-requests": "Attendance Requests",
    community: "Community & Feed",
    recognitions: "Recognitions & Stars",
    "bug-reports": "QA Bug Reports",
    addons: "Project Add-ons",
    org: "Organization Tree",
    profile: "My Profile",
    finances: "Finances & Salary",
    services: "Services",
  };

  if (map[last]) return map[last];
  if (map[clean]) return map[clean];

  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function BookmarksDropdown() {
  const pathname = usePathname();
  const { fetchFavorites, addFavorite, removeFavorite, getFavorites, isFavorited } = useFavoritesStore();
  const [isOpen, setIsOpen] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [addingCurrent, setAddingCurrent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
    fetchFavorites().then(() => {
      setFavorites(getFavorites());
    });
  }, [fetchFavorites, getFavorites]);

  // Sync favorites on store changes
  const storeFavorites = useFavoritesStore((state) => state.favorites);
  useEffect(() => {
    setFavorites(getFavorites());
  }, [storeFavorites, getFavorites]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentPageFavorited = isFavorited(pathname);

  const handleToggleCurrentPage = async () => {
    setAddingCurrent(true);
    try {
      if (currentPageFavorited) {
        await removeFavorite(pathname);
      } else {
        const label = getPageLabelFromPath(pathname);
        await addFavorite(pathname, label);
      }
      setFavorites(getFavorites());
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    } finally {
      setAddingCurrent(false);
    }
  };

  const handleRemoveFavorite = async (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeFavorite(href);
      setFavorites(getFavorites());
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    }
  };

  if (!isHydrated) return null;

  return (
    <div ref={dropdownRef} className="relative" style={{ fontFamily: '"Proxima Nova", sans-serif' }}>
      {/* ── Bookmark Header Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Bookmarks"
        title="Quick Bookmarks & Favorites"
        className={`p-2 text-white hover:text-white rounded-full hover:bg-white/15 transition-all relative cursor-pointer ${
          isOpen ? "bg-white/20" : ""
        }`}
      >
        {favorites.length > 0 ? (
          <Bookmark className="w-5 h-5 text-white fill-white/30" />
        ) : (
          <Bookmark className="w-5 h-5 text-white" />
        )}
        {favorites.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#56348f]" />
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150 ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#56348f]/10 text-[#56348f] dark:bg-[#56348f]/30 dark:text-purple-300">
                <Bookmark className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Bookmarks & Favorites
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Quick access to frequent portals
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#56348f] dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {favorites.length} saved
            </span>
          </div>

          {/* Quick Bookmark Current Page Button */}
          <div className="p-2.5 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100/80 dark:border-purple-900/40">
            <button
              type="button"
              onClick={handleToggleCurrentPage}
              disabled={addingCurrent}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                currentPageFavorited
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                  : "bg-[#56348f] hover:bg-[#462875] text-white shadow-xs"
              }`}
            >
              <div className="flex items-center gap-2">
                {currentPageFavorited ? (
                  <BookmarkCheck className="w-4 h-4 text-white fill-white/20" />
                ) : (
                  <Plus className="w-4 h-4 text-white" />
                )}
                <span className="truncate">
                  {currentPageFavorited ? "Bookmarked Current Page" : "Bookmark Current Page"}
                </span>
              </div>
              <span className="text-[10px] opacity-80 pl-1 shrink-0">
                {currentPageFavorited ? "Click to remove" : "+ Save"}
              </span>
            </button>
          </div>

          {/* Favorites List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {favorites.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1.5">
                <Bookmark className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 opacity-80" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No bookmarks yet</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto leading-normal">
                  Click the button above to bookmark your current page for instant access.
                </p>
              </div>
            ) : (
              favorites.map((fav) => {
                const isCurrent = pathname === fav.page_href;
                return (
                  <div
                    key={fav.page_href}
                    className={`group px-3 py-2.5 rounded-xl flex items-center justify-between gap-2.5 text-xs transition-colors ${
                      isCurrent
                        ? "bg-purple-50 dark:bg-purple-950/50 text-[#56348f] dark:text-purple-300 font-semibold border border-purple-200/80 dark:border-purple-800/60"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <Link
                      href={fav.page_href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 truncate flex-1 cursor-pointer"
                    >
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isCurrent
                            ? "bg-[#56348f] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate text-left">
                        <span className="truncate block">{fav.page_label}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                          {fav.page_href}
                        </span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFavorite(fav.page_href, e)}
                        title="Remove bookmark"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
