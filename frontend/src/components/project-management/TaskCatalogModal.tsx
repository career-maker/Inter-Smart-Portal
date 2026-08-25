"use client";

import { useState, useEffect } from "react";
import { X, Loader2, BookOpen, AlertCircle, Check } from "lucide-react";
import pmApi from "@/services/pm";
import { ProjectTaskCatalog, StoreProjectTaskCatalogPayload } from "@/types/pm";

interface TaskCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogItem?: ProjectTaskCatalog | null;
  onSuccess: () => void;
}

const COMMON_CATEGORIES = [
  "General",
  "Frontend",
  "Backend",
  "QA & Testing",
  "UI/UX Design",
  "DevOps & Infrastructure",
  "Security & Compliance",
  "Documentation",
  "Project Management",
];

export function TaskCatalogModal({
  isOpen,
  onClose,
  catalogItem,
  onSuccess,
}: TaskCatalogModalProps) {
  const isEditing = !!catalogItem;

  const [formData, setFormData] = useState<StoreProjectTaskCatalogPayload>({
    name: "",
    category: "General",
    description: "",
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogItem) {
      setFormData({
        name: catalogItem.name,
        category: catalogItem.category || "General",
        description: catalogItem.description || "",
        is_active: catalogItem.is_active,
      });
    } else {
      setFormData({
        name: "",
        category: "General",
        description: "",
        is_active: true,
      });
    }
    setError(null);
  }, [catalogItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Template name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: StoreProjectTaskCatalogPayload = {
        name: formData.name.trim(),
        category: formData.category?.trim() || null,
        description: formData.description?.trim() || null,
        is_active: formData.is_active,
      };

      if (isEditing && catalogItem) {
        await pmApi.updateTaskCatalogItem(catalogItem.id, payload);
      } else {
        await pmApi.createTaskCatalogItem(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save catalog template.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Catalog Template" : "New Task Template"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Predefined task name available across project task creators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Navigation Header QA & Regression Testing"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                list="catalog-categories"
                value={formData.category || ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Select or type a category (e.g. QA & Testing, Frontend)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <datalist id="catalog-categories">
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Description / Scope Guidelines
            </label>
            <textarea
              rows={3}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Recommended acceptance criteria, checklist, or test scenarios..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Active Status Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Active (Available in task creation dropdowns)</span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              Deactivating a template hides it from new task dropdowns without affecting existing tasks.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Create Template"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
