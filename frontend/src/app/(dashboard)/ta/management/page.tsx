"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Download,
} from "lucide-react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/PageLoader";

interface TARequest {
  id: number;
  user: { first_name: string; last_name: string; employee_code: string };
  reason: string;
  date_travelled: string;
  total_amount: number;
  bill_path?: string;
  status: string;
  is_paid: boolean;
  approval_notes?: string;
  items: Array<{ id: number; category: string; amount: number; description?: string }>;
  created_at: string;
  paid_at?: string;
}

export default function TAManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [requests, setRequests] = useState<TARequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Applied");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.push("/dashboard");
    } else {
      fetchRequests();
    }
  }, [user, router, filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/ta-requests", {
        params: { status: filter },
      });
      setRequests(res.data.data);
    } catch (error) {
      console.error("Failed to fetch TA requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await api.post(`/ta-requests/${id}/approve`, {
        approval_notes: approvalNotes[id] || "",
      });
      setApprovalNotes({ ...approvalNotes, [id]: "" });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!approvalNotes[id]) {
      alert("Please provide a reason for rejection");
      return;
    }
    setActionLoading(id);
    try {
      await api.post(`/ta-requests/${id}/reject`, {
        approval_notes: approvalNotes[id],
      });
      setApprovalNotes({ ...approvalNotes, [id]: "" });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (id: number, isPaid: boolean) => {
    setActionLoading(id);
    try {
      await api.post(`/ta-requests/${id}/mark-paid`, { is_paid: isPaid });
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update payment status");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string, isPaid?: boolean) => {
    if (isPaid) return "bg-green-500/20 text-green-300 border-green-500/30";
    switch (status) {
      case "Applied":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Approved":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Rejected":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const filterOptions = [
    { value: "Applied", label: "Pending Approval" },
    { value: "Approved", label: "Approved (Unpaid)" },
    { value: "Paid", label: "Paid" },
    { value: "Rejected", label: "Rejected" },
  ];

  if (!user || user.role !== "Super Admin") {
    return <PageLoader />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Travel Allowance Management
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Review and approve travel allowance requests
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setFilter(option.value);
              setExpandedId(null);
            }}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filter === option.value
                ? "bg-amber-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="pt-6 text-center text-slate-400">
            <p>No requests found in this category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800/80 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === request.id ? null : request.id)
                        }
                        className="flex items-center gap-2 flex-1 hover:opacity-80 transition"
                      >
                        <div>
                          <h3 className="font-semibold">
                            {request.user.first_name} {request.user.last_name}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {request.user.employee_code}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${getStatusColor(
                            request.status,
                            request.is_paid
                          )} border flex items-center gap-1.5`}
                        >
                          {request.status === "Applied" && (
                            <Clock className="w-4 h-4" />
                          )}
                          {request.status === "Approved" && (
                            <DollarSign className="w-4 h-4" />
                          )}
                          {request.status === "Rejected" && (
                            <XCircle className="w-4 h-4" />
                          )}
                          {request.status}
                        </Badge>
                        {request.is_paid && (
                          <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
                            Paid
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>{request.reason}</span>
                      <span>₹{request.total_amount.toFixed(2)}</span>
                      <span>{formatDate(request.date_travelled)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Details */}
              {expandedId === request.id && (
                <CardContent className="space-y-4 border-t border-slate-700 pt-4">
                  {/* Breakdown */}
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Expense Breakdown
                    </p>
                    <div className="space-y-2">
                      {request.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-medium">{item.category}</p>
                            {item.description && (
                              <p className="text-slate-400 text-xs">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold">₹{item.amount.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-600 pt-2 mt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span>₹{request.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Bill Link */}
                  {request.bill_path && (
                    <a
                      href={`/storage/${request.bill_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-amber-400 text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      View Bill
                    </a>
                  )}

                  {/* Actions based on status */}
                  {request.status === "Applied" && (
                    <div className="space-y-3 border-t border-slate-700 pt-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-slate-300">
                          Notes
                        </label>
                        <textarea
                          value={approvalNotes[request.id] || ""}
                          onChange={(e) =>
                            setApprovalNotes({
                              ...approvalNotes,
                              [request.id]: e.target.value,
                            })
                          }
                          placeholder="Add approval or rejection notes..."
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 rounded-lg font-semibold transition-colors"
                        >
                          {actionLoading === request.id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 rounded-lg font-semibold transition-colors"
                        >
                          {actionLoading === request.id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {request.status === "Approved" && (
                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-sm text-slate-400 mb-3">
                        Mark as paid or keep as unpaid
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleMarkPaid(request.id, true)}
                          disabled={actionLoading === request.id || request.is_paid}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded-lg font-semibold transition-colors"
                        >
                          {actionLoading === request.id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Mark as Paid
                        </button>
                        <button
                          onClick={() => handleMarkPaid(request.id, false)}
                          disabled={actionLoading === request.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 rounded-lg font-semibold transition-colors"
                        >
                          {actionLoading === request.id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Mark as Unpaid
                        </button>
                      </div>
                    </div>
                  )}

                  {request.approval_notes && (
                    <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                      <p className="text-xs font-semibold text-slate-400 mb-1">
                        Admin Notes
                      </p>
                      <p className="text-slate-300">{request.approval_notes}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
