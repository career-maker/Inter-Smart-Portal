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
  const type = notification.type;
  const stored = notification.data?.action_url;

  if (
    type === "App\\Notifications\\ProfileUpdateRequestNotification" ||
    type?.includes("ProfileUpdateRequestNotification") ||
    notification.data?.profile_update_request_id ||
    notification.data?.title?.includes("Profile Update")
  ) {
    const event = notification.data?.event;
    if (event === "submitted") return "/profile-requests";
    if (event === "approved" || event === "rejected") return "/profile";
    return stored || "/profile-requests";
  }

  if (type === "App\\Notifications\\BirthdayWishNotification") {
    return stored || "/birthday-wishes";
  }

  if (type === "App\\Notifications\\TARequestNotification") {
    return stored || "/ta/management";
  }

  if (
    type === "App\\Notifications\\WfhRequestNotification" ||
    notification.data?.wfh_request_id ||
    notification.data?.title?.includes("WFH")
  ) {
    const event = notification.data?.event;
    if (event === "submitted" || event === "tl_approved") return "/leaves/approvals?tab=wfh";
    if (event === "approved" || event === "rejected" || event === "admin_marked") return "/wfh";
    return stored || "/leaves/approvals?tab=wfh";
  }

  if (
    type === "App\\Notifications\\CommunityEngagementNotification" ||
    type?.includes("CommunityEngagementNotification") ||
    type?.includes("PollNotification") ||
    type?.includes("PraiseReceivedNotification") ||
    type?.includes("PostMentionNotification") ||
    notification.data?.type === "community_engagement" ||
    notification.data?.action_url === "/community"
  ) {
    return "/community";
  }

  const event = notification.data?.event;
  if (event === "submitted" || event === "tl_approved") return "/leaves/approvals";
  if (event === "approved" || event === "rejected" || event === "admin_marked") return "/leaves";
  return stored || "/notifications";
}

function getNotificationCategory(notification: any) {
  const type = notification.type || "";
  const title = (notification.data?.title || "").toLowerCase();
  const msg = (notification.data?.message || "").toLowerCase();

  if (type.includes("LeaveRequest") || title.includes("leave") || msg.includes("leave")) {
    return { icon: "🌴", label: "Leave", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-300" };
  }
  if (type.includes("WfhRequest") || title.includes("wfh") || msg.includes("wfh") || title.includes("home")) {
    return { icon: "🏠", label: "WFH", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-800/40 text-blue-600 dark:text-blue-300" };
  }
  if (type.includes("Praise") || title.includes("praise") || msg.includes("praised")) {
    return { icon: "🎖️", label: "Praise", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/40 text-amber-600 dark:text-amber-300" };
  }
  if (type.includes("Poll") || title.includes("poll") || msg.includes("poll")) {
    return { icon: "📊", label: "Poll", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-300" };
  }
  if (title.includes("reaction") || msg.includes("reacted")) {
    return { icon: "❤️", label: "Reaction", bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/40 text-rose-600 dark:text-rose-300" };
  }
  if (title.includes("comment") || msg.includes("commented")) {
    return { icon: "💬", label: "Comment", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-800/40 text-purple-600 dark:text-purple-300" };
  }
  if (type.includes("Birthday") || title.includes("birthday")) {
    return { icon: "🎂", label: "Birthday", bg: "bg-pink-50 dark:bg-pink-950/40 border-pink-200/70 dark:border-pink-800/40 text-pink-600 dark:text-pink-300" };
  }
  if (type.includes("Profile") || title.includes("profile")) {
    return { icon: "👤", label: "Profile", bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/70 dark:border-sky-800/40 text-sky-600 dark:text-sky-300" };
  }
  return { icon: "🔔", label: "Alert", bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200/70 dark:border-violet-800/40 text-[#56348f] dark:text-purple-300" };
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return "";
  }
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

  const unreadTotal = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
            {unreadTotal > 0 && (
              <span className="bg-[#56348f] text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                {unreadTotal} unread
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Stay informed with updates, approvals, community activity, and team milestones.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-1 flex shadow-2xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === "all" ? "bg-[#56348f] text-white shadow-2xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === "unread" ? "bg-[#56348f] text-white shadow-2xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
              }`}
            >
              <span>Unread</span>
              {unreadTotal > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === "unread" ? "bg-white/20 text-white" : "bg-purple-100 text-[#56348f] dark:bg-purple-950 dark:text-purple-300"
                }`}>
                  {unreadTotal}
                </span>
              )}
            </button>
          </div>
          {unreadTotal > 0 && (
            <Button
              onClick={(e) => { e.stopPropagation(); handleMarkAllAsRead(); }}
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-slate-200 dark:border-slate-700 text-[#56348f] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl font-semibold cursor-pointer shadow-2xs"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-[#56348f] dark:text-purple-300">
                <Bell className="h-4 w-4" />
              </div>
              Timeline
            </CardTitle>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Showing {filteredNotifications.length} updates
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-[#56348f]" />
              <p className="text-xs font-medium">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No {filter === "unread" ? "unread " : ""}notifications found</p>
              <p className="text-xs text-slate-400 mt-1">You're all caught up with your workplace activity!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notif) => {
                const cat = getNotificationCategory(notif);
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read_at) handleMarkAsRead(notif.id);
                      router.push(resolveNotificationUrl(notif));
                    }}
                    className={`group p-4 sm:px-5 rounded-xl border flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between transition-all duration-150 cursor-pointer ${
                      isUnread
                        ? "bg-gradient-to-r from-violet-50/80 via-purple-50/40 to-white dark:from-violet-950/30 dark:via-slate-900/90 dark:to-slate-900/90 border-violet-200/90 dark:border-violet-800/60 shadow-xs hover:shadow-md hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-100/70 dark:hover:bg-violet-900/35"
                        : "bg-white dark:bg-slate-900/70 border-slate-200/70 dark:border-slate-800/70 hover:bg-slate-50/90 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Category Icon Badge */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${cat.bg} shadow-2xs group-hover:scale-105 transition-transform`}>
                        {cat.icon}
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#56348f] dark:bg-purple-400 ring-2 ring-purple-200 dark:ring-purple-900/80 shrink-0" />
                          )}
                          <p className={`text-sm truncate transition-colors ${
                            isUnread ? "font-bold text-slate-900 dark:text-white group-hover:text-[#56348f] dark:group-hover:text-purple-300" : "font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}>
                            {notif.data?.title || "Update"}
                          </p>
                          {isUnread && (
                            <Badge variant="secondary" className="bg-[#56348f]/10 text-[#56348f] dark:bg-purple-950 dark:text-purple-300 border-0 text-[10px] font-bold px-2 py-0.2">
                              New
                            </Badge>
                          )}
                          <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {cat.label}
                          </span>
                        </div>

                        <p className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                          isUnread ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {notif.data?.message || "You have a new notification regarding your account."}
                        </p>

                        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 font-medium">
                          {formatRelativeTime(notif.created_at)} • {new Date(notif.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>

                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                        className="shrink-0 h-8 text-xs font-semibold text-[#56348f] dark:text-purple-400 hover:text-purple-900 hover:bg-purple-100/80 dark:hover:bg-purple-950/60 rounded-lg cursor-pointer"
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
