"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Paperclip, Send, Clock, User, Download, FileText } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getStorageUrl } from "@/lib/utils";

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchIssue();
  }, [params.id]);

  const fetchIssue = async () => {
    try {
      const res = await api.get(`/issues/${params.id}`);
      setIssue(res.data.data);
    } catch (e) {
      console.error(e);
      alert("Failed to load issue.");
      router.push("/issues");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this issue as ${newStatus}?`)) return;
    try {
      await api.put(`/issues/${params.id}/status`, { status: newStatus });
      fetchIssue();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && files.length === 0) return;
    
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("comment", commentText);
      files.forEach((file) => {
        data.append("attachments[]", file);
      });

      await api.post(`/issues/${params.id}/comments`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setCommentText("");
      setFiles([]);
      fetchIssue();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Waiting for User Response': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || !issue) {
    return <div className="p-12 text-center text-muted-foreground">Loading issue details...</div>;
  }

  const isSuperAdmin = user?.role === 'Super Admin';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/issues">
            <Button variant="outline" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">#{issue.id} {issue.title}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(issue.status)}`}>
                {issue.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
              <span>By {issue.user.first_name} {issue.user.last_name}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {format(new Date(issue.created_at), "PPp")}</span>
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="Open">Mark Open</option>
              <option value="In Progress">Mark In Progress</option>
              <option value="Waiting for User Response">Wait for Response</option>
              <option value="Resolved">Mark Resolved</option>
              <option value="Rejected">Reject</option>
              <option value="Closed">Close Issue</option>
            </select>
          )}
          {!isSuperAdmin && (issue.status === 'Resolved' || issue.status === 'Closed') && (
            <Button variant="outline" onClick={() => handleStatusChange('Open')}>
              Reopen Issue
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat/Thread Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              {/* Original Description */}
              <div className="p-6 border-b bg-gray-50/30">
                <div className="flex gap-4">
                  <img 
                    src={issue.user.profile_photo_path || "https://ui-avatars.com/api/?name=" + issue.user.first_name} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full bg-white shadow-sm"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="font-semibold text-gray-900">{issue.user.first_name} {issue.user.last_name}</div>
                      <div className="text-xs text-gray-500">{format(new Date(issue.created_at), "PPp")}</div>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{issue.description}</div>
                    
                    {issue.attachments && issue.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                        {issue.attachments.map((att: any) => (
                          <a 
                            key={att.id} 
                            href={getStorageUrl(att.file_path)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors"
                          >
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="truncate max-w-[200px]">{att.file_name}</span>
                            <Download className="w-3.5 h-3.5 text-gray-400 ml-2" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="divide-y bg-white">
                {issue.comments?.map((comment: any) => (
                  <div key={comment.id} className="p-6">
                    <div className="flex gap-4">
                      <img 
                        src={comment.user.profile_photo_path || "https://ui-avatars.com/api/?name=" + comment.user.first_name} 
                        alt="avatar" 
                        className="w-10 h-10 rounded-full shadow-sm"
                      />
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {comment.user.first_name} {comment.user.last_name}
                            {comment.user.id === issue.user_id && <span className="ml-2 text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">Author</span>}
                          </div>
                          <div className="text-xs text-gray-500">{format(new Date(comment.created_at), "PPp")}</div>
                        </div>
                        <div className="text-gray-700 whitespace-pre-wrap">{comment.comment}</div>

                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-3">
                            {comment.attachments.map((att: any) => (
                              <a 
                                key={att.id} 
                                href={getStorageUrl(att.file_path)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate max-w-[150px]">{att.file_name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-6 bg-gray-50/50 rounded-b-xl border-t">
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <div className="relative">
                    <Textarea 
                      placeholder="Type your reply..."
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="resize-none bg-white pr-12 focus-visible:ring-primary"
                    />
                    <div className="absolute right-3 top-3 flex flex-col gap-2">
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files) {
                            setFiles([...files, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors bg-gray-50 rounded-md hover:bg-primary/10"
                        title="Attach files"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="text-xs bg-white border px-2 py-1 rounded-md flex items-center gap-2">
                          <span className="truncate max-w-[150px]">{f.name}</span>
                          <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">&times;</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting} className="gap-2">
                      <Send className="w-4 h-4" />
                      {submitting ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-lg border-b pb-3">Details</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Priority</span>
                  <span className="font-medium">{issue.priority}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Category</span>
                  <span className="font-medium">{issue.category}</span>
                </div>
                {issue.related_module && (
                  <div>
                    <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Related Module</span>
                    <span className="font-medium">{issue.related_module}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Assigned To</span>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{issue.assignedTo ? `${issue.assignedTo.first_name} ${issue.assignedTo.last_name}` : "Unassigned"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
