"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useRef } from "react";
import {
  Megaphone, Pin, Plus, Pencil, Trash2, Loader2, Calendar, Tag, X, Check
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8765";

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [isPinned, setIsPinned] = useState(false);
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
      setAnnouncements(res.data.data.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/announcement-categories");
      setCategories(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await api.post("/announcement-categories", { name: newCategoryName.trim() });
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
    setTitle(""); setContent(""); setCategory(""); setIsPinned(false);
    setIsAddingCategory(false);
    setNewCategoryName("");
    setShowDialog(true);
  };

  const openEdit = (ann: any) => {
    setEditTarget(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setIsPinned(ann.is_pinned);
    setIsAddingCategory(false);
    setNewCategoryName("");
    setShowDialog(true);
  };

  const submitForm = async () => {
    setActionLoading(true);
    try {
      if (editTarget) {
        await api.put(`/announcements/${editTarget.id}`, {
          title, content, category, is_pinned: isPinned
        });
        alert("✅ Announcement updated successfully!");
      } else {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("category", category);
        formData.append("is_pinned", isPinned ? "1" : "0");
        if (imageRef.current?.files?.[0]) formData.append("image", imageRef.current.files[0]);

        await api.post("/announcements", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        alert("✅ Announcement created successfully!");
      }

      setShowDialog(false);
      // Reset form
      setTitle("");
      setContent("");
      setCategory("");
      setIsPinned(false);
      if (imageRef.current) imageRef.current.value = "";

      // Refresh announcements
      await fetchAnnouncements();
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.response?.data?.errors || e.message || "Error saving announcement.";
      console.error("Announcement error:", errorMsg, e.response?.data);

      // Format error message if it's an object with validation errors
      let displayMsg = errorMsg;
      if (typeof errorMsg === 'object') {
        displayMsg = Object.values(errorMsg).flat().join("\n");
      }
      alert("❌ Error:\n" + displayMsg);
    } finally { setActionLoading(false); }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      alert("✅ Announcement deleted successfully!");
      // Refresh announcements and wait for it to complete
      await fetchAnnouncements();
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || "Error deleting.";
      const statusCode = e.response?.status;

      // Handle 404 - already deleted
      if (statusCode === 404) {
        alert("ℹ️ This announcement was already deleted.");
        // Still refresh the list to remove it from UI
        await fetchAnnouncements();
      } else {
        alert("❌ Error:\n" + errorMsg);
      }
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Company Updates</h1>
          <p className="text-slate-300">Announcements, events, and celebrations from the team.</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Announcement
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border rounded-xl bg-gray-50/50">
          <Megaphone className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No announcements yet.</p>
          {isAdmin && (
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Create First Announcement
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const catObj = categories.find(c => c.name === ann.category);
            const style = catObj ? { badge: catObj.badge_style, card: catObj.card_style } : { badge: "bg-gray-100 text-gray-700 border-gray-200", card: "border-l-gray-400" };
            
            return (
              <div
                key={ann.id}
                className={`bg-white rounded-xl border border-l-4 ${style.card} p-5 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Image */}
                  {ann.image_path && (
                    <img
                      src={`${BACKEND_URL}/storage/${ann.image_path}`}
                      alt={ann.title}
                      className="w-20 h-20 object-cover rounded-lg shrink-0 border"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {ann.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                      <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${style.badge}`}>
                        {ann.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold leading-tight mb-1">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{ann.content}</p>

                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(ann.created_at)}
                      </span>
                      {ann.author && (
                        <span>by {ann.author.first_name} {ann.author.last_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(ann)}
                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title..." />
            </div>
            <div>
              <Label>Category</Label>
              {isAddingCategory ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    placeholder="New category name..." 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={() => setIsAddingCategory(false)} disabled={creatingCategory}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={handleCreateCategory} disabled={!newCategoryName.trim() || creatingCategory}>
                    {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Select value={category} onValueChange={(val) => {
                  if (val === "ADD_NEW") {
                    setIsAddingCategory(true);
                  } else {
                    setCategory(val || "");
                  }
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value="ADD_NEW" className="font-semibold text-blue-600 focus:text-blue-700">
                      <div className="flex items-center">
                        <Plus className="h-4 w-4 mr-2" /> Add New Category
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                className="mt-1"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write announcement content..."
                rows={5}
              />
            </div>
            {!editTarget && (
              <div>
                <Label>Banner Image <span className="text-muted-foreground">(optional)</span></Label>
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm border rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pinned"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="pinned" className="cursor-pointer">
                <Pin className="h-3.5 w-3.5 inline mr-1 text-amber-600" />
                Pin this announcement to the top
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={actionLoading || !title || !content || !category || isAddingCategory}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Publish Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
