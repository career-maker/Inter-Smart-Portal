"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import api from "@/services/api";
import { useRouter } from "next/navigation";

function resolveNotificationUrl(notification: any): string {
  const event = notification.data?.event;
  if (event === "submitted" || event === "tl_approved") return "/leaves/approvals";
  const stored = notification.data?.action_url;
  return stored || "/notifications";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications?per_page=50");
      setNotifications(res.data.data.data); // paginated response
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/mark-as-read/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post(`/notifications/mark-as-read`);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      // Reset filter to "all" to show the updated list
      setFilter("all");
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read_at;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-gray-500 mt-1">View your recent updates and alerts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white/10 border border-border rounded-lg p-1 flex shadow-sm">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "all" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-white/10"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "unread" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-white/10"
              }`}
            >
              Unread
            </button>
          </div>
          <Button onClick={(e) => { e.stopPropagation(); handleMarkAllAsRead(); }} variant="outline" size="sm" className="h-9 gap-2 border-border text-muted-foreground hover:bg-white/5">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-white/5">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            History
          </CardTitle>
          <CardDescription className="text-muted-foreground">A timeline of all your notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-slate-500" />
              </div>
              <p className="text-sm">You have no {filter === "unread" ? "unread " : ""}notifications.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read_at) handleMarkAsRead(notif.id);
                    router.push(resolveNotificationUrl(notif));
                  }}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-colors cursor-pointer ${
                    !notif.read_at ? "bg-primary/10 hover:bg-primary/15" : "bg-gray-900/30 hover:bg-gray-900/40 text-gray-300"
                  }`}
                >
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${notif.read_at ? "text-muted-foreground" : "text-gray-900"}`}>
                        {notif.data?.title || "Update"}
                      </p>
                      {!notif.read_at && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${notif.read_at ? "text-muted-foreground" : "text-gray-600"}`}>
                      {notif.data?.message || "You have a new notification regarding your account."}
                    </p>
                    <p className={`text-xs mt-1 ${notif.read_at ? "text-slate-500" : "text-gray-400"}`}>
                      {new Date(notif.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {!notif.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                      className="shrink-0 h-8 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
