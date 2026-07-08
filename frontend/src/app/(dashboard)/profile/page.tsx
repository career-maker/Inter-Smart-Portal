"use client";

import { useState, useEffect } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import { UserCircle, ShieldAlert, Award, Eye, Download, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { CertificateModal } from "@/components/recognition/CertificateModal";

export default function MyProfilePage() {
  const { user } = useAuthStore();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setEmployeeId(params.get("employee_id"));
    }
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      if (employeeId && employeeId !== user.id?.toString()) {
        setLoading(true);
        try {
          const res = await api.get(`/employees/${employeeId}/public`);
          setProfileUser(res.data.data);
        } catch (err) {
          console.error("Failed to fetch public profile", err);
          setProfileUser(user);
        } finally {
          setLoading(false);
        }
      } else {
        setProfileUser(user);
        setFormData({
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          phone: (user as any).phone || "",
          emergency_contact: (user as any).emergency_contact || "",
          address: (user as any).address || "",
          city: (user as any).city || "",
          state: (user as any).state || "",
          zip: (user as any).zip || "",
        });
        fetchPendingRequest();
      }
    };
    loadProfile();
  }, [user, employeeId]);

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

  if (!profileUser || loading) return <PageLoader />;

  const isOwnProfile = !employeeId || employeeId === user?.id?.toString();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <UserCircle className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isOwnProfile ? "My Profile" : "Employee Profile"}
          </h1>
          <p className="text-slate-300">
            {isOwnProfile ? "Manage your personal information." : "View achievements and recognition history."}
          </p>
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
                src={
                  profileUser.profile_photo_path ||
                  `https://ui-avatars.com/api/?name=${profileUser.first_name}`
                }
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-amber-400/30"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <div className="font-medium">{profileUser.first_name} {profileUser.last_name}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Employee ID</Label>
              <div className="font-medium">{profileUser.employee_id || profileUser.employee_code || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Official Email</Label>
              <div className="font-medium">{profileUser.email}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Designation</Label>
              <div className="font-medium">{profileUser.designation || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Department / Team</Label>
              <div className="font-medium">{profileUser.team?.name || "—"}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <div className="font-medium">{profileUser.role}</div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Contact Info & Recognitions */}
        <div className="md:col-span-2 space-y-6">
          {isOwnProfile && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Any changes made here will be sent to the Super Admin for approval before going live.
                </CardDescription>
              </CardHeader>

              {pendingRequest ? (
                <div className="p-6 pt-0 space-y-6">
                  <div className="p-4 flex gap-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <h4 className="font-semibold text-amber-200">Update Request Pending</h4>
                      <p className="text-sm mt-1 text-amber-300/80">
                        You submitted a profile update request on{" "}
                        {new Date(pendingRequest.created_at).toLocaleDateString()}. It is currently
                        waiting for admin approval. You cannot make further edits until this is resolved.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                      Requested Changes
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(pendingRequest.requested_data).map(([key, val]) => (
                        <div key={key}>
                          <Label className="text-muted-foreground capitalize">
                            {key.replace("_", " ")}
                          </Label>
                          <div className="font-medium">{String(val) || "—"}</div>
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
                        <Input
                          id="first_name"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          disabled={user?.role !== "Super Admin"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          disabled={user?.role !== "Super Admin"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact">Emergency Contact</Label>
                        <Input
                          id="emergency_contact"
                          name="emergency_contact"
                          value={formData.emergency_contact}
                          onChange={handleChange}
                        />
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
                      {saving
                        ? "Submitting..."
                        : user?.role === "Super Admin"
                        ? "Save Changes"
                        : "Submit for Approval"}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {/* Achievements & Recognition Section */}
          <AchievementsSection
            employeeName={`${profileUser.first_name} ${profileUser.last_name}`}
            employeeId={employeeId}
          />
        </div>
      </div>
    </div>
  );
}

function AchievementsSection({ employeeName, employeeId }: { employeeName: string; employeeId: string | null }) {
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<any | null>(null);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const url = "/me/recognitions" + (employeeId ? `?user_id=${employeeId}` : "");
        const res = await api.get(url);
        setRecognitions(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, [employeeId]);

  if (!loading && recognitions.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <div
        id="achievements"
        className="rounded-3xl border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)", backdropFilter: "blur(12px)" }}
      >
        {/* Section Header */}
        <div
          className="px-6 py-5 border-b border-white/10"
          style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(99,102,241,0.06) 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Achievements & Recognition</h2>
              <p className="text-xs text-slate-400">Complete history of awards and certificates</p>
            </div>
            <div className="ml-auto">
              <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
                {recognitions.length} {recognitions.length === 1 ? "Award" : "Awards"}
              </span>
            </div>
          </div>
        </div>

        {/* Achievement Cards */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {recognitions.map((rec: any, idx: number) => {
                const startDate = new Date(rec.start_date);
                const endDate = new Date(rec.end_date);
                endDate.setHours(23, 59, 59, 999);
                const isActive = rec.is_active && startDate <= today && endDate >= today;
                const issuedBy = rec.creator
                  ? `${rec.creator.first_name} ${rec.creator.last_name}`
                  : "Management";

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-5 transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500/10 to-violet-500/10 border-amber-500/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{rec.icon || "🏆"}</span>
                        <div>
                          <h3
                            className={`font-black tracking-wide uppercase text-sm ${
                              isActive ? "text-amber-300" : "text-slate-300"
                            }`}
                          >
                            {rec.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Issued by {issuedBy}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-white/10 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            Past Award
                          </span>
                        )}
                      </div>
                    </div>

                    {rec.description && (
                      <p className="text-sm text-slate-400 italic mb-3 leading-relaxed">
                        "{rec.description}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Awarded On</p>
                        <p className="text-xs font-bold text-slate-200">
                          {format(new Date(rec.created_at || rec.start_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Valid Period</p>
                        <p className="text-xs font-bold text-slate-200">
                          {format(new Date(rec.start_date), "dd MMM yyyy")} –{" "}
                          {format(new Date(rec.end_date), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedRec(rec)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Certificate
                      </button>
                      <button
                        onClick={() => setSelectedRec(rec)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 bg-amber-500 hover:bg-amber-400 px-4 py-2 rounded-xl transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedRec && (
        <CertificateModal
          recognition={selectedRec}
          employeeName={employeeName}
          onClose={() => setSelectedRec(null)}
        />
      )}
    </>
  );
}
