"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().min(5, "Please provide a detailed reason"),
});

export default function WfhPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_date: "",
      end_date: "",
      reason: "",
    },
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/wfh-requests");
      setRequests(res.data.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await api.post("/wfh-requests", values);
      form.reset();
      fetchRequests();
      alert("WFH request submitted successfully!");
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1"/> Approved</Badge>;
      case 'Rejected': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Work From Home</h1>
        <p className="text-muted-foreground">Submit and track your WFH requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Apply for WFH</CardTitle>
              <CardDescription>Request remote work days.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem><FormLabel>Start Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem><FormLabel>End Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason/Tasks *</FormLabel>
                      <FormControl><Textarea rows={3} placeholder="What will you be working on?" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Submitting..." : "Submit WFH Request"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-sm h-full">
            <CardHeader>
              <CardTitle>WFH History</CardTitle>
              <CardDescription>Your past and pending remote work requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center">Loading...</div>
              ) : requests.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border rounded-md bg-gray-50/50">You haven't requested any WFH days yet.</div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {requests.map((req) => (
                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="flex items-center text-sm font-medium">
                          <Calendar className="w-4 h-4 mr-2 text-primary" />
                          {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{req.reason}</p>
                      </div>
                      <div className="mt-4 sm:mt-0 flex flex-col items-end gap-2">
                        {getStatusBadge(req.status)}
                        {req.remarks && (
                          <p className="text-xs text-muted-foreground max-w-[200px] text-right truncate">
                            Note: {req.remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
