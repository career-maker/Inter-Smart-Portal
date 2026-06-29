"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, Plus, Upload, Download, Clock, CheckCircle, X, Loader2
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const DOCUMENT_TYPES = [
  "Salary Certificate",
  "Experience Certificate",
  "Employment Certificate",
  "Visa Support Letter",
  "Offer Letter Copy",
  "Appointment Letter Copy",
  "Relieving Letter",
  "Increment Letter",
  "Custom Request",
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8002";

export default function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "Super Admin" || user?.role === "HR";

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New request form
  const [subject, setSubject] = useState("");
  const [docType, setDocType] = useState("");
  const [description, setDescription] = useState("");

  // Upload form
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const [uploadComment, setUploadComment] = useState("");

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/document-requests");
      setRequests(res.data.data.data || res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!subject && !docType) return;
    setActionLoading(true);
    try {
      await api.post("/document-requests", {
        subject: docType === "Custom Request" ? subject : docType,
        description,
      });
      setShowRequestDialog(false);
      setSubject(""); setDocType(""); setDescription("");
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error submitting request.");
    } finally {
      setActionLoading(false);
    }
  };

  const uploadDocument = async () => {
    const file = uploadFileRef.current?.files?.[0];
    if (!file || !showUploadDialog) return;
    setActionLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("comments", uploadComment);
    try {
      await api.post(`/document-requests/${showUploadDialog.id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadDialog(null);
      setUploadComment("");
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || "Upload failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "Uploaded")
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Uploaded</Badge>;
    return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Requests</h1>
          <p className="text-muted-foreground">Request official documents from HR.</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Request Document
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No document requests yet.</p>
            <Button variant="outline" onClick={() => setShowRequestDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Make your first request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <tr>
                {isAdmin && <th className="px-4 py-3 text-left">Employee</th>}
                <th className="px-4 py-3 text-left">Request No.</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Requested On</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-4 py-4 font-medium">
                      {req.user?.first_name} {req.user?.last_name}
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{req.request_number}</span>
                  </td>
                  <td className="px-4 py-4 font-medium">{req.subject}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">{statusBadge(req.status)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {/* Employee can download uploaded docs */}
                      {req.status === "Uploaded" && req.uploads?.length > 0 && (
                        <a
                          href={`${BACKEND_URL}/storage/${req.uploads[req.uploads.length - 1].file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      )}
                      {/* Admin can upload */}
                      {isAdmin && req.status === "Pending" && (
                        <Button size="sm" variant="outline" onClick={() => setShowUploadDialog(req)}>
                          <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Document Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Document</DialogTitle>
            <DialogDescription>Select the document type you need from HR.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as string)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {docType === "Custom Request" && (
              <div>
                <Label>Subject</Label>
                <Input
                  className="mt-1"
                  placeholder="Enter document subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Additional Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                className="mt-1"
                placeholder="Any additional information for HR..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button
              onClick={submitRequest}
              disabled={actionLoading || !docType || (docType === "Custom Request" && !subject)}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={!!showUploadDialog} onOpenChange={() => setShowUploadDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload the fulfilled document for: <strong>{showUploadDialog?.subject}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document File</Label>
              <input
                ref={uploadFileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="mt-1 w-full text-sm border rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, PNG — max 10MB</p>
            </div>
            <div>
              <Label>Comments <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                className="mt-1"
                placeholder="Any notes for the employee..."
                value={uploadComment}
                onChange={(e) => setUploadComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadDialog(null)}>Cancel</Button>
            <Button onClick={uploadDocument} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" /> Upload & Fulfill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
