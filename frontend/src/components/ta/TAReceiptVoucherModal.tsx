"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  X,
  Download,
  Printer,
  Receipt,
  Car,
  Utensils,
  Hotel,
  HelpCircle,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  CreditCard,
  FileCheck2,
  Loader2,
} from "lucide-react";

interface TAItem {
  id?: number;
  category: string;
  amount: number | string;
  description?: string | null;
}

interface TAReceiptVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: number;
    receipt_number?: string | null;
    reason: string;
    date_travelled: string;
    created_at?: string;
    status: string;
    is_paid?: boolean;
    payment_mode?: string | null;
    total_amount: number | string;
    approved_amount?: number | string | null;
    approval_notes?: string | null;
    approver?: { first_name: string; last_name: string } | null;
    user?: {
      first_name: string;
      last_name?: string;
      employee_code?: string;
      designation?: string;
      email?: string;
    } | null;
    items?: TAItem[];
  } | null;
  currentUser?: any;
}

const CATEGORY_ICONS: Record<string, any> = {
  Travel: Car,
  Food: Utensils,
  Accommodation: Hotel,
  Other: HelpCircle,
};

export function TAReceiptVoucherModal({
  isOpen,
  onClose,
  request,
  currentUser,
}: TAReceiptVoucherModalProps) {
  const voucherRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !request) return null;

  const empName = request.user
    ? `${request.user.first_name} ${request.user.last_name || ""}`.trim()
    : currentUser
    ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || currentUser.name
    : "Employee";

  const empCode = request.user?.employee_code || currentUser?.employee_code || "EMP";
  const empDesignation = request.user?.designation || currentUser?.designation || "Team Member";

  const receiptNo =
    request.receipt_number ||
    `TA-REC-${new Date().getFullYear()}-${String(request.id).padStart(5, "0")}`;

  const approvedAmt = request.approved_amount !== null && request.approved_amount !== undefined
    ? Number(request.approved_amount)
    : Number(request.total_amount);

  const formattedTravelDate = (() => {
    try {
      return format(parseISO(request.date_travelled), "dd MMMM yyyy");
    } catch {
      return request.date_travelled;
    }
  })();

  const formattedIssueDate = (() => {
    try {
      return format(request.created_at ? parseISO(request.created_at) : new Date(), "dd MMM yyyy, hh:mm a");
    } catch {
      return format(new Date(), "dd MMM yyyy");
    }
  })();

  const handleDownloadImage = async () => {
    if (!voucherRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `TA_Receipt_${receiptNo}_${empName.replace(/\s+/g, "_")}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate voucher image:", err);
      alert("Failed to export receipt image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        style={{
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden"
      >
        {/* Modal Top Actions Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Official Travel Allowance Bill Receipt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloading}
              style={{
                backgroundColor: "#56348f",
                color: "#ffffff",
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#56348f] hover:bg-[#462875] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Image</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable & Exportable Voucher Content */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          <div
            ref={voucherRef}
            className="p-6 sm:p-8 rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-sm space-y-6"
            style={{
              fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              backgroundColor: "#ffffff",
              color: "#0f172a",
            }}
          >
            {/* Header: Company Logo & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#56348f] text-white flex items-center justify-center font-black text-sm">
                    IS
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-[#56348f]">
                      INTER SMART
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      Perfection At Its Finest
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Inter Smart Workplace Portal • Travel Expense Reimbursement
                </p>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="inline-block px-2.5 py-1 rounded-md bg-purple-50 text-[#56348f] font-mono font-bold text-xs border border-purple-200">
                  {receiptNo}
                </span>
                <p className="text-[10px] text-slate-400 font-medium">
                  Issued: {formattedIssueDate}
                </p>
              </div>
            </div>

            {/* Title Banner */}
            <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-700">
                Official Travel Allowance Reimbursement Receipt
              </h3>
            </div>

            {/* Employee & Travel Meta Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Employee Name
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {empName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {empCode} • {empDesignation}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Date Travelled
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {formattedTravelDate}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Claim Purpose
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate" title={request.reason}>
                  {request.reason}
                </span>
              </div>
            </div>

            {/* Itemized Expenses Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Itemized Expenses Breakdown
              </span>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Description / Details</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(request.items && request.items.length > 0
                      ? request.items
                      : [{ category: "Travel", amount: request.total_amount, description: request.reason }]
                    ).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {item.description || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                          ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                      <td colSpan={3} className="py-2.5 px-4 text-right text-slate-600">
                        Total Claimed Amount:
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-900 font-mono">
                        ₹{Number(request.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Approved & Settlement Box */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                  Final Approved Disbursement
                </span>
                <div className="text-2xl font-black text-[#56348f] mt-0.5">
                  ₹{approvedAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {request.approval_notes && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong className="text-slate-700">Approval Note:</strong> {request.approval_notes}
                  </p>
                )}
              </div>

              <div className="sm:text-right space-y-1">
                {request.is_paid || request.status === "Paid" ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Paid & Disbursed ({request.payment_mode || "Bank Transfer"})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Claim Approved</span>
                  </span>
                )}
                {request.approver && (
                  <p className="text-[10px] text-slate-400">
                    Approved by {request.approver.first_name} {request.approver.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* Footer Sign-off */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 gap-2">
              <div className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Computer-generated official receipt voucher. No physical signature required.</span>
              </div>
              <span className="font-mono text-slate-500">Inter Smart Workplace Portal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
