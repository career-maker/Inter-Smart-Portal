"use client";

import { useState, useMemo } from "react";
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

  const todayBirthdays = useMemo(() => items.filter((item) => item.days_remaining === 0), [items]);

  const handleSendWish = async () => {
    if (!message.trim() || selectedBirthdayId === null) return;

    // Prevent self-wishes
    if (currentUser?.id === selectedBirthdayId) {
      setError("You cannot send wishes to yourself!");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        birthday_user_id: selectedBirthdayId,
        message: message.trim(),
      };

      await api.post("/birthday-wishes", payload);

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
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          🎂 Upcoming Birthdays
        </h3>
        <p className="text-sm text-slate-400">No upcoming birthdays in the next 30 days.</p>
      </div>
    );
  }

  const person = items[currentIndex];

  return (
    <div className="premium-card p-6">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        🎂 Upcoming Birthdays
      </h3>

      {/* Rotating Card View */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex-1 flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={person.profile_photo_path} />
              <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white">{person.name}</p>
              <p className="text-xs text-slate-400">{person.designation}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-amber-400">{person.date.split("-")[2]} {["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(person.date.split("-")[1])]}</p>
              {person.days_remaining === 0 ? (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-pink-500 text-white px-2 py-0.5 rounded inline-block mt-1">TODAY!</span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">In {person.days_remaining}d</span>
              )}
            </div>

            {/* Wish Button - Only for Today's Birthday */}
            {person.days_remaining === 0 && currentUser?.id !== person.id ? (
              <button
                onClick={() => setSelectedBirthdayId(person.id)}
                className="p-2 hover:bg-pink-500/20 rounded-lg transition text-pink-400 hover:text-pink-300"
                title="Send birthday wish"
              >
                <Heart className="w-5 h-5 fill-pink-400" />
              </button>
            ) : (
              <div className="p-2 text-slate-500 cursor-not-allowed">
                <Heart className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
          disabled={currentIndex === items.length - 1}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mb-4">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition ${
              idx === currentIndex ? "bg-amber-400 w-6" : "bg-slate-600 w-2"
            }`}
          />
        ))}
      </div>

      {/* Wish Form Modal */}
      {selectedBirthdayId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white">Wish {person.name}</h4>
              <button
                onClick={() => setSelectedBirthdayId(null)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedBirthdayId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
