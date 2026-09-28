"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/services/api";
import { useChatPushNotifications } from "@/hooks/useChatPushNotifications";

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
    if (event === "approved" || event === "rejected" || event === "admin_marked") return "/wfh";
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
  if (event === "submitted" || event === "tl_approved" || event === "tl_rejected" || event === "cancelled") return "/leaves/approvals";
  if (event === "approved" || event === "rejected" || event === "admin_marked") return "/leaves";
  return stored || "/notifications";
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

function formatTimestamp(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: "long", hour: "numeric", minute: "numeric", hour12: true });
  } catch (e) {
    return "";
  }
}

function getAvatarFallback(title: string) {
  if (!title) return "N";
  return title.charAt(0).toUpperCase();
}

function NotificationItem({
  notification,
  onItemClick,
  onMarkAsRead
}: {
  notification: any;
  onItemClick: (n: any) => void;
  onMarkAsRead: (id: string, e: React.MouseEvent) => void;
}) {
  const isUnread = !notification.read_at;
  const title = notification.data?.title || "Notification";
  const message = notification.data?.message || "";
  const timestamp = formatTimestamp(notification.created_at);
  const timeAgo = formatRelativeTime(notification.created_at);
  const fallback = getAvatarFallback(title);

  return (
    <div
      className="w-full py-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-4 -mx-4 rounded-xl"
      onClick={() => onItemClick(notification)}
    >
      <div className="flex gap-3">
        <Avatar className="size-11">
          <AvatarImage
            src=""
            alt="Notification avatar"
            className="object-cover ring-1 ring-border"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">{fallback}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col space-y-2">
          <div className="w-full items-start">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{title}</span>
                </div>
                {isUnread && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => onMarkAsRead(notification.id, e)}
                      className="text-[10px] font-semibold text-primary hover:text-primary/80 hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors shrink-0"
                    >
                      Mark read
                    </button>
                    <div className="size-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {timestamp}
                </div>
                <div className="text-xs text-muted-foreground">
                  {timeAgo}
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="rounded-lg bg-muted p-2.5 text-sm tracking-[-0.006em] text-slate-700 dark:text-slate-300">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const router = useRouter();
  const { permissionStatus, requestNotificationPermission } = useChatPushNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const isFetchingRef = useRef(false);

  const fetchUnread = async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/chat")) return;
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const res = await api.get("/notifications/unread?limit=5");
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.count);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const handleMarkAllAsRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setUnreadCount(0);
      setNotifications([]);
      await api.post("/notifications/mark-as-read");
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
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
    if (!isOpen) {
      interval = setInterval(fetchUnread, 30000);
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
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await api.post(`/notifications/mark-as-read/${id}`);
    } catch (err) {
      console.error(err);
      await fetchUnread();
    }
  };

  const handleNotificationClick = (notification: any) => {
    setIsOpen(false);
    const targetUrl = resolveNotificationUrl(notification);
    router.push(targetUrl);

    if (!notification.read_at) {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      api.post(`/notifications/mark-as-read/${notification.id}`).catch((err) => {
        console.error("Failed to mark notification as read in background", err);
      });
    }
  };

  const unreadOnlyCount = notifications.filter(n => !n.read_at).length;

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "unread":
        return notifications.filter(n => !n.read_at);
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

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
      
      <DropdownMenuContent align="end" className="w-[360px] sm:w-[420px] p-0 overflow-hidden shadow-none border-none">
        <div className="flex w-full flex-col gap-6 p-4 md:p-6 bg-card text-card-foreground border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base leading-none font-semibold tracking-[-0.006em]">
              Your notifications
            </h3>
            <div className="flex items-center gap-2">
              <Button className="size-8" variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  className="size-4.5 text-muted-foreground"
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M15.493 6.935a.75.75 0 0 1 .072 1.058l-7.857 9a.75.75 0 0 1-1.13 0l-3.143-3.6a.75.75 0 0 1 1.13-.986l2.578 2.953l7.292-8.353a.75.75 0 0 1 1.058-.072m5.025.085c.3.285.311.76.025 1.06l-8.571 9a.75.75 0 0 1-1.14-.063l-.429-.563a.75.75 0 0 1 1.076-1.032l7.978-8.377a.75.75 0 0 1 1.06-.026"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
              <Link href="/notifications" onClick={() => setIsOpen(false)}>
                <Button className="size-8" variant="ghost" size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    className="size-4.5 text-muted-foreground"
                  >
                    <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                      <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5M9.75 12a2.25 2.25 0 1 1 4.5 0a2.25 2.25 0 0 1-4.5 0" />
                      <path d="M11.975 1.25c-.445 0-.816 0-1.12.02a2.8 2.8 0 0 0-.907.19a2.75 2.75 0 0 0-1.489 1.488c-.145.35-.184.72-.2 1.122a.87.87 0 0 1-.415.731a.87.87 0 0 1-.841-.005c-.356-.188-.696-.339-1.072-.389a2.75 2.75 0 0 0-2.033.545a2.8 2.8 0 0 0-.617.691c-.17.254-.356.575-.578.96l-.025.044c-.223.385-.408.706-.542.98c-.14.286-.25.568-.29.88a2.75 2.75 0 0 0 .544 2.033c.231.301.532.52.872.734a.87.87 0 0 1 .426.726a.87.87 0 0 1-.426.726c-.34.214-.64.433-.872.734a2.75 2.75 0 0 0-.545 2.033c.041.312.15.594.29.88c.135.274.32.595.543.98l.025.044c.222.385.408.706.578.96c.177.263.367.5.617.69a2.75 2.75 0 0 0 2.033.546c.376-.05.716-.2 1.072-.389a.87.87 0 0 1 .84-.005a.86.86 0 0 1 .417.731c.015.402.054.772.2 1.122a2.75 2.75 0 0 0 1.488 1.489c.29.12.59.167.907.188c.304.021.675.021 1.12.021h.05c.445 0 .816 0 1.12-.02c.318-.022.617-.069.907-.19a2.75 2.75 0 0 0 1.489-1.488c.145-.35.184-.72.2-1.122a.87.87 0 0 1 .415-.732a.87.87 0 0 1 .841.006c.356.188.696.339 1.072.388a2.75 2.75 0 0 0 2.033-.544c.25-.192.44-.428.617-.691c.17-.254.356-.575.578-.96l.025-.044c.223-.385.408-.706.542-.98c.14-.286.25-.569.29-.88a2.75 2.75 0 0 0-.544-2.033c-.231-.301-.532-.52-.872-.734a.87.87 0 0 1-.426-.726c0-.278.152-.554.426-.726c.34-.214.64-.433.872-.734a2.75 2.75 0 0 0 .545-2.033a2.8 2.8 0 0 0-.29-.88a18 18 0 0 0-.543-.98l-.025-.044a18 18 0 0 0-.578-.96a2.8 2.8 0 0 0-.617-.69a2.75 2.75 0 0 0-2.033-.546c-.376.05-.716.2-1.072.389a.87.87 0 0 1-.84.005a.87.87 0 0 1-.417-.731c-.015-.402-.054-.772-.2-1.122a2.75 2.75 0 0 0-1.488-1.489c-.29-.12-.59-.167-.907-.188c-.304-.021-.675-.021-1.12-.021zm-1.453 1.595c.077-.032.194-.061.435-.078c.247-.017.567-.017 1.043-.017s.796 0 1.043.017c.241.017.358.046.435.078c.307.127.55.37.677.677c.04.096.073.247.086.604c.03.792.439 1.555 1.165 1.974s1.591.392 2.292.022c.316-.167.463-.214.567-.227a1.25 1.25 0 0 1 .924.247c.066.051.15.138.285.338c.139.206.299.483.537.895s.397.69.506.912c.107.217.14.333.15.416a1.25 1.25 0 0 1-.247.924c-.064.083-.178.187-.48.377c-.672.422-1.128 1.158-1.128 1.996s.456 1.574 1.128 1.996c.302.19.416.294.48.377c.202.263.29.595.247.924c-.01.083-.044.2-.15.416c-.109.223-.268.5-.506.912s-.399.689-.537.895c-.135.2-.219.287-.285.338a1.25 1.25 0 0 1-.924.247c-.104-.013-.25-.06-.567-.227c-.7-.37-1.566-.398-2.292.021s-1.135 1.183-1.165 1.975c-.013.357-.046.508-.086.604a1.25 1.25 0 0 1-.677.677c-.077.032-.194.061-.435.078c-.247.017-.567.017-1.043.017s-.796 0-1.043-.017c-.241-.017-.358-.046-.435-.078a1.25 1.25 0 0 1-.677-.677c-.04-.096-.073-.247-.086-.604c-.03-.792-.439-1.555-1.165-1.974s-1.591-.392-2.292-.022c-.316.167-.463.214-.567.227a1.25 1.25 0 0 1-.924-.247c-.066-.051-.15-.138-.285-.338a17 17 0 0 1-.537-.895c-.238-.412-.397-.69-.506-.912c-.107-.217-.14-.333-.15-.416a1.25 1.25 0 0 1 .247-.924c.064-.083.178-.187.48-.377c.672-.422 1.128-1.158 1.128-1.996s-.456-1.574-1.128-1.996c-.302-.19-.416-.294-.48-.377a1.25 1.25 0 0 1-.247-.924c.01-.083.044-.2.15-.416c.109-.223.268-.5.506-.912s.399-.689.537-.895c.135-.2.219-.287.285-.338a1.25 1.25 0 0 1 .924-.247c.104.013.25.06.567.227c.7.37 1.566.398 2.292-.022c.726-.419 1.135-1.182 1.165-1.974c.013-.357.046-.508.086-.604c.127-.307.37-.55.677-.677" />
                    </g>
                  </svg>
                </Button>
              </Link>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex-col justify-start"
          >
            <div className="flex items-center justify-between">
              <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 [&_button]:gap-1.5">
                <TabsTrigger value="all">
                  View all
                  <Badge variant="secondary">{notifications.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread <Badge variant="secondary">{unreadOnlyCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className="h-full p-0">
            {permissionStatus !== "granted" && (
              <div className="mb-4 px-3.5 py-2 bg-muted/50 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">🔔</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-tight">
                      Enable push notifications
                    </p>
                  </div>
                </div>
                <Button
                  onClick={requestNotificationPermission}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  Enable
                </Button>
              </div>
            )}

            <div className="space-y-0 divide-y divide-dashed divide-border max-h-[380px] overflow-y-auto px-4 -mx-4 custom-scrollbar">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onItemClick={handleNotificationClick}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted-foreground"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="m13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium tracking-[-0.006em] text-muted-foreground">
                    No notifications yet.
                  </p>
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="pt-4 border-t mt-4 flex justify-between">
                <Button variant="ghost" className="text-xs" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </Button>
                <Link href="/notifications" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="text-xs">
                    View full history
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
