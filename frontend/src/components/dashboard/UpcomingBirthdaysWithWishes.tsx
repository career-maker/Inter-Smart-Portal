"use client";

import { useState } from "react";
import { Heart, Send, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth";
import { WishButton } from "@/components/ui/WishButton";

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
      const payload = {
        birthday_user_id: selectedBirthdayId,
        message: message.trim(),
      };

      console.log("Sending wish with payload:", payload);
      console.log("Current user:", currentUser);
      console.log("Selected person ID:", selectedBirthdayId, "Type:", typeof selectedBirthdayId);

      const response = await api.post("/birthday-wishes", payload);

      console.log("Wish response:", response.data);
      setMessage("");
      setSelectedBirthdayId(null);
      alert("🎉 Wish sent successfully!");
    } catch (err: any) {
      console.error("Full error object:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error message:", err.message);
      console.error("Error status:", err.response?.status);
      setError(err.response?.data?.message || err.message || "Failed to send wish. Please check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recalculate days_remaining based on current date to ensure accuracy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const itemsWithRecalculatedDays = items.map((item: any) => {
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.round((itemDate.getTime() - today.getTime()) / 86400000);
    return { ...item, days_remaining: daysRemaining };
  });

  // Filter out past birthdays (days_remaining < 0)
  const upcomingItems = itemsWithRecalculatedDays.filter((item: any) => item.days_remaining >= 0);

  if (!upcomingItems || upcomingItems.length === 0) {
    return (
      <div className="premium-card p-6 flex flex-col justify-center" style={{ height: '224px' }}>
        <h3 className="font-bold text-foreground mb-4">🎂 Upcoming Birthdays</h3>
        <p className="text-sm text-muted-foreground">No upcoming birthdays in the next 30 days.</p>
      </div>
    );
  }

  // Reset index if current index is out of bounds
  const safeIndex = currentIndex >= upcomingItems.length ? upcomingItems.length - 1 : currentIndex;
  const person = upcomingItems[safeIndex];

  // Defensive checks for person object
  if (!person || typeof person !== 'object') {
    return (
      <div className="premium-card p-6 flex flex-col justify-center" style={{ height: '224px' }}>
        <h3 className="font-bold text-foreground mb-4">🎂 Upcoming Birthdays</h3>
        <p className="text-sm text-muted-foreground">Unable to load birthday data.</p>
      </div>
    );
  }

  const isToday = person.days_remaining === 0;
  const isSelf = currentUser?.id === person.id;
  const canWish = isToday && !isSelf;

  return (
    <div className="premium-card p-6 flex flex-col" style={{ height: '224px' }}>
      <h3 className="font-bold text-foreground shrink-0 mb-4 text-sm">🎂 Upcoming Birthdays</h3>

      {/* Rotating Card */}
      <div className="flex items-center justify-center gap-3 flex-1 min-h-0">
        <button
          onClick={() => setCurrentIndex(Math.max(0, safeIndex - 1))}
          disabled={safeIndex === 0}
          className="p-2 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex flex-col items-center justify-center gap-2.5 flex-1">
          {/* Avatar centered */}
          <div className="group relative shrink-0">
            <Avatar className="h-12 w-12 cursor-help">
              <AvatarImage src={person.profile_photo_path} />
              <AvatarFallback>
                {typeof person.name === 'string' ? person.name?.[0] : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-950 border border-slate-700 text-foreground text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg font-medium">
              {typeof person.name === 'string' ? person.name : 'Unknown'}
            </div>
          </div>

          {/* Name pill below avatar */}
          <div className="bg-background px-3 py-1 rounded-full text-center">
            <p className="font-semibold text-foreground text-xs line-clamp-1">
              {typeof person.name === 'string' ? person.name : 'Unknown'}
            </p>
          </div>

          {/* Date and wish button */}
          <div className="flex items-center justify-center gap-2">
            <div className="text-center">
              <p className="text-xs font-bold text-amber-400">
                {typeof person.date === 'string' ? (
                  <>
                    {person.date.split("-")[2]} {["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(person.date.split("-")[1] || "0")]}
                  </>
                ) : (
                  "Date N/A"
                )}
              </p>
              {isToday ? (
                <span className="text-[10px] uppercase font-bold bg-pink-500 text-white px-1.5 py-0.5 rounded inline-block mt-0.5">TODAY!</span>
              ) : (
                <span className="text-[10px] uppercase font-bold text-muted-foreground">In {person.days_remaining}d</span>
              )}
            </div>

            <WishButton 
              onClick={() => setSelectedBirthdayId(person.id)} 
              disabled={!canWish} 
            />
          </div>
        </div>

        <button
          onClick={() => setCurrentIndex(Math.min(upcomingItems.length - 1, safeIndex + 1))}
          disabled={safeIndex === upcomingItems.length - 1}
          className="p-2 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 shrink-0 mt-3">
        {upcomingItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`rounded-full transition ${idx === safeIndex ? "bg-amber-400 w-2 h-2" : "bg-slate-600 w-1.5 h-1.5"}`}
          />
        ))}
      </div>

      {/* Wish Modal - Fixed positioning */}
      {selectedBirthdayId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 pointer-events-auto">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-foreground truncate">{`Wish ${typeof person.name === 'string' ? person.name : 'Unknown'}`}</h4>
              <button
                onClick={() => setSelectedBirthdayId(null)}
                className="p-1 hover:bg-card rounded shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Write your birthday wish..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="bg-white/5 border-border text-white placeholder-slate-400 resize-none"
                maxLength={500}
              />

              <div className="text-xs text-muted-foreground">{message.length}/500</div>

              {error && <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}

              <div className="flex gap-2 pt-2">
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
        </div>
      )}
    </div>
  );
}
