"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Search,
  Filter,
  Check,
  Edit2,
  Upload,
  User,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  Trash2,
  Sparkles,
  Printer,
  X,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { TAReceiptVoucherModal } from "@/components/ta/TAReceiptVoucherModal";

interface TARequestItem {
  id?: number;
  category: string;
  amount: number | string;
  description?: string;
}

interface TARequest {
  id: number;
  user_id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    employee_code: string;
    email?: string;
    team?: { name: string };
  };
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
  items: TARequestItem[];
  created_at: string;
  paid_at?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  Travel: Car,
  Food: Utensils,
  Accommodation: Hotel,
  Other: HelpCircle,
};

export default function TAManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";

  const [requests, setRequests] = useState<TARequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Applied");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Approval Modal State
  const [approvalModalItem, setApprovalModalItem] = useState<TARequest | null>(null);
  const [approvalForm, setApprovalForm] = useState<{
    approved_amount: string;
    approval_notes: string;
    is_paid: boolean;
    payment_mode: string;
    payment_receipt_file: File | null;
  }>({
    approved_amount: "",
    approval_notes: "",
    is_paid: false,
    payment_mode: "Bank Transfer",
    payment_receipt_file: null,
  });

  // Rejection Modal State
  const [rejectionModalItem, setRejectionModalItem] = useState<TARequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Override Modal State
  const [overrideModalItem, setOverrideModalItem] = useState<TARequest | null>(null);
  const [overrideForm, setOverrideForm] = useState<{
    reason: string;
    date_travelled: string;
    status: string;
    approved_amount: string;
    approval_notes: string;
    is_paid: boolean;
    payment_mode: string;
    receipt_number: string;
    items: Array<{ category: string; amount: string; description: string }>;
    payment_receipt_file: File | null;
    receipt_file: File | null;
  }>({
    reason: "",
    date_travelled: "",
    status: "Applied",
    approved_amount: "",
    approval_notes: "",
    is_paid: false,
    payment_mode: "Bank Transfer",
    receipt_number: "",
    items: [],
    payment_receipt_file: null,
    receipt_file: null,
  });

  // Receipt Voucher Print View Modal
  const [viewVoucherItem, setViewVoucherItem] = useState<TARequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get("/admin/ta-requests", {
        params: { status: filter === "all" ? undefined : filter },
      });
      setRequests(res.data.data || []);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || "Failed to load travel requests.");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.push("/dashboard");
    } else if (user && user.role === "Super Admin") {
      fetchRequests();
    }
  }, [user, router, fetchRequests]);

  // Handle URL email action parameters
  useEffect(() => {
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    if (id && requests.length > 0) {
      const target = requests.find((r) => r.id === Number(id));
      if (target) {
        if (action === "approve") {
          openApproveModal(target);
        } else if (action === "reject") {
          openRejectModal(target);
        }
      }
    }
  }, [searchParams, requests]);

  // ── Approval Handler ──
  const openApproveModal = (req: TARequest) => {
    setApprovalModalItem(req);
    setApprovalForm({
      approved_amount: String(req.approved_amount ?? req.total_amount ?? ""),
      approval_notes: req.approval_notes || "",
      is_paid: req.is_paid || false,
      payment_mode: req.payment_mode || "Bank Transfer",
      payment_receipt_file: null,
    });
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalItem) return;

    setActionLoadingId(approvalModalItem.id);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      if (approvalForm.approved_amount) {
        formData.append("approved_amount", approvalForm.approved_amount);
      }
      if (approvalForm.approval_notes) {
        formData.append("approval_notes", approvalForm.approval_notes);
      }
      formData.append("is_paid", approvalForm.is_paid ? "1" : "0");
      formData.append("payment_mode", approvalForm.payment_mode);
      if (approvalForm.payment_receipt_file) {
        formData.append("payment_receipt_file", approvalForm.payment_receipt_file);
      }

      const res = await api.post(`/ta-requests/${approvalModalItem.id}/approve`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMessage(res.data?.message || "Travel claim approved and receipt voucher generated!");
      setApprovalModalItem(null);
      fetchRequests();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Rejection Handler ──
  const openRejectModal = (req: TARequest) => {
    setRejectionModalItem(req);
    setRejectionReason(req.approval_notes || "");
  };

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalItem) return;
    if (!rejectionReason.trim()) {
      alert("Please enter a reason for rejection.");
      return;
    }

    setActionLoadingId(rejectionModalItem.id);
    setErrorMessage(null);
    try {
      const res = await api.post(`/ta-requests/${rejectionModalItem.id}/reject`, {
        approval_notes: rejectionReason.trim(),
      });
      setSuccessMessage(res.data?.message || "Travel request rejected.");
      setRejectionModalItem(null);
      fetchRequests();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to reject request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Override Modal Handlers ──
  const openOverrideModal = (req: TARequest) => {
    setOverrideModalItem(req);
    setOverrideForm({
      reason: req.reason || "",
      date_travelled: req.date_travelled ? req.date_travelled.split("T")[0] : "",
      status: req.status || "Applied",
      approved_amount: String(req.approved_amount ?? req.total_amount ?? ""),
      approval_notes: req.approval_notes || "",
      is_paid: req.is_paid || false,
      payment_mode: req.payment_mode || "Bank Transfer",
      receipt_number: req.receipt_number || "",
      items: (req.items || []).map((i) => ({
        category: i.category || "Travel",
        amount: String(i.amount || "0"),
        description: i.description || "",
      })),
      payment_receipt_file: null,
      receipt_file: null,
    });
  };

  const handleAddOverrideItem = () => {
    setOverrideForm((prev) => ({
      ...prev,
      items: [...prev.items, { category: "Travel", amount: "0", description: "" }],
    }));
  };

  const handleRemoveOverrideItem = (index: number) => {
    setOverrideForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleConfirmOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalItem) return;

    setActionLoadingId(overrideModalItem.id);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("reason", overrideForm.reason);
      formData.append("date_travelled", overrideForm.date_travelled);
      formData.append("status", overrideForm.status);
      if (overrideForm.approved_amount) {
        formData.append("approved_amount", overrideForm.approved_amount);
      }
      if (overrideForm.approval_notes) {
        formData.append("approval_notes", overrideForm.approval_notes);
      }
      formData.append("is_paid", overrideForm.is_paid ? "1" : "0");
      formData.append("payment_mode", overrideForm.payment_mode);
      if (overrideForm.receipt_number) {
        formData.append("receipt_number", overrideForm.receipt_number);
      }
      if (overrideForm.payment_receipt_file) {
        formData.append("payment_receipt_file", overrideForm.payment_receipt_file);
      }
      if (overrideForm.receipt_file) {
        formData.append("receipt_file", overrideForm.receipt_file);
      }

      formData.append(
        "items",
        JSON.stringify(
          overrideForm.items.map((it) => ({
            category: it.category,
            amount: Number(it.amount || 0),
            description: it.description,
          }))
        )
      );

      const res = await api.post(`/ta-requests/${overrideModalItem.id}/override`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMessage(res.data?.message || "Travel request updated and overridden successfully!");
      setOverrideModalItem(null);
      fetchRequests();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to override request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Formatters ──
  const formatCurrency = (val: number | string | undefined | null) => {
    const num = typeof val === "number" ? val : parseFloat(String(val || 0));
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string, isPaid?: boolean) => {
    if (isPaid || status === "Paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Paid & Settled</span>
        </span>
      );
    }

    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#56348f]" />
            <span>Approved (Unpaid)</span>
          </span>
        );
      case "Applied":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Review</span>
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rejected</span>
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <X className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  const filterOptions = [
    { value: "Applied", label: "Pending Approval" },
    { value: "Approved", label: "Approved (Unpaid)" },
    { value: "Paid", label: "Paid & Disbursed" },
    { value: "Rejected", label: "Rejected" },
    { value: "Cancelled", label: "Cancelled" },
    { value: "all", label: "All Requests" },
  ];

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const name = `${req.user?.first_name || ""} ${req.user?.last_name || ""}`.toLowerCase();
      const code = (req.user?.employee_code || "").toLowerCase();
      const reason = (req.reason || "").toLowerCase();
      const receipt = (req.receipt_number || "").toLowerCase();
      return name.includes(term) || code.includes(term) || reason.includes(term) || receipt.includes(term);
    });
  }, [requests, searchTerm]);

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-6 max-w-6xl mx-auto pb-16"
    >
      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Finances</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold">TA Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
              <Receipt className="w-6 h-6" />
            </div>
            <span>Travel Allowance Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review, override amounts, attach payment vouchers, generate receipts, and disburse travel reimbursements.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <Loader2 className={`w-4 h-4 ${isLoading ? "animate-spin text-[#56348f]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Status Alerts ── */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] w-full sm:w-auto">
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

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee, reason, receipt…"
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
          />
        </div>
      </div>

      {/* ── Claims List ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#56348f] mb-3" />
          <span className="text-xs sm:text-sm font-semibold">Loading travel allowance claims…</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No travel claims match the selected filter
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try switching filter tabs or clearing your search term to see other requests.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:border-purple-300/60 dark:hover:border-purple-700/40 transition-colors"
            >
              {/* Top Row: Employee + Purpose + Status + Amount */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                      <User className="w-4 h-4 text-[#56348f]" />
                      <span>{req.user?.first_name} {req.user?.last_name}</span>
                      {req.user?.employee_code && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {req.user.employee_code}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(req.status, req.is_paid)}
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {req.reason}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Travel Date: <strong className="text-slate-700 dark:text-slate-200">{formatDate(req.date_travelled)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Submitted: <strong className="text-slate-700 dark:text-slate-200">{formatDate(req.created_at)}</strong>
                    </span>
                    {req.approver && (
                      <>
                        <span>•</span>
                        <span>
                          Approver: <strong className="text-slate-700 dark:text-slate-200">{req.approver.first_name} {req.approver.last_name}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount & Receipt Badge */}
                <div className="text-left sm:text-right shrink-0 space-y-1">
                  <span className="text-xs text-slate-400 block font-medium">Claim Amount</span>
                  <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5 sm:gap-0">
                    <span className="text-xl sm:text-2xl font-bold text-[#56348f] dark:text-purple-300">
                      ₹{formatCurrency(req.approved_amount || req.total_amount)}
                    </span>
                    {req.approved_amount && Number(req.approved_amount) !== Number(req.total_amount) && (
                      <span className="text-[11px] text-slate-400 line-through">
                        Claimed: ₹{formatCurrency(req.total_amount)}
                      </span>
                    )}
                  </div>
                  {req.receipt_number && (
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/70 text-[#56348f] dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60">
                      {req.receipt_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Itemized Expenses Breakdown */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expense Breakdown
                </span>
                <div className="space-y-1.5">
                  {(req.items || []).map((item, idx) => {
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

              {/* Attachments & Admin Notes */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Generated Official Bill Receipt Voucher */}
                  {(req.receipt_number || req.status === "Approved" || req.status === "Paid") && (
                    <button
                      type="button"
                      onClick={() => setViewVoucherItem(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#56348f] dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 font-bold border border-purple-200/80 dark:border-purple-800/60 transition-colors cursor-pointer"
                      title="View & Download Generated Official Bill Receipt Image"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Official Bill Receipt</span>
                    </button>
                  )}

                  {/* Attached Expense Proof */}
                  {req.bill_link && (
                    <a
                      href={req.bill_link}
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
                  {req.payment_receipt_link && (
                    <a
                      href={req.payment_receipt_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold border border-emerald-200/60 dark:border-emerald-800/40 transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Payment Proof Screenshot</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  )}
                </div>

                {req.approval_notes && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-1.5 rounded-lg">
                    <strong className="text-amber-800 dark:text-amber-300">Note:</strong> {req.approval_notes}
                  </div>
                )}
              </div>

              {/* Admin Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                {/* Override button always available to Super Admin */}
                <button
                  type="button"
                  onClick={() => openOverrideModal(req)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Override Request</span>
                </button>

                {req.status === "Applied" && (
                  <>
                    <button
                      type="button"
                      onClick={() => openRejectModal(req)}
                      disabled={actionLoadingId === req.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openApproveModal(req)}
                      disabled={actionLoadingId === req.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#56348f] hover:bg-[#462875] shadow-sm transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve / Settle Claim</span>
                    </button>
                  </>
                )}

                {req.status === "Approved" && !req.is_paid && (
                  <button
                    type="button"
                    onClick={() => openApproveModal(req)}
                    disabled={actionLoadingId === req.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Disburse & Mark Paid</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 1: APPROVE & SETTLE CLAIM (With optional screenshot upload)
      ══════════════════════════════════════════════════════════════ */}
      {approvalModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Approve Travel Allowance Claim</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Applicant: <strong>{approvalModalItem.user?.first_name} {approvalModalItem.user?.last_name}</strong> ({approvalModalItem.user?.employee_code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              {/* Approved Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Approved Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={approvalForm.approved_amount}
                    onChange={(e) => setApprovalForm({ ...approvalForm, approved_amount: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Claimed Amount: ₹{formatCurrency(approvalModalItem.total_amount)}
                </p>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Disbursement / Payment Mode
                </label>
                <select
                  value={approvalForm.payment_mode}
                  onChange={(e) => setApprovalForm({ ...approvalForm, payment_mode: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                >
                  <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="UPI / Google Pay">UPI / Google Pay / PhonePe</option>
                  <option value="Cash">Cash Handover</option>
                  <option value="Company Card">Company Corporate Card</option>
                </select>
              </div>

              {/* Optional Payment Proof Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Attach Payment Screenshot / Transfer Voucher (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setApprovalForm({
                      ...approvalForm,
                      payment_receipt_file: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-[#56348f] hover:file:bg-purple-100 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Upload transaction proof screenshot so the employee receives it in their email and portal dashboard.
                </p>
              </div>

              {/* Mark as Paid Immediately Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalForm.is_paid}
                  onChange={(e) => setApprovalForm({ ...approvalForm, is_paid: e.target.checked })}
                  className="rounded text-[#56348f] focus:ring-[#56348f]"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Mark as Paid & Disbursed Immediately
                </span>
              </label>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Approval Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approvalForm.approval_notes}
                  onChange={(e) => setApprovalForm({ ...approvalForm, approval_notes: e.target.value })}
                  placeholder="e.g., Approved as per actual distance travelled."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setApprovalModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === approvalModalItem.id}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === approvalModalItem.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Confirm Approval & Send Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 2: REJECT CLAIM
      ══════════════════════════════════════════════════════════════ */}
      {rejectionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>Reject Travel Allowance Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectionModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectionModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === rejectionModalItem.id}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 3: SUPER ADMIN OVERRIDE (Full Edit Authority)
      ══════════════════════════════════════════════════════════════ */}
      {overrideModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#56348f]" />
                  <span>Super Admin Request Override</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Directly adjust claim breakdown items, reason, dates, amounts, payment proof, or status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOverride} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reason */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Travel Purpose / Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={overrideForm.reason}
                    onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                  />
                </div>

                {/* Travel Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Travel Date
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideForm.date_travelled}
                    onChange={(e) => setOverrideForm({ ...overrideForm, date_travelled: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Claim Status
                  </label>
                  <select
                    value={overrideForm.status}
                    onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                  >
                    <option value="Applied">Applied (Pending Review)</option>
                    <option value="Approved">Approved</option>
                    <option value="Paid">Paid & Disbursed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Approved Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Approved Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={overrideForm.approved_amount}
                    onChange={(e) => setOverrideForm({ ...overrideForm, approved_amount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                  />
                </div>

                {/* Receipt Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Receipt / Invoice Number
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={overrideForm.receipt_number}
                    onChange={(e) => setOverrideForm({ ...overrideForm, receipt_number: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                  />
                </div>
              </div>

              {/* Items Breakdown Editor */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Itemized Expenses Breakdown
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOverrideItem}
                    className="text-xs font-bold text-[#56348f] hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {overrideForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const updated = [...overrideForm.items];
                          updated[idx].category = e.target.value;
                          setOverrideForm({ ...overrideForm, items: updated });
                        }}
                        className="w-32 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="Travel">Travel</option>
                        <option value="Food">Food</option>
                        <option value="Accommodation">Accommodation</option>
                        <option value="Other">Other</option>
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => {
                          const updated = [...overrideForm.items];
                          updated[idx].amount = e.target.value;
                          setOverrideForm({ ...overrideForm, items: updated });
                        }}
                        className="w-24 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />

                      <input
                        type="text"
                        placeholder="Description (Optional)"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...overrideForm.items];
                          updated[idx].description = e.target.value;
                          setOverrideForm({ ...overrideForm, items: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveOverrideItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploads Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Replace Employee Bill
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, receipt_file: e.target.files?.[0] || null })
                    }
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Upload/Replace Payment Proof
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setOverrideForm({
                        ...overrideForm,
                        payment_receipt_file: e.target.files?.[0] || null,
                      })
                    }
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700"
                  />
                </div>
              </div>

              {/* Approval Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Admin Remarks
                </label>
                <textarea
                  rows={2}
                  value={overrideForm.approval_notes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, approval_notes: e.target.value })}
                  placeholder="Admin notes..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#56348f]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === overrideModalItem.id}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoadingId === overrideModalItem.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Override</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL 4: OFFICIAL GENERATED RECEIPT VOUCHER VIEW
      ══════════════════════════════════════════════════════════════ */}
      <TAReceiptVoucherModal
        isOpen={!!viewVoucherItem}
        onClose={() => setViewVoucherItem(null)}
        request={viewVoucherItem}
      />
    </div>
  );
}
