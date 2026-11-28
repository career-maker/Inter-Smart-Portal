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
    <div ref={dropdownRef} className="relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Bookmark Header Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Bookmarks"
        title="Quick Bookmarks & Favorites"
        style={{ color: "var(--portal-header-text, #ffffff)" }}
        className={`header-action-btn p-2 rounded-full hover:bg-white/15 transition-colors relative cursor-pointer ${
          isOpen ? "bg-white/15" : ""
        }`}
        aria-expanded={isOpen}
      >
        {favorites.length > 0 ? (
          <Bookmark className="w-5 h-5 portal-header-icon fill-white/30" style={{ color: "var(--portal-header-text, #ffffff)" }} />
        ) : (
          <Bookmark className="w-5 h-5 portal-header-icon" style={{ color: "var(--portal-header-text, #ffffff)" }} />
        )}
        {favorites.length > 0 && (
          <span aria-hidden="true" className="portal-badge-dot absolute top-1.5 right-1.5" />
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150 ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                Bookmarks
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Quick access to pages you use often
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              {favorites.length} saved
            </span>
          </div>

          {/* Quick Bookmark Current Page Button */}
          <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleToggleCurrentPage}
              disabled={addingCurrent}
              className="w-full h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              {currentPageFavorited ? (
                <BookmarkCheck className="w-4 h-4 shrink-0" />
              ) : (
                <Plus className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">
                {currentPageFavorited ? "Remove this page from bookmarks" : "Bookmark this page"}
              </span>
            </button>
          </div>

          {/* Favorites List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {favorites.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1.5">
                <Bookmark className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 opacity-80" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No bookmarks yet</p>
                <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-normal">
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
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
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
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate text-left">
                        <span className="truncate block">{fav.page_label}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal truncate block">
                          {fav.page_href}
                        </span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFavorite(fav.page_href, e)}
                        title="Remove bookmark"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
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
