"use client";

import { useState, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Receipt,
  Car,
  Utensils,
  Hotel,
  HelpCircle,
  IndianRupee,
  Calendar,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  UploadCloud,
  Image as ImageIcon,
  FileCheck,
} from "lucide-react";
import api from "@/services/api";

interface TAItem {
  category: string;
  amount: number;
  description?: string;
}

interface TAApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  Travel: Car,
  Food: Utensils,
  Accommodation: Hotel,
  Other: HelpCircle,
};

export function TAApplyModal({ isOpen, onClose, onSuccess }: TAApplyModalProps) {
  const [reason, setReason] = useState("");
  const [dateTravelled, setDateTravelled] = useState("");
  const [items, setItems] = useState<TAItem[]>([
    { category: "Travel", amount: 0, description: "" },
  ]);
  const [billLink, setBillLink] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { category: "Travel", amount: 0, description: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === "amount") {
      newItems[index].amount = parseFloat(value) || 0;
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Receipt file size cannot exceed 10MB");
      return;
    }

    setReceiptFile(file);
    setError(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("reason", reason.trim());
      formData.append("date_travelled", dateTravelled);
      formData.append(
        "items",
        JSON.stringify(
          items.map((item) => ({
            category: item.category,
            amount: Number(item.amount) || 0,
            description: item.description?.trim() || null,
          }))
        )
      );

      if (billLink.trim()) {
        formData.append("bill_link", billLink.trim());
      }

      if (receiptFile) {
        formData.append("receipt_file", receiptFile);
      }

      await api.post("/ta-requests", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setReason("");
      setDateTravelled("");
      setItems([{ category: "Travel", amount: 0, description: "" }]);
      setBillLink("");
      handleRemoveFile();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("TA submit error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to submit travel allowance request. Please verify all inputs."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Side Drawer Popup */}
      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="relative p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/70 via-white to-white dark:from-slate-850 dark:to-slate-900">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#56348f] to-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Apply for Travel Allowance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Submit expense claims for official business travel
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Reason for Travel */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Reason for Travel <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the official purpose or destination of your travel..."
                required
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-600 dark:focus:border-purple-500 transition-all resize-none shadow-xs"
              />
            </div>
          </div>

          {/* Date of Travel */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Date of Travel <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateTravelled}
                onChange={(e) => setDateTravelled(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-600 dark:focus:border-purple-500 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                  Expense Breakdown <span className="text-rose-500">*</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors border border-purple-200/60 dark:border-purple-800/40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.category}
                        onChange={(e) => handleItemChange(index, "category", e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-xs"
                      >
                        <option value="Travel">🚗 Travel (Flight, Train, Cab)</option>
                        <option value="Food">🍽️ Food & Meals</option>
                        <option value="Accommodation">🏨 Hotel & Lodging</option>
                        <option value="Other">💼 Other / Miscellaneous</option>
                      </select>
                    </div>

                    <div className="w-32 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={item.amount > 0 ? item.amount : ""}
                        onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                        className="w-full pl-6 pr-2.5 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    placeholder="Optional note (e.g., Kochi to Bangalore cab fare)..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              ))}
            </div>

            {/* Total Calculation Banner */}
            <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 dark:from-purple-950/30 dark:via-slate-850 dark:to-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 rounded-xl flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                Total Claim Amount
              </span>
              <span className="text-lg sm:text-xl font-bold text-[#56348f] dark:text-purple-300">
                ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Upload Receipt Photo / Document */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Upload Receipt Photo / Document <span className="text-slate-400 font-normal">(Recommended)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {!receiptFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 group"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-1.5" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  Click to upload bill photo or PDF
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports JPG, PNG, WEBP, PDF (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="p-3 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {receiptPreview ? (
                    <img
                      src={receiptPreview}
                      alt="Receipt Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-purple-200 dark:border-purple-700 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {receiptFile.name}
                    </p>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      {(receiptFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Or External Cloud Link */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Or External Cloud Link <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="url"
                value={billLink}
                onChange={(e) => setBillLink(e.target.value)}
                placeholder="https://drive.google.com/... or OneDrive link"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-600 dark:focus:border-purple-500 transition-all shadow-xs"
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-750 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim() || !dateTravelled || totalAmount <= 0}
            style={{
              backgroundColor: "#56348f",
              color: "rgb(255, 255, 255)",
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#56348f] hover:bg-[#462875] disabled:opacity-50 disabled:cursor-not-allowed !text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin !text-white" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 !text-white" />
                <span>Submit TA Request</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
