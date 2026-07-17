"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import Link from "next/link";
import { ArrowLeft, Camera, KeyRound, Link2, Upload, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function convertGoogleDriveUrl(url: string): string {
  // Extract FILE_ID from any Google Drive sharing URL format
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w500`;
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w500`;
  const idMatch = url.match(/[?&]id=([^&]+)/) ;
  if (idMatch && url.includes('drive.google.com')) return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w500`;
  return url;
}

export default function EditEmployeePage() {
  const params = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMode, setPhotoMode] = useState<"upload" | "url">("upload");
  const [photoUrl, setPhotoUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlSuccess, setUrlSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const response = await api.get(`/employees/${params.id}`);
      setEmployee(response.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await api.post(`/employees/${params.id}/password`, {
        password: formData.get("password"),
        password_confirmation: formData.get("password_confirmation")
      });
      alert("Password updated successfully");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setPhotoLoading(true);
    const formData = new FormData();
    formData.append("photo", e.target.files[0]);

    try {
      const response = await api.post(`/employees/${params.id}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setEmployee({ ...employee, profile_photo_path: response.data.profile_photo_path });
      
      // Update global auth store if the logged-in user is editing their own profile
      const authStore = useAuthStore.getState();
      if (params?.id && authStore.user?.id?.toString() === params.id.toString()) {
        authStore.updateUser({ profile_photo_path: response.data.profile_photo_path });
      }
      
      alert("Photo uploaded successfully");
    } catch (err: any) {
      alert("Failed to upload photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim()) return;
    setUrlLoading(true);
    setUrlSuccess(false);
    try {
      const converted = convertGoogleDriveUrl(photoUrl.trim());
      const response = await api.post(`/employees/${params.id}/photo-url`, { photo_url: converted });
      setEmployee({ ...employee, profile_photo_path: response.data.profile_photo_path });
      const authStore = useAuthStore.getState();
      if (params?.id && authStore.user?.id?.toString() === params.id.toString()) {
        authStore.updateUser({ profile_photo_path: response.data.profile_photo_path });
      }
      setUrlSuccess(true);
      setImgError(false);
      setPhotoUrl("");
      setTimeout(() => setUrlSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save photo URL.");
    } finally {
      setUrlLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!employee) return <div className="p-8 text-center">Employee not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage {employee.first_name}</h1>
          <p className="text-muted-foreground">{employee.employee_id} • {employee.designation}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
          <TabsTrigger value="photo">Profile Photo</TabsTrigger>
          <TabsTrigger value="password">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <EmployeeForm initialData={employee} isEdit={true} />
        </TabsContent>
        
        <TabsContent value="photo">
          <div className="max-w-xl space-y-6">
            {/* Current photo preview */}
            <div className="bg-card/80 border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
              <div className="h-28 w-28 rounded-full border-4 border-border overflow-hidden bg-slate-700 flex items-center justify-center shrink-0">
                {employee.profile_photo_path && !imgError ? (
                  <img src={employee.profile_photo_path} alt="Profile" className="h-full w-full object-cover" onError={() => setImgError(true)} />
                ) : (
                  <Camera className="h-12 w-12 text-slate-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {imgError ? "Photo URL saved but could not load — ensure the file is publicly accessible" : employee.profile_photo_path ? "Current profile photo" : "No photo set"}
              </p>
              {imgError && (
                <p className="text-xs text-amber-400 text-center max-w-sm">Make sure the Google Drive file sharing is set to <strong>"Anyone with the link"</strong> can view.</p>
              )}
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border border-border overflow-hidden bg-card/60 p-1 gap-1">
              <button
                onClick={() => setPhotoMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${photoMode === "upload" ? "bg-amber-500 text-white shadow" : "text-muted-foreground hover:text-white"}`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                onClick={() => setPhotoMode("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${photoMode === "url" ? "bg-amber-500 text-white shadow" : "text-muted-foreground hover:text-white"}`}
              >
                <Link2 className="w-4 h-4" />
                Paste URL
              </button>
            </div>

            {/* Upload File mode */}
            {photoMode === "upload" && (
              <div className="bg-card/80 border border-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-1">Upload from device</h3>
                <p className="text-xs text-muted-foreground mb-4">JPEG, PNG or GIF · Max 2 MB</p>
                <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${photoLoading ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:border-amber-500/60 hover:bg-amber-500/5"}`}>
                  {photoLoading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Click to choose a file</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoLoading} />
                </label>
              </div>
            )}

            {/* Paste URL mode */}
            {photoMode === "url" && (
              <div className="bg-card/80 border border-border rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-1">Link from Google Drive or any public URL</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Share the file publicly on Google Drive, copy the sharing link, and paste it below. Google Drive links are automatically converted to direct image URLs.
                </p>
                <form onSubmit={handlePhotoUrl} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={e => { setPhotoUrl(e.target.value); setUrlSuccess(false); }}
                      placeholder="https://drive.google.com/file/d/... or any image URL"
                      className="flex-1 bg-slate-700 border border-border text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-amber-500 placeholder:text-slate-500"
                      disabled={urlLoading}
                    />
                    <button
                      type="submit"
                      disabled={urlLoading || !photoUrl.trim()}
                      className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shrink-0 transition-colors"
                    >
                      {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : urlSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                      {urlLoading ? "Saving..." : urlSuccess ? "Saved!" : "Save"}
                    </button>
                  </div>
                  {urlSuccess && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Photo URL saved successfully. The preview above has been updated.
                    </p>
                  )}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 space-y-1">
                    <p className="font-semibold text-blue-200">How to share from Google Drive:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-blue-300/90">
                      <li>Right-click the photo in Google Drive → Share</li>
                      <li>Change access to <strong className="text-blue-200">"Anyone with the link"</strong></li>
                      <li>Click <strong className="text-blue-200">Copy link</strong> and paste it above</li>
                    </ol>
                  </div>
                </form>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="password">
          <Card className="max-w-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Change Password</CardTitle>
              <CardDescription>Force a password reset for this employee.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirm Password</Label>
                  <Input id="password_confirmation" name="password_confirmation" type="password" required minLength={6} />
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
