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
    // In a real app we might use websockets here, for now we can poll every 60s
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/notifications/mark-as-read/${id}`);
      fetchUnread();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_at) {
      api.post(`/notifications/mark-as-read/${notification.id}`).then(() => fetchUnread());
    }
    // If the notification has action_url data, we could route there.
    if (notification.data?.action_url) {
      router.push(notification.data.action_url);
    } else {
      router.push("/notifications");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none">
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
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
