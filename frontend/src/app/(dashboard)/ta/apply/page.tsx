"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Car, Utensils, Hotel, HelpCircle, ShieldCheck, Banknote, Sparkles } from "lucide-react";
import { TAApplyModal } from "@/components/ta/TAApplyModal";

export default function TAApplyPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      router.push("/ta/status");
    }, 2000);
  };

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
            Apply for Travel Allowance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Submit expense claims for official business travel with itemized receipt breakdown.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: "#56348f",
            color: "rgb(255, 255, 255)",
          }}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-[#56348f] hover:bg-[#462875] rounded-xl font-bold !text-white text-sm shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5 !text-white" />
          <span>New TA Request</span>
        </button>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold">
            Travel allowance request submitted successfully! Redirecting to tracking status...
          </p>
        </div>
      )}

      {/* Two Column Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* How It Works */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>How the Process Works</span>
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex gap-3.5 items-start">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200 dark:border-purple-800/60">
                1
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Submit Travel Claim</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter trip purpose, travel date, and add your itemized expenses.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200 dark:border-purple-800/60">
                2
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Admin & Lead Review</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Super Admin or Finance lead reviews the breakdown and attached receipts.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#56348f] dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200 dark:border-purple-800/60">
                3
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Direct Disbursement</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Upon approval, reimbursement is processed through accounts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Categories */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Eligible Expense Categories</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Travel</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Cab, train, flight, bus</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Food & Meals</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Official trip dining</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Hotel className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Stay & Lodging</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Hotel accommodation</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Other Expenses</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Tolls, parking, incidental</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TA Apply Drawer */}
      <TAApplyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
