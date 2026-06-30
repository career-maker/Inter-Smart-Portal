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

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
        <Link href="/leaves">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Apply for Leave</h1>
          <p className="text-slate-300">Submit a time-off request for approval.</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle>Leave Application Form</CardTitle>
          <CardDescription>Your request will be sent to your Team Lead for approval. Ensure you have sufficient balance.</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveMetrics && (
            <div className="mb-6 grid grid-cols-3 gap-4 bg-white/5 border-white/10 border rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sick Leave</p>
                <p className="text-2xl font-bold text-rose-600">{leaveMetrics.sick_leave_balance}</p>
              </div>
              <div className="text-center border-l border-r border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Casual Leave</p>
                <p className="text-2xl font-bold text-emerald-600">{leaveMetrics.casual_leave_balance}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Taken</p>
                <p className="text-2xl font-bold text-indigo-600">{leaveMetrics.total_leaves_taken}</p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField control={form.control} name="leave_type_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type *</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="" disabled>Select type</option>
                      {leaveTypes.map(t => <option key={t.id} value={t.id.toString()}>{t.name}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem><FormLabel>Start Date *</FormLabel><FormControl><Input type="date" min={isCasualLeave ? todayStr : undefined} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel>End Date *</FormLabel><FormControl><Input type="date" min={isCasualLeave ? todayStr : undefined} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Please provide details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              {isCalculating && <p className="text-sm text-gray-500">Calculating leave impact...</p>}
              {impact && (
                <div className={`p-4 rounded-md border ${impact.is_unpaid ? 'bg-amber-500/20 border-amber-500/30 text-amber-200' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'}`}>
                  <h4 className={`font-semibold flex items-center gap-2 ${impact.is_unpaid ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {impact.is_unpaid && <AlertTriangle className="w-4 h-4" />}
                    Leave Summary
                  </h4>
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    <li><strong>Requested Days:</strong> {impact.actual_leave_days}</li>
                    {impact.sandwich_leave_days > 0 && <li><strong>Sandwich Days:</strong> {impact.sandwich_leave_days}</li>}
                    <li><strong>Status:</strong> {impact.is_unpaid ? <span className="text-red-600 font-bold">Unpaid (LWP)</span> : <span className="text-emerald-600 font-bold">Paid</span>}</li>
                    {impact.unpaid_reason && <li><strong>Reason:</strong> {impact.unpaid_reason}</li>}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-4 border-t pt-6">
                <Button type="button" variant="outline" onClick={() => router.push("/leaves")}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? "Submitting..." : "Submit for Approval"}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
