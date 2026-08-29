"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Plus,
  Receipt,
  ExternalLink,
  Car,
  Utensils,
  Hotel,
  HelpCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { TAApplyModal } from "@/components/ta/TAApplyModal";
import { TAReceiptVoucherModal } from "@/components/ta/TAReceiptVoucherModal";

interface TARequestItem {
  id: number;
  category: string;
  amount: number | string;
  description?: string;
}

interface TARequest {
  id: number;
  reason: string;
  date_travelled: string;
  total_amount: number | string;
  approved_amount?: number | string;
  receipt_number?: string;
  payment_receipt_link?: string;
  payment_mode?: string;
  bill_link?: string;
  status: string;
  is_paid: boolean;
  approval_notes?: string;
  approver?: {
    first_name: string;
    last_name: string;
  };
  items?: TARequestItem[];
  created_at: string;
  paid_at?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  Travel: Car,
  Food: Utensils,
  Accommodation: Hotel,
  Other: HelpCircle,
};

export default function TAStatusPage() {
  const { user: currentUser } = useAuthStore();
  const [requests, setRequests] = useState<TARequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isApplyDrawerOpen, setIsApplyDrawerOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<TARequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (filter !== "all") {
        params.status = filter;
      }
      const res = await api.get("/ta-requests", { params });
      const data = res.data?.data?.data || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch TA requests:", error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this Travel Allowance claim?")) return;
    setCancellingId(id);
    try {
      await api.post(`/ta-requests/${id}/cancel`);
      fetchRequests();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to cancel TA claim.");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string, isPaid: boolean) => {
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Paid & Settled
        </span>
      );
    }

    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved (Pending Payment)
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case "Applied":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "–";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number | string) => {
    const num = Number(amount || 0);
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filterOptions = [
    { value: "all", label: "All Claims" },
    { value: "Applied", label: "Pending Approval" },
    { value: "Approved", label: "Approved" },
    { value: "Paid", label: "Paid" },
    { value: "Rejected", label: "Rejected" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Travel Allowance Status
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track and monitor the review and disbursement status of your travel claims.
          </p>
        </div>

        <button
          onClick={() => setIsApplyDrawerOpen(true)}
          style={{
            backgroundColor: "#56348f",
            color: "rgb(255, 255, 255)",
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] font-bold !text-white text-xs sm:text-sm shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 !text-white" />
          <span>New TA Request</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter === option.value
                ? "bg-[#56348f] text-white shadow-sm"
                : "bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#56348f] mb-3" />
          <span className="text-xs sm:text-sm font-medium">Loading your travel claims…</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No travel allowance claims found
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            You haven't submitted any travel claims under this filter. Click New TA Request to submit one.
          </p>
          <button
            onClick={() => setIsApplyDrawerOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#56348f] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Apply Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:border-purple-300/60 dark:hover:border-purple-700/40 transition-colors"
            >
              {/* Top Row: Purpose + Status + Amount */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {request.reason}
                    </h2>
                    {getStatusBadge(request.status, request.is_paid)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Travel Date: <strong className="text-slate-700 dark:text-slate-200">{formatDate(request.date_travelled)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Submitted: <strong className="text-slate-700 dark:text-slate-200">{formatDate(request.created_at)}</strong>
                    </span>
                    {request.approver && (
                      <>
                        <span>•</span>
                        <span>
                          Reviewed by: <strong className="text-slate-700 dark:text-slate-200">{request.approver.first_name} {request.approver.last_name}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-xs text-slate-400 block font-medium">Claim Amount</span>
                  <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5 sm:gap-0">
                    <span className="text-xl sm:text-2xl font-bold text-[#56348f] dark:text-purple-300">
                      ₹{formatCurrency(request.approved_amount || request.total_amount)}
                    </span>
                    {request.approved_amount && Number(request.approved_amount) !== Number(request.total_amount) && (
                      <span className="text-[11px] text-slate-400 line-through">
                        Claimed: ₹{formatCurrency(request.total_amount)}
                      </span>
                    )}
                  </div>
                  {request.receipt_number && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/70 text-[#56348f] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60">
                      {request.receipt_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Expense Breakdown List */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Itemized Expenses
                </span>
                <div className="space-y-1.5">
                  {(request.items || []).map((item, idx) => {
                    const IconComp = CATEGORY_ICONS[item.category] || Car;
                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-slate-200/40 dark:border-slate-800 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <IconComp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.category}
                          </span>
                          {item.description && (
                            <span className="text-slate-400 text-xs italic">
                              ({item.description})
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{formatCurrency(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Row: Bill Receipt, Payment Proof & Approval Notes */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Generated Official Bill Receipt Voucher */}
                  {(request.receipt_number || request.status === "Approved" || request.status === "Paid") && (
                    <button
                      type="button"
                      onClick={() => setViewingVoucher(request)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#56348f] dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 font-bold border border-purple-200/80 dark:border-purple-800/60 transition-colors cursor-pointer"
                      title="View and Download Generated Official Bill Receipt Image"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Official Bill Receipt</span>
                    </button>
                  )}

                  {/* Attached Expense Proof */}
                  {request.bill_link && (
                    <a
                      href={request.bill_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                      title="Download or view attached expense document/proof"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>View Attached Proof</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  )}

                  {/* Payment Proof Screenshot (if disbursed) */}
                  {request.payment_receipt_link && (
                    <a
                      href={request.payment_receipt_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold border border-emerald-200/60 dark:border-emerald-800/40 transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Payment Proof Screenshot</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  )}

                  {!request.bill_link && !request.payment_receipt_link && !request.receipt_number && request.status !== "Approved" && request.status !== "Paid" && (
                    <span className="text-slate-400 italic">No attachments</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {request.approval_notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-1.5 rounded-lg">
                      <strong className="text-amber-800 dark:text-amber-300">Note:</strong> {request.approval_notes}
                    </div>
                  )}

                  {(request.status === "Applied" || request.status === "Pending") && (
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancellingId === request.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{cancellingId === request.id ? "Cancelling…" : "Cancel Request"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TA Apply Drawer */}
      <TAApplyModal
        isOpen={isApplyDrawerOpen}
        onClose={() => setIsApplyDrawerOpen(false)}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* Official TA Receipt Voucher Modal */}
      <TAReceiptVoucherModal
        isOpen={!!viewingVoucher}
        onClose={() => setViewingVoucher(null)}
        request={viewingVoucher}
        currentUser={currentUser}
      />
    </div>
  );
}
