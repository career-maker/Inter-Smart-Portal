"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, AlertCircle, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { RaiseIssueDrawer } from "@/components/issues/RaiseIssueDrawer";

export default function IssuesPage() {
  const { user } = useAuthStore();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("new") === "1" || urlParams.get("raise") === "1") {
        setIsDrawerOpen(true);
      }
    }
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "All") {
        params.append("status", statusFilter);
      }
      const res = await api.get(`/issues?${params.toString()}`);
      setIssues(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(
    (issue) =>
      issue.title?.toLowerCase().includes(search.toLowerCase()) ||
      issue.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800";
      case "In Progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800";
      case "Waiting for User Response":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800";
      case "Closed":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
      case "Rejected":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low":
        return "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Medium":
        return "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "High":
        return "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Critical":
        return "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "text-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Helpdesk Issues
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Manage, track, and resolve support requests.
          </p>
        </div>
        <Button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 cursor-pointer bg-[#56348f] hover:bg-[#472a77] text-white shadow-sm font-semibold rounded-xl"
        >
          <PlusCircle className="w-4 h-4" />
          Raise an Issue
        </Button>
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/70 dark:bg-slate-850/60">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-xl"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {["All", "Open", "In Progress", "Resolved", "Closed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === status
                    ? "bg-[#56348f] text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 border-2 border-[#56348f] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading issues...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No issues found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Try adjusting your filters or submit a new support request.
              </p>
              <Button
                onClick={() => setIsDrawerOpen(true)}
                variant="outline"
                className="flex items-center gap-2 cursor-pointer rounded-xl border-slate-300 dark:border-slate-700"
              >
                <PlusCircle className="w-4 h-4" />
                Raise an Issue
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className="block hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(
                            issue.status
                          )}`}
                        >
                          {issue.status}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getPriorityColor(
                            issue.priority
                          )}`}
                        >
                          {issue.priority}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                          #{issue.id}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {issue.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {user?.role === "Super Admin" && (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={
                                issue.user?.profile_photo_path ||
                                "https://ui-avatars.com/api/?name=" +
                                  (issue.user?.first_name || "User")
                              }
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {issue.user?.first_name} {issue.user?.last_name}
                            </span>
                          </div>
                        )}
                        {/* Assigned-to-me badge for non-admin */}
                        {user?.role !== "Super Admin" && issue.assigned_to === user?.id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#56348f]/10 text-[#56348f] dark:bg-purple-900/40 dark:text-purple-300 border border-[#56348f]/20 dark:border-purple-800">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Assigned to me
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(issue.created_at), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          {issue.comments_count || 0} Comments
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {issue.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side popup drawer */}
      <RaiseIssueDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          // Clean URL params if opened via ?new=1
          if (typeof window !== "undefined" && window.location.search) {
            window.history.replaceState({}, "", "/issues");
          }
        }}
        onIssueCreated={() => {
          fetchIssues();
        }}
      />
    </div>
  );
}

