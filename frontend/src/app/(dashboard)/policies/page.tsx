"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect, useRef } from "react";
import { BookOpen, Upload, Trash2, Loader2, FileText, Search } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const POLICY_CATEGORIES = [
  "General", "Leave & Attendance", "Code of Conduct", "IT & Security",
  "Safety", "Benefits", "Recruitment", "Performance", "Travel & Expenses"
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8002";

const CATEGORY_COLORS: Record<string, string> = {
  "General": "bg-slate-100 text-slate-700",
  "Leave & Attendance": "bg-blue-100 text-blue-700",
  "Code of Conduct": "bg-purple-100 text-purple-700",
  "IT & Security": "bg-green-100 text-green-700",
  "Safety": "bg-red-100 text-red-700",
  "Benefits": "bg-amber-100 text-amber-700",
  "Recruitment": "bg-indigo-100 text-indigo-700",
  "Performance": "bg-teal-100 text-teal-700",
  "Travel & Expenses": "bg-orange-100 text-orange-700",
};

export default function PoliciesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [policies, setPolicies] = useState<any[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Upload form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPolicies(); }, []);

  useEffect(() => {
    let result = policies;
    if (search) result = result.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
    if (categoryFilter !== "all") result = result.filter(p => p.category === categoryFilter);
    setFilteredPolicies(result);
  }, [search, categoryFilter, policies]);

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/hr-policies");
      setPolicies(res.data.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const uploadPolicy = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !title || !category) return;
    setActionLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    if (version) formData.append("version", version);
    try {
      await api.post("/hr-policies", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadDialog(false);
      setTitle(""); setCategory(""); setVersion("");
      fetchPolicies();
    } catch (e: any) {
      alert(e.response?.data?.message || "Upload failed.");
    } finally { setActionLoading(false); }
  };

  const archivePolicy = async (id: number) => {
    if (!confirm("Archive this policy? It will no longer be visible to employees.")) return;
    try {
      await api.delete(`/hr-policies/${id}`);
      fetchPolicies();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error archiving policy.");
    }
  };

  // Group by category
  const grouped = filteredPolicies.reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">HR Policies</h1>
          <p className="text-slate-600 dark:text-slate-300">Browse and download company policies and guidelines.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" /> Upload Policy
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as string)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {POLICY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPolicies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {policies.length === 0 ? "No policies uploaded yet." : "No policies match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>
                  {cat}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((policy) => (
                  <Card key={policy.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <FileText className="h-8 w-8 text-primary shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-tight">{policy.title}</CardTitle>
                          {policy.version && (
                            <CardDescription className="mt-1">Version {policy.version}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(policy.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <a
                          href={`${BACKEND_URL}/storage/${policy.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition"
                        >
                          Download
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => archivePolicy(policy.id)}
                            className="text-xs text-red-500 hover:text-red-700 transition p-1.5"
                            title="Archive policy"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Policy Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload HR Policy</DialogTitle>
            <DialogDescription>Add a new policy document for all employees to access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Policy Title</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Annual Leave Policy 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as string)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Version <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                className="mt-1"
                placeholder="e.g. v2.1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div>
              <Label>Policy File</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or DOCX — max 20MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={uploadPolicy} disabled={actionLoading || !title || !category}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" /> Upload Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
