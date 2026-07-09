"use client";

import { useState } from "react";
import { Heart, Send, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth";

interface UpcomingBirthdaysProps {
  items: any[];
}

export function UpcomingBirthdaysWithWishes({ items }: UpcomingBirthdaysProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBirthdayId, setSelectedBirthdayId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendWish = async () => {
    if (!message.trim() || selectedBirthdayId === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/birthday-wishes", {
        birthday_user_id: selectedBirthdayId,
        message: message.trim(),
      });

      setMessage("");
      setSelectedBirthdayId(null);
      alert("🎉 Wish sent successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send wish. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="premium-card p-6">
        <h3 className="font-bold text-white mb-4">🎂 Upcoming Birthdays</h3>
        <p className="text-sm text-slate-400">No upcoming birthdays in the next 30 days.</p>
      </div>
    );
  }

  const person = items[currentIndex];
  const isToday = person.days_remaining === 0;
  const isSelf = currentUser?.id === person.id;
  const canWish = isToday && !isSelf;

  return (
    <div className="premium-card p-6 space-y-4">
      <h3 className="font-bold text-white">🎂 Upcoming Birthdays</h3>

      {/* Rotating Card */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>

        <div className="flex-1 min-w-0 flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={person.profile_photo_path} />
              <AvatarFallback>{person.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate text-sm">{person.name}</p>
              <p className="text-xs text-slate-400 truncate">{person.designation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-xs font-bold text-amber-400">{person.date?.split("-")[2]} {["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(person.date?.split("-")[1] || "0")]}</p>
              {isToday ? (
                <span className="text-[10px] uppercase font-bold bg-pink-500 text-white px-1.5 py-0.5 rounded inline-block mt-0.5">TODAY!</span>
              ) : (
                <span className="text-[10px] uppercase font-bold text-slate-400">In {person.days_remaining}d</span>
              )}
            </div>

            {canWish ? (
              <button
                onClick={() => setSelectedBirthdayId(person.id)}
                className="p-1.5 hover:bg-pink-500/20 rounded text-pink-400 hover:text-pink-300"
                title="Send birthday wish"
              >
                <Heart className="w-4 h-4 fill-pink-400" />
              </button>
            ) : (
              <div className="p-1.5 text-slate-500">
                <Heart className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
          disabled={currentIndex === items.length - 1}
          className="p-2 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`rounded-full transition ${idx === currentIndex ? "bg-amber-400 w-2 h-2" : "bg-slate-600 w-1.5 h-1.5"}`}
          />
        ))}
      </div>

      {/* Wish Modal */}
      {selectedBirthdayId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white">Wish {person.name}</h4>
              <button
                onClick={() => setSelectedBirthdayId(null)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <Textarea
              placeholder="Write your birthday wish..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder-slate-400 mb-4"
            />

            {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

            <div className="flex gap-2">
              <Button
                disabled={isSubmitting || !message.trim()}
                onClick={handleSendWish}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send
              </Button>
              <Button variant="outline" onClick={() => setSelectedBirthdayId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
