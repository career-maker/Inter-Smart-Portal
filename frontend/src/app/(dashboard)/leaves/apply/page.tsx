"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  leave_type_id: z.string().min(1, "Please select a leave type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().min(5, "Please provide a detailed reason"),
});

export default function ApplyLeavePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveMetrics, setLeaveMetrics] = useState<any>(null);

  // Super Admin cannot apply for leave
  useEffect(() => {
    if (user?.role === "Super Admin") {
      router.replace("/leaves");
    }
  }, [user, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      reason: "",
    },
  });

  const leaveTypeId = form.watch("leave_type_id");
  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");
  const [impact, setImpact] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (leaveTypeId && startDate && endDate) {
      const fetchImpact = async () => {
        setIsCalculating(true);
        try {
          const res = await api.post("/leaves/calculate", {
            leave_type_id: leaveTypeId,
            start_date: startDate,
            end_date: endDate
          });
          setImpact(res.data);
        } catch (e) {
          console.error(e);
          setImpact(null);
        } finally {
          setIsCalculating(false);
        }
      };
      
      const timeout = setTimeout(fetchImpact, 500);
      return () => clearTimeout(timeout);
    } else {
      setImpact(null);
    }
  }, [leaveTypeId, startDate, endDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const typeRes = await api.get("/leave-types");
        // Ensure leaveTypes is at least an empty array, or mock if missing
        const types = typeRes.data?.data || [];
        if (types.length === 0) {
          // Provide defaults if DB is empty to avoid broken dropdown
          setLeaveTypes([
            { id: 1, name: 'Sick Leave' },
            { id: 2, name: 'Casual Leave' },
            { id: 3, name: 'Work From Home' }
          ]);
        } else {
          setLeaveTypes(types);
        }
      } catch (e) {
        console.error(e);
        // Fallback options
        setLeaveTypes([
          { id: 1, name: 'Sick Leave' },
          { id: 2, name: 'Casual Leave' }
        ]);
      }

      try {
        const dashRes = await api.get("/leave-balances");
        const data = dashRes.data?.data;
        const metrics = data ? {
          sick_leave_balance: data.sick_leave_balance || 0,
          casual_leave_balance: data.casual_leave_balance || 0,
          total_leaves_taken: data.total_leaves_taken || 0
        } : {
          sick_leave_balance: 0,
          casual_leave_balance: 0,
          total_leaves_taken: 0
        };
        setLeaveMetrics(metrics);
      } catch (e) {
        console.error(e);
        // Fallback metrics to ensure the grid always shows
        setLeaveMetrics({
          sick_leave_balance: 0,
          casual_leave_balance: 0,
          total_leaves_taken: 0
        });
      }
    };
    fetchData();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (impact?.is_unpaid) {
      const proceed = window.confirm(`Warning: ${impact.unpaid_reason}\n\nThis leave will be marked as UNPAID. Do you want to proceed anyway?`);
      if (!proceed) return;
    }

    setIsLoading(true);
    try {
      await api.post("/leave-requests", values);
      window.dispatchEvent(new Event('notifications-refresh'));
      router.push("/leaves");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "An error occurred while submitting the request.");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedLeaveType = leaveTypes.find(t => t.id.toString() === leaveTypeId?.toString());
  const isCasualLeave = selectedLeaveType?.name === 'Casual Leave';
  // Use local date instead of UTC to avoid timezone issues
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leaves" className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Apply for Leave</h1>
          <p className="text-slate-300">Submit a time-off request for approval.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto rounded-2xl bg-slate-800/80 border border-white/10 backdrop-blur-md shadow-[8px_8px_24px_rgba(0,0,0,0.4)]">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-xl font-semibold text-white">Leave Application Form</h2>
          <p className="text-slate-400 text-sm mt-1">Your request will be sent to your Team Lead for approval. Ensure you have sufficient balance.</p>
        </div>
        <div className="px-6 pb-6">
          {leaveMetrics && (
            <div className="mb-6 grid grid-cols-3 gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sick Leave</p>
                <p className="text-2xl font-bold text-rose-400">{leaveMetrics.sick_leave_balance}</p>
              </div>
              <div className="text-center border-l border-r border-white/10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Casual Leave</p>
                <p className="text-2xl font-bold text-emerald-400">{leaveMetrics.casual_leave_balance}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Taken</p>
                <p className="text-2xl font-bold text-indigo-400">{leaveMetrics.total_leaves_taken}</p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField control={form.control} name="leave_type_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Leave Type *</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="" disabled className="bg-slate-700 text-slate-400">Select type</option>
                      {leaveTypes.map(t => <option key={t.id} value={t.id.toString()} className="bg-slate-700 text-white">{t.name}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem><FormLabel className="text-slate-300">Start Date *</FormLabel><FormControl><Input type="date" min={isCasualLeave ? todayStr : undefined} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel className="text-slate-300">End Date *</FormLabel><FormControl><Input type="date" min={isCasualLeave ? todayStr : undefined} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Reason *</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Please provide details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              {isCalculating && <p className="text-sm text-slate-400">Calculating leave impact...</p>}
              {impact && (
                <div className={`p-4 rounded-xl border ${impact.is_unpaid ? 'bg-amber-500/15 border-amber-500/30' : 'bg-emerald-500/15 border-emerald-500/30'}`}>
                  <h4 className={`font-semibold flex items-center gap-2 ${impact.is_unpaid ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {impact.is_unpaid && <AlertTriangle className="w-4 h-4" />}
                    Leave Summary
                  </h4>
                  <ul className="mt-2 text-sm text-slate-300 space-y-1">
                    {impact.sandwich_leave_days > 0 ? (
                      <>
                        <li><strong className="text-white">Requested Leave Days:</strong> {impact.requested_working_days ?? (impact.actual_leave_days - impact.sandwich_leave_days)}</li>
                        <li><strong className="text-white">Additional Sandwich Days:</strong> {impact.sandwich_leave_days}</li>
                        <li><strong className="text-white">Total Leave Days:</strong> {impact.actual_leave_days}</li>
                      </>
                    ) : (
                      <li><strong className="text-white">Requested Days:</strong> {impact.actual_leave_days}</li>
                    )}
                    <li><strong className="text-white">Status:</strong> {impact.is_unpaid ? <span className="text-red-400 font-bold">Unpaid (LOP)</span> : <span className="text-emerald-400 font-bold">Paid</span>}</li>
                    {impact.unpaid_reason && <li><strong className="text-white">Reason:</strong> {impact.unpaid_reason}</li>}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
                <button type="button" onClick={() => router.push("/leaves")} className="px-5 py-2 rounded-lg text-sm font-medium text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {isLoading ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
