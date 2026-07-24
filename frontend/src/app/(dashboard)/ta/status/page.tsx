"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, FileText, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TARequestItem {
  id: number;
  category: string;
  amount: number;
  description?: string;
}

interface TARequest {
  id: number;
  reason: string;
  date_travelled: string;
  total_amount: number;
  bill_path?: string;
  status: string;
  is_paid: boolean;
  approval_notes?: string;
  approver?: {
    first_name: string;
    last_name: string;
  };
  items: TARequestItem[];
  created_at: string;
  paid_at?: string;
}

export default function TAStatusPage() {
  const [requests, setRequests] = useState<TARequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchRequests();
  }, [filter, page]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params: any = { page };
      if (filter !== "all") {
        params.status = filter;
      }
      const res = await api.get("/ta-requests", { params });
      setRequests(res.data.data);
    } catch (error) {
      console.error("Failed to fetch TA requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Applied":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Approved":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Paid":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "Unpaid":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Rejected":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
      case "Paid":
        return <CheckCircle className="w-4 h-4" />;
      case "Rejected":
        return <XCircle className="w-4 h-4" />;
      case "Applied":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filterOptions = [
    { value: "all", label: "All Requests" },
    { value: "Applied", label: "Pending Approval" },
    { value: "Approved", label: "Approved (Unpaid)" },
    { value: "Paid", label: "Paid" },
    { value: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Travel Allowance Status
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          View and track your travel allowance applications
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setFilter(option.value);
              setPage(1);
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
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No travel allowance requests found</p>
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
                      <CardTitle className="text-lg">{request.reason}</CardTitle>
                      <Badge
                        className={`${getStatusColor(
                          request.status
                        )} border flex items-center gap-1.5`}
                      >
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                      {request.is_paid && (
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
                          Paid
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(request.date_travelled)}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold text-amber-400">
                          ₹{request.total_amount.toFixed(2)}
                        </span>
                      </div>
                      {request.approver && (
                        <div className="text-slate-500">
                          Approved by {request.approver.first_name}{" "}
                          {request.approver.last_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Breakdown */}
                <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Expense Breakdown
                  </p>
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

                {/* Bill & Notes */}
                <div className="flex items-center justify-between text-sm">
                  {request.bill_path ? (
                    <a
                      href={`/storage/${request.bill_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Bill
                    </a>
                  ) : (
                    <span className="text-slate-500">No bill attached</span>
                  )}
                  <p className="text-slate-500">
                    {formatDate(request.created_at)}
                  </p>
                </div>

                {request.approval_notes && (
                  <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">
                      Approval Notes
                    </p>
                    <p className="text-slate-300">{request.approval_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
