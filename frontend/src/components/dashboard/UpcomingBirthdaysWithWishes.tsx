"use client";

import { useState } from "react";
import { Heart, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UpcomingBirthdaysProps {
  items: any[];
}

export function UpcomingBirthdaysWithWishes({ items }: UpcomingBirthdaysProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendWish = async (birthdayUserId: number) => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/birthday-wishes", {
        birthday_user_id: birthdayUserId,
        message: message.trim(),
      });

      setMessage("");
      setSelectedUserId(null);
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

  return (
    <div className="premium-card p-6">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        🎂 Upcoming Birthdays
      </h3>

      <div className="space-y-4">
        {items.map((person) => (
          <div key={person.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition">
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

              {/* Wish Button */}
              <button
                onClick={() => setSelectedUserId(person.id)}
                className="p-2 hover:bg-pink-500/20 rounded-lg transition text-pink-400 hover:text-pink-300"
                title="Send birthday wish"
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>

            {/* Wish Form Modal */}
            {selectedUserId === person.id && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-white">Wish {person.name}</h4>
                    <button
                      onClick={() => setSelectedUserId(null)}
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
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      onClick={() => handleSendWish(person.id)}
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
                      onClick={() => setSelectedUserId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
