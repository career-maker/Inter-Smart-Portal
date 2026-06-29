"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import api from "@/services/api";

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
  const [isLoading, setIsLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveMetrics, setLeaveMetrics] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      reason: "",
    },
  });

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
        const dashRes = await api.get("/dashboard");
        // Make absolutely sure leaveMetrics is truthy, fallback to 0s
        const metrics = dashRes.data?.leave_metrics || {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leaves">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apply for Leave</h1>
          <p className="text-muted-foreground">Submit a time-off request for approval.</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle>Leave Application Form</CardTitle>
          <CardDescription>Your request will be sent to your Team Lead for approval. Ensure you have sufficient balance.</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveMetrics && (
            <div className="mb-6 grid grid-cols-3 gap-4 bg-gray-50/50 border rounded-xl p-4">
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
                  <FormItem><FormLabel>Start Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel>End Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Please provide details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

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
