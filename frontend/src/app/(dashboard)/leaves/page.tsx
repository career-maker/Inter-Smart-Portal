"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LeavesPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [balRes, reqRes] = await Promise.all([
        api.get("/leave-balances"),
        api.get("/leave-requests")
      ]);
      
      const balanceData = balRes.data.data;
      if (balanceData) {
        setBalances([
          {
            id: 1,
            leave_type: { name: 'Casual Leave' },
            total_days: 12, // standard annual allowance
            used_days: 12 - (balanceData.casual_leave_balance || 0)
          },
          {
            id: 2,
            leave_type: { name: 'Sick Leave' },
            total_days: 12,
            used_days: 12 - (balanceData.sick_leave_balance || 0)
          }
        ]);
      } else {
        setBalances([
          { id: 1, leave_type: { name: 'Casual Leave' }, total_days: 12, used_days: 0 },
          { id: 2, leave_type: { name: 'Sick Leave' }, total_days: 12, used_days: 0 }
        ]);
      }

      setRequests(reqRes.data.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (req: any) => {
    if (req.status === 'Approved') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1"/> Approved</Badge>;
    if (req.status === 'Rejected') return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>;
    
    let pendingText = 'Pending';
    if (req.tl_status === 'Pending') {
      pendingText = 'Pending TL Approval';
    } else if (req.admin_status === 'Pending') {
      pendingText = 'Pending Admin Approval';
    }
    
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1"/> {pendingText}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Leave Management</h1>
          <p className="text-slate-300">View your balances and apply for time off.</p>
        </div>
        <Button onClick={() => router.push("/leaves/apply")}>
          <Plus className="mr-2 h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balances.map((balance) => (
          <Card key={balance.id} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{balance.leave_type.name}</CardTitle>
              <CardDescription>Annual Allowance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <span className="text-4xl font-bold">{balance.total_days - balance.used_days}</span>
                  <span className="text-muted-foreground ml-2">Remaining</span>
                </div>
                <div className="text-sm text-muted-foreground text-right">
                  <div>Total: {balance.total_days}</div>
                  <div>Used: {balance.used_days}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Leave Requests</CardTitle>
          <CardDescription>Your history of time-off requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-4 text-center">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">You haven't requested any leaves yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Days</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{req.leave_type?.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">{req.days} Day(s)</td>
                      <td className="px-6 py-4 max-w-[200px] truncate">{req.reason}</td>
                      <td className="px-6 py-4">{getStatusBadge(req)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
