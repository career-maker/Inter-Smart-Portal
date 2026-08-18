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

export function MonthlyReportModal({ employee, isOpen, onClose }: MonthlyReportModalProps) {
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError("");
      setReportText("");
      setIsCopied(false);

      const res = await api.get(`/reports/attendance-summary?start_date=${startDate}&end_date=${endDate}&user_id=${employee.id}`);
      
      const data = res.data;
      if (!data || !data.data || data.data.length === 0) {
        throw new Error("No data found for this employee in the selected date range.");
      }

      const empData = data.data[0];
      
      const workingDays = (empData.p_count || 0) + (empData.total_leaves || 0) + (empData.wfh_count || 0) + (empData.summary?.absent || 0);

      const monthName = format(new Date(reportMonth + "-01"), "MMMM yyyy");
      const shortMonth = format(new Date(reportMonth + "-01"), "MMMM");

      const clCount = empData.cl_count || 0;
      const slCount = empData.sl_count || 0;
      const lopCount = empData.lop_count || 0;
      const totalLeaves = empData.total_leaves || 0;
      
      const slBalance = empData.leave_balance?.sick_leave_balance || 0;
      const clBalance = empData.leave_balance?.casual_leave_balance || 0;
      const lateCount = empData.l_count || 0;

      const template = `Attendance Summary \t${monthName}
No of Working Days : \t${workingDays}
------------------------------\t
Name : \t${empData.first_name} ${empData.last_name}
ID # : \t${empData.employee_code}
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col">
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
                onChange={(e) => setReportMonth(e.target.value)} 
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
              <Button onClick={handleCopy} variant="outline" className="w-full" disabled={!reportText}>
                {isCopied ? (
                  <><Check className="mr-2 h-4 w-4 text-emerald-500" /> Copied!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Copy Message</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
