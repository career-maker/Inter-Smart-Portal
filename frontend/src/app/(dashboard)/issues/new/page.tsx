"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, UploadCloud, X } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "Technical Issue", "Attendance Issue", "Leave Issue", "Payroll Issue", 
  "HR Concern", "Portal Bug", "Feature Request", "General Query", "Other"
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MODULES = ["Attendance", "Leave", "Dashboard", "Announcements", "Profile", "Others"];

export default function NewIssuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "",
    related_module: "",
    description: "",
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        data.append(key, val);
      });
      files.forEach((file) => {
        data.append("attachments[]", file);
      });

      const response = await api.post("/issues", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      alert("Issue raised successfully.");
      router.push(`/issues/${response.data.data.id}`);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to raise issue.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/issues">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Raise an Issue</h1>
          <p className="text-slate-300">Submit a support request to the admin team.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title <span className="text-red-500">*</span></Label>
              <Input 
                id="title" 
                name="title" 
                required 
                placeholder="Brief summary of the issue..."
                value={formData.title} 
                onChange={handleChange} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
                <select
                  id="priority"
                  name="priority"
                  required
                  value={formData.priority}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Priority</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="related_module">Related Module (Optional)</Label>
              <select
                id="related_module"
                name="related_module"
                value={formData.related_module}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select Module</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Issue Description <span className="text-red-500">*</span></Label>
              <Textarea 
                id="description" 
                name="description" 
                required 
                rows={6}
                placeholder="Please describe your issue in detail..."
                value={formData.description} 
                onChange={handleChange} 
              />
            </div>

            <div className="space-y-3">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to upload files</p>
                <p className="text-xs text-gray-500 mt-1">Images, PDFs, or Documents</p>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ position: 'relative', marginTop: '-80px', height: '100px' }}
                />
              </div>
              
              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white border rounded-lg shadow-sm">
                      <span className="text-sm text-gray-700 truncate mr-4">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => removeFile(i)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t">
              <Link href="/issues">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Issue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
