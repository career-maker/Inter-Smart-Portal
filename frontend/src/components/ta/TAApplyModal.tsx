"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

export function TAApplyModal({ isOpen, onClose, onSuccess }: TAApplyModalProps) {
  const [reason, setReason] = useState("");
  const [dateTravelled, setDateTravelled] = useState("");
  const [items, setItems] = useState<TAItem[]>([
    { category: "Travel", amount: 0, description: "" },
  ]);
  const [billLink, setBillLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleAddItem = () => {
    setItems([...items, { category: "Travel", amount: 0, description: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (
    index: number,
    field: string,
    value: any
  ) => {
    const newItems = [...items];
    if (field === "amount") {
      newItems[index].amount = parseFloat(value) || 0;
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload: any = {
        reason,
        date_travelled: dateTravelled,
        items: items.map(item => ({
          category: item.category,
          amount: item.amount,
          description: item.description || null,
        })),
      };

      if (billLink) {
        payload.bill_link = billLink;
      }

      await api.post("/ta-requests", payload);

      setReason("");
      setDateTravelled("");
      setItems([{ category: "Travel", amount: 0, description: "" }]);
      setBillLink("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit TA request");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-white/10 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900">
          <h2 className="text-2xl font-bold">Apply for Travel Allowance</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">
              Reason for Travel <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the purpose of your travel..."
              required
              className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={3}
            />
          </div>

          {/* Date Travelled */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">
              Date of Travel <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={dateTravelled}
              onChange={(e) => setDateTravelled(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
            />
          </div>

          {/* Expense Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">
                Expense Breakdown
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-1">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        handleItemChange(index, "category", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option>Travel</option>
                      <option>Food</option>
                      <option>Accommodation</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) =>
                        handleItemChange(index, "amount", e.target.value)
                      }
                      placeholder="Amount"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:bg-slate-700 disabled:cursor-not-allowed text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Amount */}
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-300">
                Total Amount:{" "}
                <span className="text-2xl font-bold text-amber-400">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </p>
            </div>
          </div>

          {/* Bill Link */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-300">
              Bill/Receipt Link (Optional)
            </label>
            <input
              type="url"
              value={billLink}
              onChange={(e) => setBillLink(e.target.value)}
              placeholder="https://drive.google.com/... or https://example.com/bill"
              className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-xs text-slate-400 mt-1">
              Provide a direct link to your bill or receipt (Google Drive, OneDrive, etc.)
            </p>
            {billLink && (
              <p className="text-sm text-emerald-400 mt-2">
                ✓ Link added: {billLink}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg font-semibold text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason || !dateTravelled || totalAmount === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
