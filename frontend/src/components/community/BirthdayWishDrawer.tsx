"use client";

import { useEffect, useState } from "react";
import {
  X,
  Cake,
  PartyPopper,
  Send,
  Loader2,
  Heart,
  MessageSquare,
  Sparkles,
  Gift,
  Smile,
  CheckCircle2,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO } from "date-fns";

export interface WishTargetPerson {
  id: number | string;
  name: string;
  designation?: string;
  profile_photo_path?: string;
  type: "birthday" | "anniversary";
  years?: number;
  date?: string;
}

interface BirthdayWishDrawerProps {
  person: WishTargetPerson | null;
  onClose: () => void;
  onWishSent?: () => void;
}

export function BirthdayWishDrawer({
  person,
  onClose,
  onWishSent,
}: BirthdayWishDrawerProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [message, setMessage] = useState("");
  const [wishes, setWishes] = useState<any[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (!person) return;

    // Set initial friendly template
    if (person.type === "birthday") {
      setMessage(`Happy birthday ${person.name} 🎉`);
    } else {
      setMessage(`Happy work anniversary ${person.name} 🎊`);
    }

    setSentSuccess(false);
    fetchWishes();
  }, [person]);

  const fetchWishes = async () => {
    if (!person) return;
    try {
      setLoadingWishes(true);
      const res = await api.get(`/users/${person.id}/wishes`);
      setWishes(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load wishes for user", err);
    } finally {
      setLoadingWishes(false);
    }
  };

  const handleSendWish = async () => {
    if (!person || !message.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.post("/birthday-wishes", {
        birthday_user_id: Number(person.id),
        message: message.trim(),
      });

      setSentSuccess(true);
      if (onWishSent) onWishSent();
      fetchWishes();
    } catch (err: any) {
      console.error("Failed to send wish", err);
      alert(err.response?.data?.message || "Failed to send wish. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!person) return null;

  const isBirthday = person.type === "birthday";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
        
        {/* Header with Confetti Background */}
        <div className="relative p-6 text-center border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-purple-50/80 to-white dark:from-slate-850 dark:to-slate-900 overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Festive Icon / Confetti effect */}
          <div className="absolute top-2 left-6 opacity-30 text-2xl select-none">🎉</div>
          <div className="absolute top-8 right-12 opacity-25 text-xl select-none">✨</div>
          <div className="absolute bottom-2 left-14 opacity-25 text-xl select-none">🎈</div>

          {/* Large Avatar */}
          <div className="relative inline-block mx-auto mb-3">
            <RoyalAvatar
              src={person.profile_photo_path}
              name={person.name}
              userId={Number(person.id)}
              className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-md text-xl"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#56348f] text-white flex items-center justify-center shadow-sm">
              {isBirthday ? <Cake className="w-4 h-4 text-amber-300" /> : <PartyPopper className="w-4 h-4 text-pink-300" />}
            </div>
          </div>

          <h2
            style={{
              fontSize: "18px",
              lineHeight: "26px",
              fontWeight: 600,
              color: "rgb(15, 24, 36)",
            }}
            className="dark:text-white"
          >
            <RoyalName name={person.name} userId={Number(person.id)} />
          </h2>

          <p
            style={{
              fontSize: "12px",
              lineHeight: "18px",
              color: "rgb(94, 105, 120)",
            }}
            className="dark:text-slate-400 mt-0.5"
          >
            {person.designation || "Team Member"}
          </p>

          <p
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              color: "#56348f",
              fontWeight: 500,
            }}
            className="dark:text-purple-400 mt-1"
          >
            {isBirthday ? "Wish them a happy birthday 🎂" : `Wish them work anniversary 🎉`}
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Wish Input Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-md p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-start gap-3">
              <RoyalAvatar
                src={currentUser?.profile_photo_path}
                name={`${currentUser?.first_name} ${currentUser?.last_name}`}
                userId={currentUser?.id}
                className="w-9 h-9 rounded-full shrink-0"
              />
              <div className="flex-1 min-w-0">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={`Write your ${isBirthday ? 'birthday' : 'anniversary'} wish...`}
                  className="w-full text-[13px] leading-relaxed p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] focus:border-[#56348f] dark:text-white resize-none"
                />

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Delivered to their Birthday Inbox</span>
                  </div>

                  <button
                    onClick={handleSendWish}
                    disabled={!message.trim() || submitting}
                    className="px-4 py-1.5 bg-[#56348f] hover:bg-[#452773] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:text-white cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Wish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {sentSuccess && (
              <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-md text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Your wish has been posted and notified to {person.name}! 🎉</span>
              </div>
            )}
          </div>

          {/* Wishes Received Feed Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3
                style={{
                  fontSize: "14px",
                  lineHeight: "22px",
                  fontWeight: 600,
                  color: "rgb(15, 24, 36)",
                }}
                className="dark:text-white flex items-center gap-2"
              >
                <span>Wishes Received ({wishes.length})</span>
              </h3>
            </div>

            {loadingWishes ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : wishes.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-dashed border-slate-200 dark:border-slate-700/60 p-6">
                <PartyPopper className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Be the first one to wish {person.name}!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Type your message above and click Wish.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {wishes.map((wish: any) => {
                  const senderName = wish.sender
                    ? `${wish.sender.first_name} ${wish.sender.last_name}`
                    : "Colleague";

                  return (
                    <div
                      key={wish.id}
                      className="p-3.5 bg-white dark:bg-slate-800/80 rounded-md border border-slate-200/80 dark:border-slate-700/60 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <RoyalAvatar
                            src={wish.sender?.profile_photo_path}
                            name={senderName}
                            userId={wish.sender_id}
                            className="w-7 h-7 rounded-full"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {senderName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {wish.created_at
                                ? format(parseISO(wish.created_at), "MMM d, yyyy 'at' h:mm a")
                                : "Recently"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 pl-9">
                        {wish.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
