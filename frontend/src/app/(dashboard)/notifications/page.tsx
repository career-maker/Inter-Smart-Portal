"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import api from "@/services/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

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
    } catch (err) {
      console.error(err);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">View your recent updates and alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border rounded-lg p-1 flex shadow-sm">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "all" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "unread" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Unread
            </button>
          </div>
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="h-9 gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-400" />
            History
          </CardTitle>
          <CardDescription>A timeline of all your notifications</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm">You have no {filter === "unread" ? "unread " : ""}notifications.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-colors hover:bg-gray-50 ${
                    !notif.read_at ? "bg-primary/5" : "bg-white"
                  }`}
                >
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notif.data?.title || "Update"}
                      </p>
                      {!notif.read_at && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 whitespace-pre-wrap">
                      {notif.data?.message || "You have a new notification regarding your account."}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
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
                      onClick={() => handleMarkAsRead(notif.id)}
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
