"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, KeyRound } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditEmployeePage() {
  const params = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

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

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Manage {employee.first_name}</h1>
          <p className="text-slate-300">{employee.employee_id} • {employee.designation}</p>
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
          <Card className="max-w-xl shadow-sm">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>Update the employee's display picture.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="h-32 w-32 rounded-full border-4 border-muted overflow-hidden bg-gray-100 flex items-center justify-center relative group">
                {employee.profile_photo_path ? (
                  <img src={employee.profile_photo_path} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-12 w-12 text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                  <label htmlFor="photo-upload" className="cursor-pointer text-white text-sm font-medium flex flex-col items-center">
                    <Camera className="h-6 w-6 mb-1" />
                    Upload
                  </label>
                  <input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoUpload} 
                    disabled={photoLoading}
                  />
                </div>
              </div>
              {photoLoading && <p className="text-sm text-primary">Uploading photo...</p>}
            </CardContent>
          </Card>
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
