"use client";

import { useState, useEffect } from "react";
import { Check, X, Calendar, User } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ApprovalsPage() {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const [leaves, wfh] = await Promise.all([
        api.get("/leave-requests?status=Pending"),
        api.get("/wfh-requests?status=Pending")
      ]);
      setLeaveRequests(leaves.data.data.data);
      setWfhRequests(wfh.data.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (type: 'leave' | 'wfh', id: number, status: 'Approved' | 'Rejected') => {
    try {
      let reason = "Approved by Team Lead";
      if (status === 'Rejected') {
        const input = window.prompt("Please enter a reason for rejection (Required):");
        if (input === null) return; // User cancelled
        if (input.trim() === "") {
          alert("A rejection reason is mandatory.");
          return;
        }
        reason = input.trim();
      }

      const endpoint = type === 'leave' ? `/leave-requests/${id}/status` : `/wfh-requests/${id}/status`;
      await api.post(endpoint, { 
        status, 
        rejection_reason: type === 'leave' ? reason : undefined,
        remarks: type === 'wfh' ? reason : undefined
      });
      // Refresh the lists
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error processing request");
    }
  };

  const RequestCard = ({ req, type }: { req: any, type: 'leave' | 'wfh' }) => (
    <Card className="shadow-sm border-l-4 border-l-primary">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10 mt-1">
              <AvatarImage src={req.user?.profile_photo_path} alt={req.user?.first_name} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{req.user?.first_name} {req.user?.last_name}</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4">
                {type === 'leave' && <span><span className="font-medium text-foreground">Type:</span> {req.leave_type?.name}</span>}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                </span>
                {type === 'leave' && <span>({req.days} days)</span>}
              </div>
              <p className="text-sm mt-3 bg-gray-50 p-3 rounded border">
                <span className="font-medium text-xs text-muted-foreground block mb-1">REASON</span>
                {req.reason}
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <Button variant="outline" className="flex-1 md:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => handleAction(type, req.id, 'Rejected')}>
              <X className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(type, req.id, 'Approved')}>
              <Check className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals Queue</h1>
        <p className="text-muted-foreground">Review and process pending leave and WFH requests from your team.</p>
      </div>

      <Tabs defaultValue="leaves" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="leaves">Leave Requests ({leaveRequests.length})</TabsTrigger>
          <TabsTrigger value="wfh">WFH Requests ({wfhRequests.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leaves" className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : leaveRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending leave requests.</CardContent></Card>
          ) : (
            leaveRequests.map(req => <RequestCard key={req.id} req={req} type="leave" />)
          )}
        </TabsContent>

        <TabsContent value="wfh" className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : wfhRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending WFH requests.</CardContent></Card>
          ) : (
            wfhRequests.map(req => <RequestCard key={req.id} req={req} type="wfh" />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
