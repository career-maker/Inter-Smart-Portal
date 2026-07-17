"use client";

import { useState, useEffect } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardEdit, CheckCircle, XCircle } from "lucide-react";

export default function ProfileRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await api.get("/profile-requests");
      setRequests(response.data.data);
    } catch (error) {
      alert("Failed to load profile requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    setProcessing(id);
    try {
      await api.post(`/profile-requests/${id}/approve`);
      alert("Request approved and profile updated");
      setRequests(requests.filter(r => r.id !== id));
    } catch (error) {
      alert("Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessing(id);
    try {
      await api.post(`/profile-requests/${id}/reject`);
      alert("Request rejected");
      setRequests(requests.filter(r => r.id !== id));
    } catch (error) {
      alert("Failed to reject request");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <ClipboardEdit className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Profile Edit Approvals</h1>
          <p className="text-slate-600 dark:text-slate-300">Review and approve employee profile updates.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">All caught up!</p>
            <p>No pending profile update requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <Card key={req.id} className="shadow-sm">
              <CardHeader className="pb-3 border-b bg-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={req.user?.profile_photo_path || "https://ui-avatars.com/api/?name=" + req.user?.first_name} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <CardTitle className="text-base">{req.user?.first_name} {req.user?.last_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{req.user?.email} • ID: {req.user?.employee_id}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Requested: {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Requested Changes</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 mb-6">
                  {Object.entries(req.requested_data).map(([key, val]) => (
                    <div key={key} className="bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                      <div className="text-xs text-muted-foreground capitalize mb-1">{key.replace('_', ' ')}</div>
                      <div className="font-medium">{String(val) || <span className="text-gray-400 italic">Empty</span>}</div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-2 border-t mt-2">
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(req.id)}
                    disabled={processing !== null}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(req.id)}
                    disabled={processing !== null}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {processing === req.id ? "Processing..." : "Approve Update"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
