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

  if (type === "App\\Notifications\\ProfileUpdateRequestNotification") {
    return stored || "/profile-requests";
  }

  if (type === "App\\Notifications\\BirthdayWishNotification") {
    return stored || "/birthday-wishes";
  }

  const event = notification.data?.event;
  if (event === "submitted" || event === "tl_approved") return "/leaves/approvals";
  return stored || "/notifications";
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    window.addEventListener('notifications-refresh', fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-refresh', fetchUnread);
    };
  }, []);

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
    <DropdownMenu>
      <DropdownMenuTrigger className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none">
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <DropdownMenuItem 
                  key={notif.id} 
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer border-b last:border-0 focus:bg-gray-50"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex justify-between w-full items-start gap-2">
                    <span className="font-medium text-sm">
                      {notif.data?.title || "Notification"}
                    </span>
                    <button 
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {notif.data?.message || "You have a new update."}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Link href="/notifications">
            <button className="w-full text-center text-sm text-primary font-medium p-2 hover:bg-gray-50 rounded-md transition-colors">
              View all notifications
            </button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
