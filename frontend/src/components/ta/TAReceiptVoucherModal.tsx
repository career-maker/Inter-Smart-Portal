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

  const itemsList: TAItem[] = request.items && request.items.length > 0
    ? request.items
    : [{ category: "Travel", amount: request.total_amount, description: request.reason }];

  /**
   * Generates high-resolution PNG receipt on an HTML5 canvas directly
   * Guarantees 100% compatibility across all browsers and CSS engine versions
   */
  const exportReceiptCanvas = (): string => {
    const width = 1600;
    const height = 1800 + (itemsList.length * 70);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // Enable high quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 1. Outer Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // 2. Main Card Background
    const margin = 50;
    const cardW = width - (margin * 2);
    const cardH = height - (margin * 2);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(margin, margin, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    const startX = margin + 50;
    const endX = margin + cardW - 50;
    let currY = margin + 60;

    // 3. Top Header: Logo & Title
    // IS Purple Box
    ctx.fillStyle = "#56348f";
    ctx.beginPath();
    ctx.roundRect(startX, currY, 60, 60, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Proxima Nova', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IS", startX + 30, currY + 41);

    // Company Name
    ctx.textAlign = "left";
    ctx.fillStyle = "#56348f";
    ctx.font = "bold 32px 'Proxima Nova', sans-serif";
    ctx.fillText("INTER SMART", startX + 75, currY + 30);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 14px 'Proxima Nova', sans-serif";
    ctx.fillText("PERFECTION AT ITS FINEST", startX + 75, currY + 52);

    // Right Header: Receipt Badge & Issue Date
    ctx.textAlign = "right";
    ctx.fillStyle = "#f3e8ff";
    ctx.strokeStyle = "#d8b4fe";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(endX - 280, currY, 280, 42, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#56348f";
    ctx.font = "bold 20px monospace";
    ctx.fillText(receiptNo, endX - 15, currY + 28);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px 'Proxima Nova', sans-serif";
    ctx.fillText(`Issued: ${formattedIssueDate}`, endX, currY + 68);

    currY += 95;

    // Subtitle under logo
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "16px 'Proxima Nova', sans-serif";
    ctx.fillText("Inter Smart Workplace Portal • Travel Expense Reimbursement", startX, currY);

    currY += 25;

    // Divider
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, currY);
    ctx.lineTo(endX, currY);
    ctx.stroke();

    currY += 30;

    // 4. Banner Title Box
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX, currY, endX - startX, 50, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#334155";
    ctx.font = "bold 18px 'Proxima Nova', sans-serif";
    ctx.fillText("OFFICIAL TRAVEL ALLOWANCE REIMBURSEMENT RECEIPT", startX + (endX - startX) / 2, currY + 32);

    currY += 75;

    // 5. Employee & Trip Metadata Box
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX, currY, endX - startX, 110, 16);
    ctx.fill();
    ctx.stroke();

    const col1 = startX + 30;
    const col2 = startX + (endX - startX) * 0.42;
    const col3 = startX + (endX - startX) * 0.72;

    // Col 1: Employee
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px 'Proxima Nova', sans-serif";
    ctx.fillText("EMPLOYEE NAME", col1, currY + 32);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px 'Proxima Nova', sans-serif";
    ctx.fillText(empName, col1, currY + 62);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px monospace";
    ctx.fillText(`${empCode} • ${empDesignation}`, col1, currY + 86);

    // Col 2: Date Travelled
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px 'Proxima Nova', sans-serif";
    ctx.fillText("DATE TRAVELLED", col2, currY + 32);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px 'Proxima Nova', sans-serif";
    ctx.fillText(formattedTravelDate, col2, currY + 62);

    // Col 3: Purpose
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px 'Proxima Nova', sans-serif";
    ctx.fillText("CLAIM PURPOSE", col3, currY + 32);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px 'Proxima Nova', sans-serif";
    ctx.fillText(request.reason.length > 22 ? request.reason.slice(0, 20) + "…" : request.reason, col3, currY + 62);

    currY += 140;

    // 6. Itemized Expenses Breakdown Table
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 14px 'Proxima Nova', sans-serif";
    ctx.fillText("ITEMIZED EXPENSES BREAKDOWN", startX, currY);

    currY += 15;

    const tableW = endX - startX;
    const rowH = 50;

    // Table Header
    ctx.fillStyle = "#f1f5f9";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX, currY, tableW, 44, [10, 10, 0, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "bold 14px 'Proxima Nova', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("#", startX + 40, currY + 28);

    ctx.textAlign = "left";
    ctx.fillText("CATEGORY", startX + 90, currY + 28);
    ctx.fillText("DESCRIPTION / DETAILS", startX + 380, currY + 28);

    ctx.textAlign = "right";
    ctx.fillText("AMOUNT (INR)", endX - 30, currY + 28);

    currY += 44;

    // Table Rows
    itemsList.forEach((item, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(startX, currY, tableW, rowH);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, currY + rowH);
      ctx.lineTo(endX, currY + rowH);
      ctx.stroke();

      // Index
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(idx + 1), startX + 40, currY + 32);

      // Category
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 17px 'Proxima Nova', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item.category, startX + 90, currY + 32);

      // Description
      ctx.fillStyle = "#475569";
      ctx.font = "15px 'Proxima Nova', sans-serif";
      ctx.fillText(item.description || "—", startX + 380, currY + 32);

      // Amount
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`₹${Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, endX - 30, currY + 32);

      currY += rowH;
    });

    // Table Total Footer Row
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX, currY, tableW, 50, [0, 0, 10, 10]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "bold 16px 'Proxima Nova', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Total Claimed Amount:", endX - 250, currY + 32);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`₹${Number(request.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, endX - 30, currY + 32);

    currY += 80;

    // 7. Approved & Settlement Box
    ctx.fillStyle = "#faf5ff";
    ctx.strokeStyle = "#d8b4fe";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX, currY, tableW, 130, 16);
    ctx.fill();
    ctx.stroke();

    // Left side: Approved Amount
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b21a8";
    ctx.font = "bold 14px 'Proxima Nova', sans-serif";
    ctx.fillText("FINAL APPROVED DISBURSEMENT", startX + 30, currY + 36);

    ctx.fillStyle = "#56348f";
    ctx.font = "bold 38px 'Proxima Nova', sans-serif";
    ctx.fillText(`₹${approvedAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + 30, currY + 84);

    if (request.approval_notes) {
      ctx.fillStyle = "#475569";
      ctx.font = "14px 'Proxima Nova', sans-serif";
      ctx.fillText(`Approval Note: ${request.approval_notes}`, startX + 30, currY + 112);
    }

    // Right side: Badge
    ctx.textAlign = "right";
    const isPaid = request.is_paid || request.status === "Paid";
    const badgeText = isPaid
      ? `✓ Paid & Disbursed (${request.payment_mode || "Bank Transfer"})`
      : "✓ Claim Approved";

    const badgeW = 320;
    const badgeH = 40;
    const badgeX = endX - badgeW - 30;
    const badgeY = currY + 32;

    ctx.fillStyle = isPaid ? "#dcfce7" : "#f3e8ff";
    ctx.strokeStyle = isPaid ? "#86efac" : "#d8b4fe";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isPaid ? "#15803d" : "#7e22ce";
    ctx.font = "bold 15px 'Proxima Nova', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 26);

    if (request.approver) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#64748b";
      ctx.font = "13px 'Proxima Nova', sans-serif";
      ctx.fillText(`Approved by: ${request.approver.first_name} ${request.approver.last_name}`, endX - 30, currY + 98);
    }

    currY += 160;

    // 8. Footer Sign-off
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, currY);
    ctx.lineTo(endX, currY);
    ctx.stroke();

    currY += 28;

    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "13px 'Proxima Nova', sans-serif";
    ctx.fillText("✓ Computer-generated official receipt voucher. No physical signature required.", startX, currY);

    ctx.textAlign = "right";
    ctx.fillStyle = "#475569";
    ctx.font = "bold 13px 'Proxima Nova', sans-serif";
    ctx.fillText("Inter Smart Workplace Portal", endX, currY);

    return canvas.toDataURL("image/png");
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      // 1. Primary: Ultra-reliable high-resolution Canvas renderer
      const dataUrl = exportReceiptCanvas();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `TA_Receipt_${receiptNo}_${empName.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Canvas export failed, falling back:", err);
      // 2. Fallback: Standard print dialog
      window.print();
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
              <span>Download Image (PNG)</span>
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

        {/* Printable & Preview Voucher Content */}
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
                    {itemsList.map((item, idx) => (
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
