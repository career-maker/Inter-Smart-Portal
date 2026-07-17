"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Save, Loader2, Server, Shield, Mail, Building, LayoutDashboard } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.push("/dashboard");
      return;
    }
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/settings");
      setSettings(response.data);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to fetch settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/settings", { settings });
      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const tabs = [
    { id: "company", label: "Company Profile", icon: Building },
    { id: "dashboard", label: "Dashboard Widgets", icon: LayoutDashboard },
    { id: "smtp", label: "SMTP Configuration", icon: Mail },
    { id: "security", label: "Security & Backup", icon: Shield },
    { id: "system", label: "System Maintenance", icon: Server },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
          Manage application configurations, branding, and maintenance.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <form onSubmit={handleSave} className="bg-card rounded-xl border shadow-sm">
            <div className="p-6 space-y-6">
              {activeTab === "company" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Company Information</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name</label>
                      <input
                        type="text"
                        value={settings.company_name || ""}
                        onChange={(e) => handleChange("company_name", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Logo URL</label>
                      <input
                        type="text"
                        value={settings.company_logo || ""}
                        onChange={(e) => handleChange("company_logo", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Support Email</label>
                      <input
                        type="email"
                        value={settings.support_email || ""}
                        onChange={(e) => handleChange("support_email", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "dashboard" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Dashboard Widgets</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Upcoming Birthdays Lookahead (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.upcoming_birthdays_days || "30"}
                        onChange={(e) => handleChange("upcoming_birthdays_days", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      />
                      <p className="text-xs text-muted-foreground">Number of days to look ahead for upcoming employee birthdays (default: 30).</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "smtp" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">SMTP Setup</h3>
                  <p className="text-xs text-muted-foreground">
                    Note: For production, we recommend updating SMTP settings directly via environment variables rather than UI to maintain strict security, but you can override configurations here.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mail Host</label>
                      <input
                        type="text"
                        value={settings.mail_host || ""}
                        onChange={(e) => handleChange("mail_host", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mail Port</label>
                      <input
                        type="text"
                        value={settings.mail_port || ""}
                        onChange={(e) => handleChange("mail_port", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mail Username</label>
                      <input
                        type="text"
                        value={settings.mail_username || ""}
                        onChange={(e) => handleChange("mail_username", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mail Password</label>
                      <input
                        type="password"
                        value={settings.mail_password || ""}
                        onChange={(e) => handleChange("mail_password", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Security & Policies</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Require Strong Passwords</h4>
                        <p className="text-xs text-muted-foreground">Force employees to use complex passwords</p>
                      </div>
                      <select 
                        value={settings.strong_passwords || "true"}
                        onChange={(e) => handleChange("strong_passwords", e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Session Timeout</h4>
                        <p className="text-xs text-muted-foreground">In minutes</p>
                      </div>
                      <input
                        type="number"
                        value={settings.session_timeout || "120"}
                        onChange={(e) => handleChange("session_timeout", e.target.value)}
                        className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "system" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Maintenance</h3>
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-destructive">Maintenance Mode</h4>
                        <p className="text-xs text-destructive/80">
                          When enabled, non-admin users will see a maintenance page.
                        </p>
                      </div>
                      <select 
                        value={settings.maintenance_mode || "false"}
                        onChange={(e) => handleChange("maintenance_mode", e.target.value)}
                        className="h-9 rounded-md border border-destructive bg-background px-3 py-1 text-sm font-medium text-destructive"
                      >
                        <option value="false">Off</option>
                        <option value="true">On</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end border-t p-4 bg-muted/50">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
