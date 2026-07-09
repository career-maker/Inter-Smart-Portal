"use client";

import { useEffect, useState } from "react";
import { Heart, Calendar, User } from "lucide-react";
import api from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Wish {
  id: number;
  sender: {
    id: number;
    name: string;
    designation: string;
    profile_photo_path: string;
  };
  message: string;
  created_at: string;
}

export default function BirthdayWishesPage() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWishes();
  }, []);

  const fetchWishes = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/birthday-wishes/my-wishes");
      setWishes(res.data.data || []);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch wishes:", err);
      setError(err.response?.data?.message || "Failed to load wishes");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">🎂 Birthday Wishes</h1>
        <p className="text-slate-400">All the lovely wishes from your teammates</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card p-6 animate-pulse">
              <div className="h-20 bg-slate-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : wishes.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Heart className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No wishes yet</h3>
          <p className="text-slate-400">
            When your team sends you birthday wishes, they'll appear here! 💕
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-400 mb-4">
            {wishes.length} {wishes.length === 1 ? "wish" : "wishes"} received
          </div>

          {wishes.map((wish) => (
            <div key={wish.id} className="premium-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={wish.sender.profile_photo_path} />
                    <AvatarFallback>{wish.sender.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">
                      {wish.sender.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {wish.sender.designation || "Team Member"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {formatDate(wish.created_at)}
                </div>
              </div>

              <p className="text-white leading-relaxed border-l-2 border-amber-500/30 pl-4">
                {wish.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="premium-card p-6 bg-red-500/10 border border-red-500/20">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
