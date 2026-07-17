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
    <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-400" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Birthday Wishes</h2>
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
        <div className="bg-white border border-slate-200 grid grid-cols-6 gap-2 rounded-xl p-4 text-sm">
          <h1 className="text-center text-slate-900 text-lg font-bold col-span-6">Send Birthday Wish</h1>

          <form onSubmit={handleSubmitWish} className="col-span-6 space-y-3">
            {/* Textarea */}
            <textarea
              placeholder="Write your birthday wish message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-slate-100 text-slate-600 h-28 placeholder:text-slate-600 placeholder:opacity-50 border border-slate-200 col-span-6 resize-none outline-none rounded-lg p-3 duration-300 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 w-full"
            />

            {/* Emoji Buttons Grid */}
            <div className="col-span-6 grid grid-cols-6 gap-2">
              {EMOJIS.slice(0, 5).map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="fill-slate-600 flex justify-center items-center rounded-lg p-2 duration-300 bg-slate-100 hover:border-slate-600 focus:fill-pink-200 focus:bg-pink-400 border border-slate-200 text-lg"
                  title={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="fill-slate-600 flex justify-center items-center rounded-lg p-2 duration-300 bg-slate-100 hover:border-slate-600 focus:fill-blue-200 focus:bg-blue-400 border border-slate-200"
                title="More emojis"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* More Emojis Popup */}
            {showEmojiPicker && (
              <div className="col-span-6 bg-slate-100 border border-slate-200 rounded-lg p-3 grid grid-cols-8 gap-1">
                {EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleEmojiClick(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl p-2 rounded hover:bg-slate-200 transition-all duration-150 active:scale-90 flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="col-span-6 text-xs text-red-600 bg-red-100 p-2 rounded">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="col-span-6 grid grid-cols-6 gap-2">
              <div className="col-span-2"></div>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="col-span-2 bg-slate-100 border border-slate-200 flex justify-center items-center rounded-lg p-3 duration-300 hover:border-slate-600 hover:bg-slate-200 focus:bg-pink-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMessage("");
                  setShowEmojiPicker(false);
                }}
                className="col-span-2 bg-slate-100 stroke-slate-600 border border-slate-200 flex justify-center items-center rounded-lg p-3 duration-300 hover:border-slate-600 hover:text-slate-700 focus:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded">
          {error}
        </div>
      )}

      {/* Wishes List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400">Loading wishes...</div>
        ) : wishes.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No wishes yet. Be the first to wish!</p>
          </div>
        ) : (
          wishes.map((wish) => (
            <div key={wish.id} className="bg-slate-100/50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={wish.sender.profile_photo_path} />
                  <AvatarFallback>
                    {wish.sender.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {wish.sender.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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
