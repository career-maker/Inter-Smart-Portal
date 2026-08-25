"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Layers,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import pmApi from "@/services/pm";
import { ProjectTaskCatalog, PaginatedResponse } from "@/types/pm";
import { TaskCatalogModal } from "@/components/project-management/TaskCatalogModal";

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export default function TaskCatalogPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalogData, setCatalogData] = useState<PaginatedResponse<ProjectTaskCatalog> | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectTaskCatalog | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCatalog = useCallback(
    async (page = 1, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params: any = { page };
        if (search.trim()) params.search = search.trim();
        if (activeFilter === "Active") params.is_active = true;
        if (activeFilter === "Inactive") params.is_active = false;
        if (categoryFilter.trim()) params.category = categoryFilter.trim();

        const res: any = await pmApi.getTaskCatalog(params);

        if (res?.data && Array.isArray(res.data) && res.current_page) {
          setCatalogData(res);
        } else if (res?.data && Array.isArray(res.data)) {
          // Unpaginated fallback format
          setCatalogData({
            data: res.data,
            current_page: 1,
            last_page: 1,
            per_page: res.data.length,
            total: res.data.length,
            from: 1,
            to: res.data.length,
          });
        }
        setCurrentPage(page);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load task catalog.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, activeFilter, categoryFilter]
  );

  useEffect(() => {
    fetchCatalog(1);
  }, [fetchCatalog]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog(1);
  };

  const handleToggleActive = async (item: ProjectTaskCatalog) => {
    setTogglingId(item.id);
    try {
      await pmApi.updateTaskCatalogItem(item.id, { is_active: !item.is_active });
      await fetchCatalog(currentPage, true);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to toggle template status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (item: ProjectTaskCatalog) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${item.name}" from the active Task Catalog? (This is a safe soft-delete and will not affect existing project tasks).`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await pmApi.deleteTaskCatalogItem(item.id);
      await fetchCatalog(currentPage, true);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete template.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 space-y-2">
          <h2 className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span>Administrator Access Required</span>
          </h2>
          <p className="text-xs text-amber-800/90 dark:text-amber-400">
            The Predefined Task Catalog administration interface is restricted to Super Admin & HR managers.
            Active templates can be selected during standard task creation under your authorized projects.
          </p>
          <Link
            href="/project-management/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-bold underline mt-2 text-amber-900 dark:text-amber-200"
          >
            ← Return to Tasks Directory
          </Link>
        </div>
      </div>
    );
  }

  const itemsList = catalogData?.data || [];
  const totalItems = catalogData?.total ?? itemsList.length;
  const lastPage = catalogData?.last_page || 1;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/project-management" className="hover:text-blue-600 dark:hover:text-blue-400">
              Project Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white">Task Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Task Catalog Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Predefined task definitions and milestone templates available to all task creators.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchCatalog(currentPage, true)}
            disabled={refreshing || loading}
            aria-label="Refresh Catalog"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Active Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {["All", "Active", "Inactive"].map((tab) => {
            const isSelected = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
                }`}
              >
                {tab === "All" ? "All Templates" : `${tab} Only`}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by title, category, or description..."
            className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchCatalog(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load catalog</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchCatalog(currentPage, true)}
            className="text-xs font-semibold underline hover:no-underline text-rose-700 dark:text-rose-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Catalog Table ── */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-3 animate-pulse">
            <BookOpen className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-sm font-semibold">Loading task templates…</p>
          </div>
        ) : itemsList.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              No catalog templates found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search || activeFilter !== "All"
                ? "No templates match the selected search criteria."
                : "Create reusable task names to help teams standardize project deliverables."}
            </p>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Template</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-5">Template Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Scope Description</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {itemsList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">
                        {item.name}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                        {item.category || "General"}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 max-w-xs">
                      <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.description || "—"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {formatDateDisplay(item.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Active Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={item.is_active ? "Deactivate template" : "Activate template"}
                        >
                          {item.is_active ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit template"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong>{" "}
              of <strong className="text-slate-800 dark:text-slate-200">{lastPage}</strong> (
              {totalItems} total templates)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchCatalog(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchCatalog(currentPage + 1)}
                disabled={currentPage >= lastPage || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <TaskCatalogModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        catalogItem={editingItem}
        onSuccess={() => fetchCatalog(currentPage, true)}
      />
    </div>
  );
}
