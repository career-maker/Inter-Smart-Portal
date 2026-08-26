"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  Heart,
  Share2,
  Flame,
  Star,
  Award,
  MoreVertical,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO } from "date-fns";

export function CommunityFeed() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"post" | "praise" | "poll">("post");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [postId: number]: string }>({});
  const [openComments, setOpenComments] = useState<{ [postId: number]: boolean }>({});
  const [commentSubmitting, setCommentSubmitting] = useState<{ [postId: number]: boolean }>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/community/posts");
      setPosts(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load community posts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() || posting) return;

    setPosting(true);
    try {
      const res = await api.post("/community/posts", {
        content: content.trim(),
        type: activeType,
      });

      if (res.data?.data) {
        setPosts([res.data.data, ...posts]);
      }
      setContent("");
    } catch (err: any) {
      console.error("Failed to create post", err);
      alert(err.response?.data?.message || "Failed to create post.");
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId: number) => {
    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      const { liked, likes_count } = res.data;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, user_has_liked: liked, likes_count }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  const handleAddComment = async (postId: number) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post(`/community/posts/${postId}/comments`, {
        comment: text,
      });

      const newComment = res.data.data;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments_count: res.data.comments_count || (p.comments_count + 1),
                comments: [newComment, ...(p.comments || [])],
              }
            : p
        )
      );

      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-6"
    >
      {/* ── TOP POST PUBLISHER BOX ── */}
      <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
        {/* Post Type Selector */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <button
            onClick={() => setActiveType("post")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeType === "post"
                ? "bg-[#56348f] text-white"
                : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <span>📝</span> Post
          </button>
          <button
            onClick={() => setActiveType("praise")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeType === "praise"
                ? "bg-[#56348f] text-white"
                : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <span>⭐</span> Praise
          </button>
          <button
            onClick={() => setActiveType("poll")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeType === "poll"
                ? "bg-[#56348f] text-white"
                : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <span>📊</span> Poll
          </button>
        </div>

        {/* Input Area */}
        <div className="flex items-start gap-3">
          <RoyalAvatar
            src={currentUser?.profile_photo_path}
            name={`${currentUser?.first_name} ${currentUser?.last_name}`}
            userId={currentUser?.id}
            className="w-10 h-10 rounded-full shrink-0"
          />
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder={
                activeType === "praise"
                  ? "Give a shoutout or praise a colleague for their awesome work..."
                  : activeType === "poll"
                  ? "Ask a question or start a poll..."
                  : "Write your message or company update here..."
              }
              className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] focus:border-[#56348f] dark:text-white resize-none"
            />

            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-slate-400">
                Shared with all Inter Smart team members
              </span>
              <button
                onClick={handleCreatePost}
                disabled={!content.trim() || posting}
                className="px-5 py-2 bg-[#56348f] hover:bg-[#452773] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {posting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>Post</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── COMMUNITY POSTS STREAM ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-8 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No community posts yet</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Be the first to share an update, greeting, or recognition!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const authorName = post.user
              ? `${post.user.first_name} ${post.user.last_name}`
              : "Team Member";
            const canDelete = post.user_id === currentUser?.id || isSuperAdmin;
            const isCommentsOpen = !!openComments[post.id];

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5 space-y-4"
              >
                {/* Author Info Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <RoyalAvatar
                      src={post.user?.profile_photo_path}
                      name={authorName}
                      userId={post.user_id}
                      className="w-10 h-10 rounded-full shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                        <RoyalName name={authorName} userId={post.user_id} />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {post.user?.designation || "Team Member"} •{" "}
                        {post.created_at
                          ? format(parseISO(post.created_at), "MMM d, h:mm a")
                          : "Recently"}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-md transition-colors cursor-pointer"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post Body */}
                <div className="text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {post.type === "praise" && (
                    <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                      <Star className="w-3 h-3 text-amber-500" /> Shoutout / Praise
                    </div>
                  )}
                  <p>{post.content}</p>
                </div>

                {/* Like & Comment Bar */}
                <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                      post.user_has_liked
                        ? "text-[#56348f] dark:text-purple-400 font-semibold"
                        : "hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ThumbsUp
                      className={`w-4 h-4 ${
                        post.user_has_liked ? "fill-current text-[#56348f] dark:text-purple-400" : ""
                      }`}
                    />
                    <span>
                      {post.likes_count || 0} {post.likes_count === 1 ? "Like" : "Likes"}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="flex items-center gap-1.5 font-medium hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {post.comments_count || 0}{" "}
                      {post.comments_count === 1 ? "Comment" : "Comments"}
                    </span>
                  </button>
                </div>

                {/* Comment Section (Collapsible) */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                    {/* Add Comment Input */}
                    <div className="flex items-center gap-2">
                      <RoyalAvatar
                        src={currentUser?.profile_photo_path}
                        name={`${currentUser?.first_name} ${currentUser?.last_name}`}
                        userId={currentUser?.id}
                        className="w-7 h-7 rounded-full shrink-0"
                      />
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(post.id);
                        }}
                        placeholder="Write a response or comment..."
                        className="flex-1 text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim() || commentSubmitting[post.id]}
                        className="px-3 py-1.5 bg-[#56348f] text-white text-xs font-semibold rounded-md hover:bg-[#452773] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {commentSubmitting[post.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {post.comments.map((cmt: any) => (
                          <div
                            key={cmt.id}
                            className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-md text-xs"
                          >
                            <RoyalAvatar
                              src={cmt.user?.profile_photo_path}
                              name={`${cmt.user?.first_name} ${cmt.user?.last_name}`}
                              userId={cmt.user_id}
                              className="w-6 h-6 rounded-full shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {cmt.user ? `${cmt.user.first_name} ${cmt.user.last_name}` : "Member"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {cmt.created_at
                                    ? format(parseISO(cmt.created_at), "MMM d, h:mm a")
                                    : "Just now"}
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                {cmt.comment}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
