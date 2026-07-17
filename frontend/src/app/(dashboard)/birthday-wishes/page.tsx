"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Loader2 } from "lucide-react";
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

const COLORS = [
  "from-yellow-200 to-yellow-100",
  "from-pink-100 to-red-100",
  "from-blue-100 to-cyan-100",
  "from-green-100 to-emerald-100",
  "from-purple-100 to-pink-100",
  "from-orange-100 to-red-100",
];

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

  const getColor = (index: number) => COLORS[index % COLORS.length];

  const getRotation = (index: number) => {
    const rotations = [-3, -2, -1, 0, 1, 2, 3];
    return rotations[index % rotations.length];
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Lottie Animation Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <iframe
          src="https://lottie.host/embed/949f9248-9d01-4c9f-b92f-71a99dfb3a22/a1lq4cnCai.json"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "0",
          }}
        ></iframe>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="px-6 py-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2 drop-shadow-lg">
            🎂 Birthday Wishes
          </h1>
          <p className="text-muted-foreground text-lg drop-shadow-md">
            All the lovely wishes from your teammates
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto mb-4" />
              <p className="text-foreground">Loading your wishes...</p>
            </div>
          </div>
        ) : wishes.length === 0 ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Heart className="w-24 h-24 mx-auto text-muted-foreground mb-4 animate-pulse" />
              <h3 className="text-2xl font-bold text-foreground mb-2">
                No wishes yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                When your team sends you birthday wishes, they'll appear here
                like beautiful sticky notes! 💕
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-8">
            {/* Wish Count */}
            <div className="text-center mb-8">
              <span className="inline-block bg-white/20 backdrop-blur-sm text-foreground px-6 py-2 rounded-full font-semibold">
                ✨ {wishes.length} {wishes.length === 1 ? "wish" : "wishes"}{" "}
                received
              </span>
            </div>

            {/* Sticky Notes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {wishes.map((wish, index) => (
                <div
                  key={wish.id}
                  className="group cursor-pointer"
                  style={{
                    animation: `fadeInScale 0.5s ease-out ${
                      index * 0.1
                    }s both`,
                  }}
                >
                  {/* Sticky Note */}
                  <div
                    className={`bg-gradient-to-br ${getColor(
                      index
                    )} rounded-lg shadow-xl p-6 min-h-72 relative transform transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105 border-2 border-white/30`}
                    style={{
                      transform: `rotate(${getRotation(index)}deg)`,
                      transitionProperty: "transform, box-shadow",
                    }}
                  >
                    {/* Pin Icon */}
                    <div className="absolute top-4 right-4 text-red-600 opacity-70 group-hover:opacity-100 transition-opacity">
                      <MapPin className="w-6 h-6 fill-current" />
                    </div>

                    {/* Tape Effect */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-white/40 rounded-sm opacity-60"></div>

                    {/* Content */}
                    <div className="space-y-4 h-full flex flex-col">
                      {/* Message */}
                      <p className="text-gray-800 text-sm leading-relaxed flex-1 font-medium line-clamp-6">
                        {wish.message}
                      </p>

                      {/* Sender Info */}
                      <div className="mt-auto pt-4 border-t border-black/10">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={wish.sender.profile_photo_path} />
                            <AvatarFallback className="text-xs">
                              {wish.sender.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {wish.sender.name}
                            </p>
                            <p className="text-xs text-gray-700 truncate">
                              {wish.sender.designation || "Team Member"}
                            </p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-gray-700">
                          <span>{formatDate(wish.created_at)}</span>
                          <Heart className="w-4 h-4 text-red-500 fill-red-500 group-hover:animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="px-6">
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-red-300 p-6 rounded-lg">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
