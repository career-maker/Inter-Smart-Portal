"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, AlertCircle, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function IssuesPage() {
  const { user } = useAuthStore();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

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

  const filteredIssues = issues.filter(issue => 
    issue.title.toLowerCase().includes(search.toLowerCase()) || 
    issue.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-purple-100 text-purple-800';
      case 'Waiting for User Response': return 'bg-orange-100 text-orange-800';
      case 'Resolved': return 'bg-emerald-100 text-emerald-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-blue-600 bg-blue-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Helpdesk Issues</h1>
          <p className="text-slate-600 dark:text-slate-300">Manage and track your support requests.</p>
        </div>
        <Link href="/issues/new">
          <Button className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Raise an Issue
          </Button>
        </Link>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 rounded-t-xl">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search issues..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading issues...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No issues found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters or raise a new issue.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredIssues.map((issue) => (
                <Link key={issue.id} href={`/issues/${issue.id}`} className="block hover:bg-gray-50 transition-colors p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(issue.status)}`}>
                          {issue.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(issue.priority)}`}>
                          {issue.priority}
                        </span>
                        <span className="text-sm text-gray-500 font-medium">#{issue.id}</span>
                      </div>
                      <h4 className="text-base font-semibold text-gray-900 truncate">{issue.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-500">
                        {user?.role === 'Super Admin' && (
                          <div className="flex items-center gap-1.5">
                            <img src={issue.user.profile_photo_path || "https://ui-avatars.com/api/?name=" + issue.user.first_name} alt="" className="w-5 h-5 rounded-full" />
                            <span>{issue.user.first_name} {issue.user.last_name}</span>
                          </div>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(issue.created_at), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {issue.comments_count || 0} Comments
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{issue.category}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
