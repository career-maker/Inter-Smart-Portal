"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import { toast } from "sonner";
import { UserCircle, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

export default function MyProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [formData, setFormData] = useState({
    phone: "",
    emergency_contact: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || "",
        emergency_contact: user.emergency_contact || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zip: user.zip || "",
      });
      fetchPendingRequest();
    }
  }, [user]);

  const fetchPendingRequest = async () => {
    try {
      const response = await api.get("/me/profile/request");
      if (response.data.data) {
        setPendingRequest(response.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.post("/me/profile/request", formData);
      setPendingRequest(response.data.data);
      toast.success("Profile update request submitted for approval.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit request.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <UserCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Uneditable Core Info */}
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Core Details</CardTitle>
            <CardDescription>Locked by HR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <img 
                src={user.profile_photo_path || "https://ui-avatars.com/api/?name=" + user.first_name} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <div className="font-medium">{user.first_name} {user.last_name}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Employee ID</Label>
              <div className="font-medium">{user.employee_id}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Official Email</Label>
              <div className="font-medium">{user.email}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Designation</Label>
              <div className="font-medium">{user.designation}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <div className="font-medium">{user.role}</div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Contact Info */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Any changes made here will be sent to the Super Admin for approval before going live.
            </CardDescription>
          </CardHeader>
          
          {pendingRequest ? (
            <div className="p-6 pt-0 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Update Request Pending</h4>
                  <p className="text-sm mt-1">You submitted a profile update request on {new Date(pendingRequest.created_at).toLocaleDateString()}. It is currently waiting for admin approval. You cannot make further edits until this is resolved.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Requested Changes</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(pendingRequest.requested_data).map(([key, val]) => (
                    <div key={key}>
                      <Label className="text-muted-foreground capitalize">{key.replace('_', ' ')}</Label>
                      <div className="font-medium">{String(val) || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact">Emergency Contact</Label>
                    <Input id="emergency_contact" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address Line</Label>
                  <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" value={formData.state} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input id="zip" name="zip" value={formData.zip} onChange={handleChange} />
                  </div>
                </div>
              </CardContent>
              <div className="px-6 pb-6 pt-2 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
