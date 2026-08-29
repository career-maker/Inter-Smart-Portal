"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Megaphone,
  Pin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  Tag,
  X,
  Check,
  Search,
  Globe,
  Sparkles,
  SlidersHorizontal,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { FavoriteButton } from "@/components/layout/FavoriteButton";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8765";

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);

  // Inline Category creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchCategories();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/announcements");
      const raw =
        res.data?.data?.data ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);
      setAnnouncements(Array.isArray(raw) ? raw : []);
    } catch (e) {
      console.error("Failed to load announcements", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/announcement-categories");
      setCategories(res.data.data || []);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await api.post("/announcement-categories", {
        name: newCategoryName.trim(),
      });
      const newCat = res.data.data;
      setCategories([...categories, newCat]);
      setCategory(newCat.name);
      setIsAddingCategory(false);
      setNewCategoryName("");
    } catch (e: any) {
      alert(e.response?.data?.message || "Error creating category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setTitle("");
    setContent("");
    setCategory("");
    setIsPinned(false);
    setScheduledAt("");
    setExpiresAt("");
    setIsAddingCategory(false);
    setNewCategoryName("");
    setShowDialog(true);
  };

  const openEdit = (ann: any) => {
    setEditTarget(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setIsPinned(Boolean(ann.is_pinned));
    setScheduledAt(
      ann.scheduled_at ? ann.scheduled_at.slice(0, 16).replace(" ", "T") : ""
    );
    setExpiresAt(
      ann.expires_at ? ann.expires_at.slice(0, 16).replace(" ", "T") : ""
    );
    setIsAddingCategory(false);
    setNewCategoryName("");
    setShowDialog(true);
  };

  const submitForm = async () => {
    setActionLoading(true);
    try {
      if (editTarget) {
        await api.put(`/announcements/${editTarget.id}`, {
          title,
          content,
          category,
          is_pinned: isPinned,
          scheduled_at: scheduledAt || null,
          expires_at: expiresAt || null,
        });
      } else {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("category", category);
        formData.append("is_pinned", isPinned ? "1" : "0");
        if (scheduledAt) formData.append("scheduled_at", scheduledAt);
        if (expiresAt) formData.append("expires_at", expiresAt);
        if (imageRef.current?.files?.[0]) {
          formData.append("image", imageRef.current.files[0]);
        }

        await api.post("/announcements", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setShowDialog(false);
      // Reset form
      setTitle("");
      setContent("");
      setCategory("");
      setIsPinned(false);
      setScheduledAt("");
      setExpiresAt("");
      if (imageRef.current) imageRef.current.value = "";

      // Refresh announcements
      await fetchAnnouncements();
    } catch (e: any) {
      const errorMsg =
        e.response?.data?.message ||
        e.response?.data?.errors ||
        e.message ||
        "Error saving announcement.";
      console.error("Announcement error:", errorMsg);
      let displayMsg = errorMsg;
      if (typeof errorMsg === "object") {
        displayMsg = Object.values(errorMsg).flat().join("\n");
      }
      alert("❌ Error:\n" + displayMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      await fetchAnnouncements();
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || "Error deleting.";
      alert("❌ Error: " + errorMsg);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
      return format(d, "MMM d, yyyy");
    } catch (e) {
      return "Recently";
    }
  };

  const formatDisplayDate = (d: string) => {
    try {
      return format(parseISO(d), "dd MMM yyyy, hh:mm a");
    } catch (e) {
      return d;
    }
  };

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const matchesSearch =
        !search ||
        ann.title?.toLowerCase().includes(search.toLowerCase()) ||
        ann.content?.toLowerCase().includes(search.toLowerCase()) ||
        ann.category?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory !== "all" && ann.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [announcements, search, selectedCategory]);

  return (
    <div
      style={{
        fontFamily:
          '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>HR Services</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Updates & Announcements</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 mt-1">
            <Megaphone className="w-6 h-6 text-[#56348f] dark:text-purple-400" />
            <span>Company Updates & Announcements</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official announcements, news, notices, and company celebrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <FavoriteButton label="Updates & Announcements" />
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              style={{
                backgroundColor: "#56348f",
                color: "rgb(255, 255, 255)",
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "12px",
                fontWeight: 600,
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 !text-white" />
              <span className="!text-white">New Announcement</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#56348f] text-white border-[#56348f]"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
            }`}
          >
            All Updates ({announcements.length})
          </button>
          {categories.map((cat) => {
            const count = announcements.filter((a) => a.category === cat.name).length;
            const isSelected = selectedCategory === cat.name;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#56348f] text-white border-[#56348f]"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Community-Style Announcements Feed ── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#56348f]" />
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-[#56348f] dark:text-purple-400">
            <Megaphone className="h-7 w-7" />
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
            No announcements found.
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            {search || selectedCategory !== "all"
              ? "Try adjusting your search terms or category filters."
              : "Company announcements and updates published by HR will appear here."}
          </p>
          {isAdmin && !search && selectedCategory === "all" && (
            <button
              type="button"
              onClick={openCreate}
              style={{
                backgroundColor: "#56348f",
                color: "rgb(255, 255, 255)",
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "12px",
                fontWeight: 600,
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 !text-white" />
              <span className="!text-white">Create First Announcement</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredAnnouncements.map((ann) => {
            const authorName = ann.author
              ? `${ann.author.first_name || ""} ${ann.author.last_name || ""}`.trim()
              : "Company Management";

            return (
              <div
                key={ann.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Author Info Header matching Community exact post layout */}
                <div className="flex items-start justify-between px-5 pt-4 pb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <RoyalAvatar
                      src={ann.author?.profile_photo_path}
                      name={authorName}
                      userId={ann.author_id || ann.author?.id}
                      className="w-10 h-10 rounded-full shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[14px] leading-tight text-slate-900 dark:text-white truncate flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          <RoyalName name={authorName} userId={ann.author_id || ann.author?.id} />
                        </span>
                        <span className="text-slate-400 font-normal text-xs">
                          published an update
                        </span>
                      </p>
                      <div className="text-[12px] text-slate-500 dark:text-slate-400 font-normal flex flex-wrap items-center gap-1.5">
                        <span>{formatRelativeTime(ann.created_at)}</span>
                        <span>·</span>
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                          <Tag className="w-3 h-3 text-purple-500" />
                          {ann.category}
                        </span>
                        {ann.is_pinned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 shadow-2xs">
                            <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                            Pinned Announcement
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Action Menu */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(ann)}
                        className="p-1.5 text-slate-400 hover:text-[#56348f] hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Announcement"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Announcement Title */}
                <div className="px-5 pt-2 pb-1">
                  <h2 className="text-[17px] font-bold leading-snug text-slate-900 dark:text-white">
                    {ann.title}
                  </h2>
                </div>

                {/* Post Body Content */}
                {ann.content && (
                  <div className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap px-5 pb-3">
                    {ann.content}
                  </div>
                )}

                {/* Attached Banner Image (Centred, Instagram/Community Frame) */}
                {ann.image_path && (
                  <div className="px-5 pb-4 w-full flex items-center justify-center">
                    <div className="relative max-w-full rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
                      <img
                        src={`${BACKEND_URL}/storage/${ann.image_path}`}
                        alt={ann.title}
                        className="max-w-full w-auto h-auto max-h-[380px] object-contain rounded-xl block transition-all"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}

                {/* Expiry Badge Footer (if set) */}
                {ann.expires_at && (
                  <div className="px-5 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Expires on: {formatDisplayDate(ann.expires_at)}</span>
                    </div>
                    {ann.scheduled_at && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>Scheduled: {formatDisplayDate(ann.scheduled_at)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog Drawer ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Title */}
            <div>
              <Label className="font-bold text-slate-700 dark:text-slate-300">
                Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
              />
            </div>

            {/* Category */}
            <div>
              <Label className="font-bold text-slate-700 dark:text-slate-300">
                Category <span className="text-rose-500">*</span>
              </Label>
              {isAddingCategory ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsAddingCategory(false)}
                    disabled={creatingCategory}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || creatingCategory}
                  >
                    {creatingCategory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <Select
                  value={category}
                  onValueChange={(val) => {
                    if (val === "ADD_NEW") {
                      setIsAddingCategory(true);
                    } else {
                      setCategory(val || "");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem
                      value="ADD_NEW"
                      className="font-semibold text-purple-600 focus:text-purple-700"
                    >
                      <div className="flex items-center gap-1.5">
                        <Plus className="h-4 w-4" /> Add New Category
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Content */}
            <div>
              <Label className="font-bold text-slate-700 dark:text-slate-300">
                Content <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                className="mt-1"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write announcement content..."
                rows={5}
              />
            </div>

            {/* Banner Image */}
            {!editTarget && (
              <div>
                <Label className="font-bold text-slate-700 dark:text-slate-300">
                  Banner Image <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/70 dark:bg-slate-800/80 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#56348f] file:text-white cursor-pointer"
                />
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold text-slate-700 dark:text-slate-300">
                  Schedule For <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div>
                <Label className="font-bold text-slate-700 dark:text-slate-300">
                  Expires At <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            {/* Pin to Top Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-[#56348f] focus:ring-[#56348f] cursor-pointer"
              />
              <Label htmlFor="pinned" className="cursor-pointer font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                <Pin className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                Pin this announcement to the top & flash ticker
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={submitForm}
              disabled={
                actionLoading ||
                !title.trim() ||
                !content.trim() ||
                !category ||
                isAddingCategory
              }
              style={{
                backgroundColor: "#56348f",
                color: "rgb(255, 255, 255)",
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: "13px",
                lineHeight: "20px",
                fontWeight: 600,
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] !text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 animate-spin !text-white" />
              )}
              <span className="!text-white">
                {editTarget ? "Save Changes" : "Publish Announcement"}
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
