"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Apply for Travel Allowance
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Submit your travel allowance request with detailed expense breakdown
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 flex items-center gap-3 text-emerald-300">
          <CheckCircle className="w-5 h-5" />
          <p>Travel allowance request submitted successfully! Redirecting...</p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-700 bg-slate-800/50 text-white">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-xs">
                1
              </div>
              <div>
                <p className="font-semibold text-white">Submit Request</p>
                <p>Fill in the form with travel details and expenses</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-xs">
                2
              </div>
              <div>
                <p className="font-semibold text-white">Admin Review</p>
                <p>Super admin will review and approve your request</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-xs">
                3
              </div>
              <div>
                <p className="font-semibold text-white">Get Paid</p>
                <p>Once approved, your allowance will be processed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span><strong>Travel:</strong> Transport, taxi, flights</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span><strong>Food:</strong> Meals during travel</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                <span><strong>Accommodation:</strong> Hotel, lodging</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                <span><strong>Other:</strong> Miscellaneous expenses</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg font-semibold text-white text-lg shadow-lg transition-all transform hover:scale-105"
        >
          <Plus className="w-6 h-6" />
          New Travel Allowance Request
        </button>
      </div>

      {/* TA Apply Modal */}
      <TAApplyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
