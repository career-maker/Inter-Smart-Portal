"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import { UserCircle, ShieldAlert, CheckCircle2, Clock, Award } from "lucide-react";

export default function MyProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
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
        first_name: user.first_name || "",
        last_name: user.last_name || "",
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
      if (user?.role === "Super Admin") {
        await api.put("/me/profile", formData);
        alert("Profile updated successfully.");
      } else {
        const response = await api.post("/me/profile/request", formData);
        setPendingRequest(response.data.data);
        alert("Profile update request submitted for approval.");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to save profile.");
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
          <h1 className="text-2xl font-bold tracking-tight text-white">My Profile</h1>
          <p className="text-slate-300">Manage your personal information.</p>
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

        {/* Editable Contact Info & Recognitions */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Any changes made here will be sent to the Super Admin for approval before going live.
              </CardDescription>
            </CardHeader>
            
            {pendingRequest ? (
              <div className="p-6 pt-0 space-y-6">
                <div className="premium-card p-4 flex gap-3 text-amber-800">
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
                      <Label htmlFor="first_name">First Name</Label>
                      <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} disabled={user?.role !== 'Super Admin'} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} disabled={user?.role !== 'Super Admin'} />
                    </div>
                  </div>

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
                    {saving ? "Submitting..." : user?.role === 'Super Admin' ? "Save Changes" : "Submit for Approval"}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <RecognitionsHistory />
        </div>
      </div>
    </div>
  );
}

function RecognitionsHistory() {
  const [recognitions, setRecognitions] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await api.get("/me/recognitions");
        setRecognitions(res.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecs();
  }, []);

  if (recognitions.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          My Recognitions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recognitions.map((rec: any, idx: number) => {
            const isActive = rec.is_active && new Date(rec.start_date) <= new Date() && new Date(rec.end_date) >= new Date();
            return (
              <div key={idx} className={`p-4 rounded-xl border ${isActive ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{rec.icon}</span>
                    <h4 className={`font-black tracking-wide uppercase ${isActive ? 'text-amber-700' : 'text-gray-700'}`}>{rec.title}</h4>
                  </div>
                  {isActive ? (
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Past</span>
                  )}
                </div>
                {rec.description && (
                  <p className="text-sm text-gray-600 italic mb-3">"{rec.description}"</p>
                )}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {new Date(rec.start_date).toLocaleDateString()} — {new Date(rec.end_date).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
