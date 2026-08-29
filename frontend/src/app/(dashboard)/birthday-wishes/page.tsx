"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  Cake,
  Send,
  Loader2,
  Search,
  Calendar,
  Sparkles,
  MessageSquare,
  Smile,
  CheckCircle2,
  Inbox,
  UserCheck,
} from "lucide-react";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoyalAvatar } from "@/components/ui/RoyalAvatar";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useAuthStore } from "@/store/auth";

interface Wish {
  id: number;
  sender: {
    id: number;
    name: string;
    designation?: string;
    profile_photo_path?: string;
  };
  message: string;
  created_at: string;
}

interface BirthdayPerson {
  id: number;
  name: string;
  designation?: string;
  profile_photo_path?: string;
  date: string;
  days_remaining?: number;
}

const EMOJI_SHORTCUTS = ["🎉", "🎂", "🎈", "✨", "💖", "🥂", "💐", "🌟"];

export default function BirthdayWishesPage() {
  const currentUser = useAuthStore((state) => state.user);

  // Tabs: "received" | "upcoming"
  const [activeTab, setActiveTab] = useState<"received" | "upcoming">("received");

  // Data states
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<BirthdayPerson | null>(null);

  // Message composer
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [wishesRes, dashboardRes] = await Promise.allSettled([
        api.get("/birthday-wishes/my-wishes"),
        api.get("/dashboard"),
      ]);

      let loadedWishes: Wish[] = [];
      if (wishesRes.status === "fulfilled" && wishesRes.value.data?.data) {
        loadedWishes = wishesRes.value.data.data;
        setWishes(loadedWishes);
        if (loadedWishes.length > 0) {
          setSelectedWish(loadedWishes[0]);
        }
      }

      if (dashboardRes.status === "fulfilled") {
        const dData = dashboardRes.value.data;
        const bdays: BirthdayPerson[] = dData?.upcoming_birthdays || [];
        setUpcomingBirthdays(bdays);
        if (loadedWishes.length === 0 && bdays.length > 0) {
          setSelectedPerson(bdays[0]);
          setActiveTab("upcoming");
        }
      }
    } catch (err) {
      console.error("Failed to load birthday data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyWishes = async () => {
    try {
      const res = await api.get("/birthday-wishes/my-wishes");
      const list = res.data?.data || [];
      setWishes(list);
      if (list.length > 0 && !selectedWish) {
        setSelectedWish(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch my wishes", err);
    }
  };

  const handleSendWish = async () => {
    if (!replyMessage.trim() || isSending) return;

    // Target recipient
    const targetUserId =
      activeTab === "upcoming"
        ? selectedPerson?.id
        : selectedWish?.sender?.id;

    if (!targetUserId) return;

    setIsSending(true);
    setErrorMessage(null);
    setSendSuccess(false);

    try {
      await api.post("/birthday-wishes", {
        birthday_user_id: Number(targetUserId),
        message: replyMessage.trim(),
      });

      setSendSuccess(true);
      setReplyMessage("");
      setTimeout(() => setSendSuccess(false), 4000);
      fetchMyWishes();
    } catch (err: any) {
      console.error("Failed to send wish", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to send message. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr.replace(" ", "T"));
      return formatDistanceToNow(date, { addSuffix: true })
        .replace("about ", "")
        .replace("hours ago", "h ago")
        .replace("hour ago", "1h ago")
        .replace("days ago", "d ago")
        .replace("day ago", "1d ago")
        .replace("minutes ago", "m ago");
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Filtered lists
  const filteredWishes = wishes.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      w.sender?.name?.toLowerCase().includes(q) ||
      w.message?.toLowerCase().includes(q) ||
      w.sender?.designation?.toLowerCase().includes(q)
    );
  });

  const filteredUpcoming = upcomingBirthdays.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.name?.toLowerCase().includes(q) ||
      b.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        fontFamily:
          '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-4 max-w-7xl mx-auto pb-10"
    >
      {/* Top Header Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div>
          <h1
            style={{
              fontSize: "20px",
              lineHeight: "28px",
              fontWeight: 600,
              color: "rgb(15, 24, 36)",
            }}
            className="dark:text-white flex items-center gap-2"
          >
            <Cake className="w-5 h-5 text-amber-500" />
            Birthday Wishes Inbox
          </h1>
          <p
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              color: "rgb(94, 105, 120)",
            }}
            className="dark:text-slate-400 font-normal"
          >
            View received birthday greetings and celebrate with your teammates
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab("received");
              if (wishes.length > 0 && !selectedWish) {
                setSelectedWish(wishes[0]);
              }
            }}
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: activeTab === "received" ? 600 : 400,
            }}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "received"
                ? "bg-white dark:bg-slate-700 text-[#56348f] dark:text-purple-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Received Wishes</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "received"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {wishes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("upcoming");
              if (upcomingBirthdays.length > 0 && !selectedPerson) {
                setSelectedPerson(upcomingBirthdays[0]);
              }
            }}
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              fontWeight: activeTab === "upcoming" ? 600 : 400,
            }}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "upcoming"
                ? "bg-white dark:bg-slate-700 text-[#56348f] dark:text-purple-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Send Wishes / Upcoming</span>
            {upcomingBirthdays.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {upcomingBirthdays.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Master-Detail Split Screen Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[580px] h-[calc(100vh-210px)] max-h-[780px]">
        {/* ── LEFT COLUMN (Inbox List: Name & Subject) ── */}
        <div className="w-full md:w-[360px] lg:w-[380px] border-r border-slate-200/90 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-slate-900">
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
            <div className="flex items-center justify-between mb-2">
              <span
                style={{
                  fontSize: "11px",
                  lineHeight: "16px",
                  fontWeight: 600,
                  color: "rgb(94, 105, 120)",
                  letterSpacing: "0.05em",
                }}
                className="uppercase dark:text-slate-400"
              >
                {activeTab === "received" ? "RECEIVED INBOX" : "UPCOMING CELEBRATIONS"}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "rgb(94, 105, 120)",
                }}
              >
                {activeTab === "received" ? `${filteredWishes.length} wishes` : `${filteredUpcoming.length} members`}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "received"
                    ? "Search by employee name, message..."
                    : "Search employee by name..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  fontSize: "13px",
                  lineHeight: "20px",
                  color: "rgb(15, 24, 36)",
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:ring-1 focus:ring-[#56348f] focus:border-[#56348f] dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#56348f] mx-auto" />
                <p
                  style={{ fontSize: "13px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400"
                >
                  Loading birthday inbox...
                </p>
              </div>
            ) : activeTab === "received" ? (
              filteredWishes.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white"
                  >
                    No wishes found
                  </p>
                  <p
                    style={{ fontSize: "12px", color: "rgb(94, 105, 120)" }}
                    className="dark:text-slate-400"
                  >
                    {searchQuery
                      ? "Try searching with a different name or keyword."
                      : "When your team sends birthday greetings, they'll show up here."}
                  </p>
                </div>
              ) : (
                filteredWishes.map((wish) => {
                  const isSelected = selectedWish?.id === wish.id;
                  return (
                    <div
                      key={wish.id}
                      onClick={() => {
                        setSelectedWish(wish);
                        setReplyMessage("");
                      }}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-[3px] ${
                        isSelected
                          ? "bg-purple-50/60 dark:bg-purple-950/25 border-l-[#56348f]"
                          : "border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      {/* Avatar with RoyalAvatar */}
                      <div className="shrink-0">
                        <RoyalAvatar
                          src={wish.sender?.profile_photo_path}
                          name={wish.sender?.name || "Colleague"}
                          userId={wish.sender?.id}
                          className="w-9 h-9 text-xs font-bold"
                          showCrownBadge={false}
                        />
                      </div>

                      {/* Info & Snippet */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p
                            style={{
                              fontSize: "13px",
                              lineHeight: "20px",
                              fontWeight: isSelected ? 600 : 500,
                              color: "rgb(15, 24, 36)",
                            }}
                            className="truncate dark:text-white"
                          >
                            {wish.sender?.name || "Colleague"}
                          </p>
                          <span
                            style={{
                              fontSize: "11px",
                              lineHeight: "16px",
                              color: "rgb(94, 105, 120)",
                            }}
                            className="shrink-0 dark:text-slate-400"
                          >
                            {getRelativeTime(wish.created_at)}
                          </span>
                        </div>

                        {/* Subject / Message Snippet */}
                        <p
                          style={{
                            fontSize: "13px",
                            lineHeight: "20px",
                            color: "rgb(94, 105, 120)",
                          }}
                          className="truncate dark:text-slate-400"
                        >
                          {wish.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )
            ) : filteredUpcoming.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Cake className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white"
                >
                  No upcoming birthdays
                </p>
                <p
                  style={{ fontSize: "12px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400"
                >
                  No birthdays recorded in the next 30 days.
                </p>
              </div>
            ) : (
              filteredUpcoming.map((person) => {
                const isSelected = selectedPerson?.id === person.id;
                const isToday = person.days_remaining === 0;
                return (
                  <div
                    key={person.id}
                    onClick={() => {
                      setSelectedPerson(person);
                      setReplyMessage(`Happy birthday ${person.name} 🎉! Wishing you a wonderful year ahead.`);
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-[3px] ${
                      isSelected
                        ? "bg-amber-50/60 dark:bg-amber-950/25 border-l-amber-500"
                        : "border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Avatar with RoyalAvatar */}
                    <div className="shrink-0">
                      <RoyalAvatar
                        src={person.profile_photo_path}
                        name={person.name}
                        userId={person.id}
                        className="w-9 h-9 text-xs font-bold"
                        showCrownBadge={false}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          style={{
                            fontSize: "13px",
                            lineHeight: "20px",
                            fontWeight: isSelected ? 600 : 500,
                            color: "rgb(15, 24, 36)",
                          }}
                          className="truncate dark:text-white"
                        >
                          {person.name}
                        </p>
                        {isToday ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.2 rounded-full">
                            Today!
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "rgb(94, 105, 120)",
                            }}
                            className="shrink-0 dark:text-slate-400"
                          >
                            {person.date ? format(new Date(person.date), "MMM d") : ""}
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: "13px",
                          lineHeight: "20px",
                          color: "rgb(94, 105, 120)",
                        }}
                        className="truncate dark:text-slate-400"
                      >
                        {person.designation || "Team Member"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (Wish Box & Message Composer) ── */}
        <div className="flex-1 flex flex-col justify-between bg-white dark:bg-slate-900 overflow-hidden">
          {activeTab === "received" ? (
            selectedWish ? (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                {/* Detail Header */}
                <div className="p-6 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <h2
                      style={{
                        fontSize: "20px",
                        lineHeight: "28px",
                        fontWeight: 600,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:text-white"
                    >
                      Birthday Wish from {selectedWish.sender?.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5" />
                        {getRelativeTime(selectedWish.created_at)}
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      color: "rgb(94, 105, 120)",
                    }}
                    className="dark:text-slate-400"
                  >
                    Initiated on{" "}
                    {format(
                      parseISO(selectedWish.created_at.replace(" ", "T")),
                      "dd MMMM yyyy, hh:mm a"
                    )}
                  </p>
                </div>

                {/* Wish Message Content Body */}
                <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                  {/* Sender Banner */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <RoyalAvatar
                      src={selectedWish.sender?.profile_photo_path}
                      name={selectedWish.sender?.name || "Colleague"}
                      userId={selectedWish.sender?.id}
                      className="w-10 h-10 text-sm font-bold"
                      showCrownBadge={true}
                    />
                    <div>
                      <h4
                        style={{
                          fontSize: "14px",
                          lineHeight: "20px",
                          fontWeight: 600,
                          color: "rgb(15, 24, 36)",
                        }}
                        className="dark:text-white"
                      >
                        {selectedWish.sender?.name}
                      </h4>
                      <p
                        style={{
                          fontSize: "12px",
                          lineHeight: "16px",
                          color: "rgb(94, 105, 120)",
                        }}
                        className="dark:text-slate-400"
                      >
                        {selectedWish.sender?.designation || "Team Member"}
                      </p>
                    </div>
                  </div>

                  {/* Message Quote Box */}
                  <div className="p-5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 space-y-2">
                    <p
                      style={{
                        fontSize: "14px",
                        lineHeight: "24px",
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:text-slate-200 whitespace-pre-wrap"
                    >
                      {selectedWish.message}
                    </p>
                  </div>
                </div>

                {/* Bottom Reply Composer */}
                <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      style={{
                        fontSize: "13px",
                        lineHeight: "20px",
                        fontWeight: 600,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:text-white flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                      Send a Thank You Message
                    </span>

                    {/* Quick Emojis */}
                    <div className="flex items-center gap-1">
                      {EMOJI_SHORTCUTS.slice(0, 5).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setReplyMessage((prev) => prev + emoji)}
                          className="hover:bg-slate-200 dark:hover:bg-slate-700 text-sm px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Input Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Reply to ${selectedWish.sender?.name || "colleague"}...`}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendWish();
                        }
                      }}
                      style={{
                        fontSize: "13px",
                        lineHeight: "20px",
                        color: "rgb(15, 24, 36)",
                      }}
                      className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f] dark:text-white placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={handleSendWish}
                      disabled={isSending || !replyMessage.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#56348f] hover:bg-purple-800 active:bg-purple-900 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Send</span>
                    </button>
                  </div>

                  {sendSuccess && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Message sent successfully!
                    </p>
                  )}
                  {errorMessage && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div className="max-w-xs space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 text-[#56348f] dark:text-purple-400 flex items-center justify-center mx-auto">
                    <Cake className="w-6 h-6" />
                  </div>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white"
                  >
                    Select a wish from the inbox
                  </h3>
                  <p
                    style={{ fontSize: "13px", color: "rgb(94, 105, 120)" }}
                    className="dark:text-slate-400"
                  >
                    Choose any birthday greeting on the left to view the complete message and send a reply.
                  </p>
                </div>
              </div>
            )
          ) : selectedPerson ? (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <h2
                    style={{
                      fontSize: "20px",
                      lineHeight: "28px",
                      fontWeight: 600,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white"
                  >
                    {selectedPerson.name}&apos;s Birthday Celebration
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedPerson.days_remaining === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-rose-500 px-3 py-1 rounded-md shadow-xs animate-pulse">
                        🎂 Celebrating Today!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5" />
                        In {selectedPerson.days_remaining} days (
                        {format(new Date(selectedPerson.date), "MMM d")})
                      </span>
                    )}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: "20px",
                    color: "rgb(94, 105, 120)",
                  }}
                  className="dark:text-slate-400"
                >
                  Send your personalized birthday wishes to make their day special!
                </p>
              </div>

              {/* Colleague Details */}
              <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <RoyalAvatar
                    src={selectedPerson.profile_photo_path}
                    name={selectedPerson.name}
                    userId={selectedPerson.id}
                    className="w-14 h-14 text-base font-bold"
                    showCrownBadge={true}
                  />
                  <div>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgb(15, 24, 36)",
                      }}
                      className="dark:text-white"
                    >
                      {selectedPerson.name}
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "rgb(94, 105, 120)",
                      }}
                      className="dark:text-slate-400"
                    >
                      {selectedPerson.designation || "Team Member"}
                    </p>
                  </div>
                </div>

                {/* Wish Templates Suggestions */}
                <div className="space-y-2">
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "rgb(94, 105, 120)",
                    }}
                    className="uppercase tracking-wider block"
                  >
                    Quick Wish Starters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      `Happy birthday ${selectedPerson.name}! 🎉 Wishing you great success and joy!`,
                      `Wishing you a fantastic birthday and an amazing year ahead ${selectedPerson.name}! 🎂`,
                      `Happy Birthday! May all your dreams come true this year! 🌟✨`,
                    ].map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyMessage(tmpl)}
                        className="text-left text-xs bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 transition-all cursor-pointer"
                      >
                        &ldquo;{tmpl}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Send Wish Composer */}
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      fontWeight: 600,
                      color: "rgb(15, 24, 36)",
                    }}
                    className="dark:text-white flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4 text-[#56348f] dark:text-purple-400" />
                    Write a Birthday Wish
                  </span>

                  {/* Quick Emojis */}
                  <div className="flex items-center gap-1">
                    {EMOJI_SHORTCUTS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setReplyMessage((prev) => prev + emoji)}
                        className="hover:bg-slate-200 dark:hover:bg-slate-700 text-sm px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input row */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Type your birthday wish for ${selectedPerson.name}...`}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendWish();
                      }
                    }}
                    style={{
                      fontSize: "13px",
                      lineHeight: "20px",
                      color: "rgb(15, 24, 36)",
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#56348f]/20 focus:border-[#56348f] dark:text-white placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={handleSendWish}
                    disabled={isSending || !replyMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#56348f] hover:bg-purple-800 active:bg-purple-900 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Send Wish</span>
                  </button>
                </div>

                {sendSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Your birthday wish was delivered to {selectedPerson.name}!
                  </p>
                )}
                {errorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-xs space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "rgb(15, 24, 36)",
                  }}
                  className="dark:text-white"
                >
                  Select a teammate
                </h3>
                <p
                  style={{ fontSize: "13px", color: "rgb(94, 105, 120)" }}
                  className="dark:text-slate-400"
                >
                  Choose any upcoming birthday on the left to write and send a personalized wish.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
