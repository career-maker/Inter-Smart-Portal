"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Check } from "lucide-react";
import api from "@/services/api";

interface MonthlyReportModalProps {
  employee: any;
  isOpen: boolean;
  onClose: () => void;
}

export function generateEmployeeReportText(empData: any, reportMonth: string): string {
  const workingDays = empData.working_days !== undefined
    ? empData.working_days
    : ((empData.p_count || 0) + (empData.total_leaves || 0) + (empData.wfh_count || 0) + (empData.summary?.absent || 0));

  const monthDate = new Date(reportMonth + "-01");
  const monthName = !isNaN(monthDate.getTime()) ? format(monthDate, "MMMM yyyy") : reportMonth;
  const shortMonth = !isNaN(monthDate.getTime()) ? format(monthDate, "MMMM") : reportMonth;

  const clCount = empData.cl_count || 0;
  const slCount = empData.sl_count || 0;
  const lopCount = empData.lop_count || 0;
  const totalLeaves = empData.total_leaves || 0;
  
  const slBalance = empData.leave_balance?.sick_leave_balance || 0;
  const clBalance = empData.leave_balance?.casual_leave_balance || 0;
  const lateCount = empData.l_count || 0;

  return `Attendance Summary \t${monthName}
No of Working Days : \t${workingDays}
------------------------------\t
Name : \t${empData.first_name} ${empData.last_name}
ID # : \t${empData.employee_code || "—"}
------------------------------\t
Total Leaves - \t${totalLeaves}
* Sick Leave - \t${slCount}
* Casual Leave - \t${clCount}
* UnPaid Leave - \t${lopCount}
SL Balance in ${shortMonth} - \t${slBalance}
CL Balance in ${shortMonth} - \t${clBalance}
* OT - \tNIL
* Late coming Days - \t${lateCount}
Comments : \tLOP not applied for ${lateCount} late comings. 
Please confirm the above data`;
}

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className={className}>
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.981.56 1.761.882 2.79.883h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.769-5.768-5.769zm3.364 8.169c-.14.394-.789.754-1.109.789-.319.036-.723.136-2.383-.553-1.66-.689-2.73-2.383-2.812-2.493-.083-.11-1.002-1.332-1.002-2.54 0-1.209.636-1.802.862-2.046.226-.244.493-.306.657-.306.164 0 .328.001.472.008.152.007.356-.058.556.423.206.495.7 1.706.761 1.83.061.124.102.269.02.433-.082.164-.123.267-.246.41-.123.144-.26.321-.371.431-.123.123-.252.257-.109.503.144.246.638 1.053 1.368 1.704.938.837 1.73 1.096 1.976 1.219.246.123.39-.103.534-.268.144-.164.615-.719.779-.965.164-.246.328-.205.553-.123.226.082 1.436.677 1.682.8.246.123.41.185.472.288.061.103.061.595-.079.989z" />
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.527 3.66 1.443 5.174L2 22l4.981-1.309A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.05c-1.637 0-3.167-.45-4.482-1.233l-.322-.191-2.966.778.792-2.894-.21-.334A8.008 8.008 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8.05-8 8.05z" />
    </svg>
  );
}

export function openWhatsAppReport(phone: string | undefined | null, text: string) {
  const digitsOnly = (phone || "").replace(/[^0-9]/g, "");
  let cleanPhone = digitsOnly;
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = "91" + cleanPhone.slice(1);
  } else if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, "_blank");
}

export function MonthlyReportModal({ employee, isOpen, onClose }: MonthlyReportModalProps) {
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportText, setReportText] = useState("");
  const [rawEmployeeData, setRawEmployeeData] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");

  const handleMonthChange = (val: string) => {
    setReportMonth(val);
    if (val) {
      const d = new Date(val + "-01");
      if (!isNaN(d.getTime())) {
        setStartDate(format(startOfMonth(d), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(d), "yyyy-MM-dd"));
      }
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError("");
      setReportText("");
      setRawEmployeeData(null);
      setIsCopied(false);

      const res = await api.get(`/reports/attendance-summary?start_date=${startDate}&end_date=${endDate}&user_id=${employee.id}`);
      
      const data = res.data;
      if (!data || !data.data || data.data.length === 0) {
        throw new Error("No data found for this employee in the selected date range.");
      }

      const empData = data.data[0];
      setRawEmployeeData(empData);
      const template = generateEmployeeReportText(empData, reportMonth);
      setReportText(template);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleWhatsApp = () => {
    if (!reportText) return;
    const phone = rawEmployeeData?.phone || rawEmployeeData?.contact_number || employee?.phone || employee?.contact_number || "";
    openWhatsAppReport(phone, reportText);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Monthly Leave Report</DialogTitle>
          <DialogDescription>
            Generate an editable text report for {employee?.first_name} {employee?.last_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Month</Label>
              <Input 
                type="month" 
                value={reportMonth} 
                onChange={(e) => handleMonthChange(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Report
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {reportText && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generated Report (Editable)</Label>
                <Textarea 
                  value={reportText} 
                  onChange={(e) => setReportText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm leading-relaxed"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={handleCopy} 
                  className="w-full h-10 inline-flex items-center justify-center font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs gap-2" 
                  disabled={!reportText}
                >
                  {isCopied ? (
                    <><Check className="h-4 w-4 text-emerald-500" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Copy Report</>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={handleWhatsApp} 
                  className="w-full h-10 inline-flex items-center justify-center bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1da851] text-white font-semibold rounded-xl gap-2 border-none shadow-2xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!reportText}
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white shrink-0" /> Send via WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
