"use client";

import { useEffect, useState } from "react";
import { Heart, Send, Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EMOJIS = [
  "😊", "😍", "🎉", "🎊", "🎈", "🎁",
  "💝", "💖", "💗", "💓", "💕", "🌟",
  "✨", "🌈", "🦋", "🌸", "🌺", "🌻",
  "🎂", "🍰", "🧁", "🍾", "🥂", "🎵",
  "😂", "🤗", "😘", "🥳", "🎯", "👏"
];

export function BirthdayWishBox({ userId }: { userId: number }) {
  const [wishes, setWishes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    fetchWishes();
  }, [userId]);

  const fetchWishes = async () => {
    try {
      const res = await api.get(`/users/${userId}/wishes`);
      setWishes(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch wishes", err);
      setError("Failed to load wishes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post("/birthday-wishes", {
        birthday_user_id: userId,
        message: message.trim(),
      });

      setWishes([res.data.data, ...wishes]);
      setMessage("");
      setShowForm(false);
      setShowEmojiPicker(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send wish");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-400" />
        <h2 className="text-xl font-bold text-white">Birthday Wishes</h2>
        <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full ml-auto">
          {wishes.length} wishes
        </span>
      </div>

      {/* Add Wish Form */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Heart className="w-4 h-4 mr-2" />
          Add Your Wish
        </Button>
      ) : (
        <form onSubmit={handleSubmitWish} className="space-y-4">
          {/* Textarea */}
          <Textarea
            placeholder="Write your birthday wish message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white placeholder-slate-400"
          />

          {/* Emoji Picker */}
          <div className="relative z-40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <Smile className="w-4 h-4 mr-2" />
              Add Emoji
            </Button>

            {/* Emoji Grid */}
            {showEmojiPicker && (
              <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-white/20 rounded-lg p-3 grid grid-cols-6 gap-1 shadow-2xl z-50 backdrop-blur-sm" style={{ minWidth: '240px' }}>
                {EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleEmojiClick(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-3xl p-2 rounded hover:bg-white/10 transition-all duration-150 active:scale-90 flex items-center justify-center"
                    style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="flex-1 bg-pink-600 hover:bg-pink-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Wish
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setMessage("");
                setShowEmojiPicker(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded">
          {error}
        </div>
      )}

      {/* Wishes List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-slate-400">Loading wishes...</div>
        ) : wishes.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No wishes yet. Be the first to wish!</p>
          </div>
        ) : (
          wishes.map((wish) => (
            <div key={wish.id} className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={wish.sender.profile_photo_path} />
                  <AvatarFallback>
                    {wish.sender.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">
                    {wish.sender.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(wish.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                {wish.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
