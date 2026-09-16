"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/services/api";
import { useChatPushNotifications } from "@/hooks/useChatPushNotifications";

// Derive the correct route from the notification event, not the stored action_url.
// Old notifications in the DB may have had the wrong URL — using event ensures
// submitted/tl_approved always reach the approvals page regardless of stored value.
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
    if (event === "submitted" || event === "tl_approved" || event === "tl_rejected") return "/leaves/approvals?tab=wfh";
    if (event === "approved" || event === "rejected") return "/wfh";
    return stored || "/leaves/approvals?tab=wfh";
  }

  if (
    type === "App\\Notifications\\CommunityEngagementNotification" ||
    type?.includes("CommunityEngagementNotification") ||
    type?.includes("PollNotification") ||
    type?.includes("PraiseReceivedNotification") ||
    type?.includes("PostMentionNotification") ||
    type?.includes("CommunityPostBroadcastNotification") ||
    notification.data?.type === "community_engagement" ||
    notification.data?.action_url === "/community" ||
    notification.data?.post_id
  ) {
    return "/community";
  }

  const event = notification.data?.event;
  if (event === "submitted" || event === "tl_approved" || event === "tl_rejected") return "/leaves/approvals";
  return stored || "/notifications";
}

function getNotificationCategory(notification: any) {
  const type = notification.type || "";
  const title = (notification.data?.title || "").toLowerCase();
  const msg = (notification.data?.message || "").toLowerCase();

  if (type.includes("LeaveRequest") || title.includes("leave") || msg.includes("leave")) {
    return { icon: "🌴", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-300" };
  }
  if (type.includes("WfhRequest") || title.includes("wfh") || msg.includes("wfh") || title.includes("home")) {
    return { icon: "🏠", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-300" };
  }
  if (type.includes("Praise") || title.includes("praise") || msg.includes("praised")) {
    return { icon: "🎖️", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-300" };
  }
  if (type.includes("Poll") || title.includes("poll") || msg.includes("poll")) {
    return { icon: "📊", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-300" };
  }
  if (title.includes("reaction") || msg.includes("reacted")) {
    return { icon: "❤️", bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-300" };
  }
  if (title.includes("comment") || msg.includes("commented")) {
    return { icon: "💬", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40 text-purple-600 dark:text-purple-300" };
  }
  if (type.includes("CommunityPostBroadcast") || title.includes("community post") || title.includes("new post") || msg.includes("shared a new post")) {
    return { icon: "📝", bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200/60 dark:border-teal-800/40 text-teal-600 dark:text-teal-300" };
  }
  if (type.includes("Birthday") || title.includes("birthday")) {
    return { icon: "🎂", bg: "bg-pink-50 dark:bg-pink-950/40 border-pink-200/60 dark:border-pink-800/40 text-pink-600 dark:text-pink-300" };
  }
  if (type.includes("Profile") || title.includes("profile")) {
    return { icon: "👤", bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/40 text-sky-600 dark:text-sky-300" };
  }
  return { icon: "🔔", bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200/60 dark:border-violet-800/40 text-[#56348f] dark:text-purple-300" };
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
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return "";
  }
}

export function NotificationDropdown() {
  const router = useRouter();
  const { permissionStatus, requestNotificationPermission } = useChatPushNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchUnread = async () => {
    try {
      const res = await api.get("/notifications/unread?limit=5");
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.count);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const handleMarkAllAsRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      // Optimistically update UI - clear notifications and badge
      setUnreadCount(0);
      setNotifications([]);

      // Make API call in background to mark all as read
      await api.post("/notifications/mark-as-read");
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      // Refresh on error to restore correct state
      await fetchUnread();
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchUnread();
    }
  };

  useEffect(() => {
    fetchUnread();
    let interval: NodeJS.Timeout | null = null;
    
    // Only poll if the dropdown is closed
    if (!isOpen) {
      interval = setInterval(fetchUnread, 15000);
    }
    
    window.addEventListener('notifications-refresh', fetchUnread);
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('notifications-refresh', fetchUnread);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Optimistically update UI
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Make API call in background
      await api.post(`/notifications/mark-as-read/${id}`);
    } catch (err) {
      console.error(err);
      // Refresh on error to restore correct state
      await fetchUnread();
    }
  };

  const handleNotificationClick = (notification: any) => {
    // 1. Immediately close dropdown so it vanishes instantly without exposing next notification or gap
    setIsOpen(false);

    // 2. Immediately navigate to destination page
    const targetUrl = resolveNotificationUrl(notification);
    router.push(targetUrl);

    // 3. Process mark-as-read in background without blocking navigation
    if (!notification.read_at) {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      api.post(`/notifications/mark-as-read/${notification.id}`).catch((err) => {
        console.error("Failed to mark notification as read in background", err);
      });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        style={{ color: "var(--portal-header-text, #ffffff)" }}
        className="header-action-btn relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/15 active:bg-white/25 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer shrink-0"
      >
        <Bell className="h-5 w-5 portal-header-icon" style={{ color: "var(--portal-header-text, #ffffff)" }} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9.5px] font-bold rounded-full min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] flex items-center justify-center px-1 leading-none shadow-xs border border-white/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] sm:w-[400px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <DropdownMenuGroup>
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-[#56348f] text-white px-2 py-0.5 rounded-full shadow-2xs">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-[#56348f] dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline cursor-pointer transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Phone Push Notifications Quick Status */}
          <div className="px-3.5 py-2 bg-gradient-to-r from-purple-50/90 via-indigo-50/60 to-purple-50/90 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border-b border-purple-100/80 dark:border-purple-900/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">🔔</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-purple-900 dark:text-purple-200 leading-tight">
                  Phone Push Alerts
                </p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">
                  {permissionStatus === "granted" ? "Active on this device" : "Tap to enable on phone"}
                </p>
              </div>
            </div>
            {permissionStatus !== "granted" && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="text-[10.5px] font-bold bg-[#56348f] hover:bg-purple-800 text-white px-2.5 py-0.5 rounded-full cursor-pointer transition-all shadow-2xs active:scale-95 shrink-0"
              >
                Enable
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2.5 text-slate-400">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300">No new notifications</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">You're completely caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cat = getNotificationCategory(notif);
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isUnread
                        ? "bg-violet-50/70 hover:bg-violet-100/85 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 border-violet-200/80 dark:border-violet-800/50 shadow-2xs hover:shadow-xs"
                        : "bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Category Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border ${cat.bg} shadow-2xs`}>
                      {cat.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#56348f] dark:bg-purple-400 ring-2 ring-purple-200 dark:ring-purple-900/70 shrink-0" />
                          )}
                          <span className={`text-xs truncate transition-colors ${
                            isUnread
                              ? "font-bold text-slate-900 dark:text-white group-hover:text-[#56348f] dark:group-hover:text-purple-300"
                              : "font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}>
                            {notif.data?.title || "Notification"}
                          </span>
                        </div>

                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-[10px] font-semibold text-[#56348f] dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-100/80 dark:hover:bg-purple-950/60 px-1.5 py-0.5 rounded transition-colors shrink-0 cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>

                      <p className="text-[11.5px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {notif.data?.message || "You have a new update."}
                      </p>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DropdownMenuGroup>

        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
          <Link href="/notifications" onClick={() => setIsOpen(false)} className="block w-full">
            <button
              type="button"
              className="w-full text-center text-xs text-[#56348f] dark:text-purple-400 font-bold p-2 hover:bg-purple-50 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 group"
            >
              <span>View all notifications</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
