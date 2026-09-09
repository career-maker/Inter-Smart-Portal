"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { bugzillaApi } from "@/services/bugzilla";
import { BugzillaSavedSearch } from "@/types/bugzilla";
import { PageLoader } from "@/components/ui/PageLoader";

export default function BugzillaSavedSearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<BugzillaSavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedSearches = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await bugzillaApi.getSavedSearches();
      setSearches(res.data || []);
    } catch (err: any) {
      console.error("Failed to load saved searches", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load saved searches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this saved search?")) return;
    try {
      await bugzillaApi.deleteSavedSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete saved search.");
    }
  };

  const handleRunSearch = (s: BugzillaSavedSearch) => {
    const params = new URLSearchParams();
    if (s.criteria) {
      Object.entries(s.criteria).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") {
          params.set(k, String(v));
        }
      });
    }
    router.push(`/project-management/bugzilla/bugs?${params.toString()}`);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-rose-600" />
            <span>Saved Search Queries</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Execute custom search queries or view criteria saved during defect triage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSavedSearches(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/project-management/bugzilla/bugs"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-2xs"
          >
            <Search className="w-3.5 h-3.5" />
            New Search
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {searches.length === 0 ? (
        <div className="p-12 text-center text-slate-400 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <BookmarkCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">No Saved Searches Yet</h3>
          <p className="text-xs max-w-sm mx-auto">
            You can save queries on the Bugs list page by clicking "Save Search" after configuring filters.
          </p>
          <Link
            href="/project-management/bugzilla/bugs"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700"
          >
            Go to Bugs Registry
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</h3>
                  {s.is_shared && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300">
                      Shared
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  {Object.entries(s.criteria || {}).map(([k, v]) => {
                    if (!v) return null;
                    return (
                      <div key={k} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{String(v)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                  title="Delete query"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleRunSearch(s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Execute Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
