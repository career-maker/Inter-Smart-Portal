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
    if (event === "submitted" || event === "tl_approved") return "/leaves/approvals?tab=wfh";
    if (event === "approved" || event === "rejected") return "/wfh";
    return stored || "/leaves/approvals?tab=wfh";
  }

  const event = notification.data?.event;
  if (event === "submitted" || event === "tl_approved") return "/leaves/approvals";
  return stored || "/notifications";
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

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

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      try {
        // Optimistically update UI
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        setUnreadCount(prev => Math.max(0, prev - 1));

        // Make API call in background
        await api.post(`/notifications/mark-as-read/${notification.id}`);
      } catch (err) {
        console.error(err);
        // Refresh on error to restore correct state
        await fetchUnread();
      }
    }
    router.push(resolveNotificationUrl(notification));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger className="relative p-2 rounded-full hover:bg-white/15 dark:hover:bg-slate-800 transition-colors focus:outline-none text-white dark:text-slate-300">
        <Bell className="h-5 w-5 text-white dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-84 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg p-0 overflow-hidden">
        <DropdownMenuGroup>
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-semibold text-[#56348f] dark:text-purple-400 hover:text-purple-800 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold bg-purple-100 text-[#56348f] dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          <div className="max-h-84 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No new notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="group flex flex-col items-start gap-1 p-3.5 cursor-pointer bg-white hover:bg-purple-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex justify-between w-full items-start gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-[#56348f] dark:group-hover:text-purple-300 transition-colors">
                      {notif.data?.title || "Notification"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="text-[11px] font-semibold text-[#56348f] dark:text-purple-400 hover:text-purple-800 hover:underline shrink-0 cursor-pointer"
                    >
                      Mark read
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {notif.data?.message || "You have a new update."}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {new Date(notif.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </DropdownMenuGroup>

        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <Link href="/notifications" className="block w-full">
            <button
              type="button"
              className="w-full text-center text-xs text-[#56348f] dark:text-purple-400 font-bold p-2 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              View all notifications →
            </button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
