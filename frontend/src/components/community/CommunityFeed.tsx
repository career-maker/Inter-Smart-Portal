"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Send,
  Loader2,
  Trash2,
  Sparkles,
  Star,
  Image as ImageIcon,
  X,
  Edit3,
  BarChart2,
  Medal,
  Calendar,
  CheckCircle2,
  Vote,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO, addDays } from "date-fns";

export function CommunityFeed() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"post" | "poll" | "praise">("post");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll Form State matching screenshot
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", "", ""]);
  const [pollExpiresOn, setPollExpiresOn] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [notifyEmployees, setNotifyEmployees] = useState(false);
  const [anonymousPoll, setAnonymousPoll] = useState(false);

  // Comment & Like State
  const [commentInputs, setCommentInputs] = useState<{ [postId: number]: string }>({});
  const [openComments, setOpenComments] = useState<{ [postId: number]: boolean }>({});
  const [commentSubmitting, setCommentSubmitting] = useState<{ [postId: number]: boolean }>({});
  const [votingPostId, setVotingPostId] = useState<number | null>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddPollOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const handleCreatePost = async () => {
    if (activeType === "poll") {
      if (!pollQuestion.trim()) {
        alert("Please enter what this poll is about.");
        return;
      }
      const validOpts = pollOptions.filter((o) => o.trim().length > 0);
      if (validOpts.length < 2) {
        alert("Please provide at least 2 poll options.");
        return;
      }
    } else {
      if (!content.trim() && !selectedImage) return;
    }

    if (posting) return;

    setPosting(true);
    try {
      if (activeType === "poll") {
        const res = await api.post("/community/posts", {
          content: pollQuestion.trim(),
          type: "poll",
          options: pollOptions.filter((o) => o.trim().length > 0),
          expires_at: pollExpiresOn,
          is_anonymous: anonymousPoll,
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
        }
        setPollQuestion("");
        setPollOptions(["", "", ""]);
        setActiveType("post");
      } else {
        const formData = new FormData();
        formData.append("content", content.trim());
        formData.append("type", activeType);
        if (selectedImage) {
          formData.append("image", selectedImage);
        }

        const res = await api.post("/community/posts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
        }
        setContent("");
        handleRemoveImage();
      }
    } catch (err: any) {
      console.error("Failed to create post", err);
      alert(err.response?.data?.message || "Failed to create post.");
    } finally {
      setPosting(false);
    }
  };

  const handleVote = async (postId: number, optionId: number) => {
    setVotingPostId(postId);
    try {
      const res = await api.post(`/community/posts/${postId}/vote`, {
        option_id: optionId,
      });

      const { poll_data, user_voted_option_id } = res.data;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, poll_data, user_voted_option_id }
            : p
        )
      );
    } catch (err: any) {
      console.error("Failed to vote", err);
      alert(err.response?.data?.message || "Failed to submit vote.");
    } finally {
      setVotingPostId(null);
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
        
        {/* Post Type Selector Tabs (Matching Screenshot) */}
        <div className="flex items-center gap-6 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <button
            onClick={() => setActiveType("post")}
            style={{
              color: activeType === "post" ? "#56348f" : "rgb(94, 105, 120)",
              borderBottomColor: activeType === "post" ? "#56348f" : "transparent",
            }}
            className={`flex items-center gap-1.5 text-xs font-bold pb-1 border-b-2 transition-all cursor-pointer ${
              activeType === "post" ? "border-[#56348f]" : "border-transparent hover:text-slate-900"
            }`}
          >
            <Edit3 className="w-4 h-4 text-purple-500" />
            <span>Post</span>
          </button>

          <button
            onClick={() => setActiveType("poll")}
            style={{
              color: activeType === "poll" ? "#56348f" : "rgb(94, 105, 120)",
              borderBottomColor: activeType === "poll" ? "#56348f" : "transparent",
            }}
            className={`flex items-center gap-1.5 text-xs font-bold pb-1 border-b-2 transition-all cursor-pointer ${
              activeType === "poll" ? "border-[#56348f]" : "border-transparent hover:text-slate-900"
            }`}
          >
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            <span>Poll</span>
          </button>

          <button
            onClick={() => setActiveType("praise")}
            style={{
              color: activeType === "praise" ? "#56348f" : "rgb(94, 105, 120)",
              borderBottomColor: activeType === "praise" ? "#56348f" : "transparent",
            }}
            className={`flex items-center gap-1.5 text-xs font-bold pb-1 border-b-2 transition-all cursor-pointer ${
              activeType === "praise" ? "border-[#56348f]" : "border-transparent hover:text-slate-900"
            }`}
          >
            <Medal className="w-4 h-4 text-amber-500" />
            <span>Praise</span>
          </button>
        </div>

        {/* ── POLL CREATION FORM (Matching Screenshot) ── */}
        {activeType === "poll" ? (
          <div className="space-y-4 pt-1">
            {/* Topic Input */}
            <div>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="What this poll is about"
                className="w-full text-[14px] font-medium py-2 px-1 border-b border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:border-[#56348f] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {/* Options List */}
            <div className="space-y-2.5 pt-2">
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                    placeholder="Add option here"
                    className="flex-1 text-[13px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white placeholder:text-slate-400"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePollOption(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* +Add Option Link */}
            <div>
              <button
                type="button"
                onClick={handleAddPollOption}
                style={{ color: "#56348f" }}
                className="text-xs font-semibold hover:underline cursor-pointer dark:text-purple-400"
              >
                +Add Option
              </button>
            </div>

            {/* Bottom Bar: Expiry & Checkboxes */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-4">
                {/* Expiry Date */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Poll Expires on</span>
                  <input
                    type="date"
                    value={pollExpiresOn}
                    onChange={(e) => setPollExpiresOn(e.target.value)}
                    className="text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white cursor-pointer"
                  />
                </div>

                {/* Checkbox: Notify */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyEmployees}
                    onChange={(e) => setNotifyEmployees(e.target.checked)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <span>Notify employees</span>
                </label>

                {/* Checkbox: Anonymous */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={anonymousPoll}
                    onChange={(e) => setAnonymousPoll(e.target.checked)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <span>Anonymous poll</span>
                </label>
              </div>

              {/* Submit Post Button */}
              <button
                onClick={handleCreatePost}
                disabled={posting || !pollQuestion.trim()}
                style={{
                  backgroundColor: "#56348f",
                  color: "#ffffff",
                }}
                className="px-6 py-2 bg-[#56348f] hover:bg-[#452773] !text-white text-xs font-bold rounded-md shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {posting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" />
                    <span className="!text-white font-bold">Creating Poll...</span>
                  </>
                ) : (
                  <span className="!text-white font-bold">Post</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── STANDARD POST / PRAISE FORM ── */
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
                    : "Write your message or company update here..."
                }
                className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] focus:border-[#56348f] dark:text-white resize-none"
              />

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative inline-block mt-3 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56">
                  <img
                    src={imagePreview}
                    alt="Post attachment"
                    className="max-h-56 w-auto object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white p-1 rounded-full transition-colors cursor-pointer"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />

              {/* Actions Bar */}
              <div className="flex items-center justify-between mt-3 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#56348f] dark:hover:text-purple-400 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Add Photo</span>
                  </button>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Shared with Inter Smart team
                  </span>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={(!content.trim() && !selectedImage) || posting}
                  style={{
                    backgroundColor: "#56348f",
                    color: "#ffffff",
                  }}
                  className="px-6 py-2 bg-[#56348f] hover:bg-[#452773] !text-white text-xs font-bold rounded-md shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {posting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" />
                      <span className="!text-white font-bold">Posting...</span>
                    </>
                  ) : (
                    <span className="!text-white font-bold">Post</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
            Be the first to share an update, poll, photo, or recognition!
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
            const isPoll = post.type === "poll" && post.poll_data?.options;

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

                {/* Post Body Text / Question */}
                {post.content && (
                  <div className="text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {post.type === "praise" && (
                      <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                        <Star className="w-3 h-3 text-amber-500" /> Shoutout / Praise
                      </div>
                    )}
                    {post.type === "poll" && (
                      <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full">
                        <BarChart2 className="w-3 h-3 text-emerald-500" /> Community Poll
                      </div>
                    )}
                    <p className={isPoll ? "font-semibold text-sm text-slate-900 dark:text-white" : ""}>
                      {post.content}
                    </p>
                  </div>
                )}

                {/* ── POLL OPTIONS & LIVE VOTING ── */}
                {isPoll && (
                  <div className="space-y-2.5 pt-1">
                    {post.poll_data.options.map((opt: any) => {
                      const totalVotes = post.poll_data.total_votes || 0;
                      const voteCount = opt.votes || 0;
                      const percentage =
                        totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                      const isUserVote = post.user_voted_option_id === opt.id;

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleVote(post.id, opt.id)}
                          disabled={votingPostId === post.id}
                          className={`w-full relative overflow-hidden text-left p-3 rounded-md border transition-all cursor-pointer ${
                            isUserVote
                              ? "border-[#56348f] bg-purple-50/50 dark:bg-purple-950/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/40"
                          }`}
                        >
                          {/* Percentage Fill Bar */}
                          <div
                            style={{ width: `${percentage}%` }}
                            className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 ${
                              isUserVote ? "bg-[#56348f]" : "bg-slate-400 dark:bg-slate-600"
                            }`}
                          />

                          <div className="relative z-10 flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                  isUserVote
                                    ? "border-[#56348f] bg-[#56348f] text-white"
                                    : "border-slate-400"
                                }`}
                              >
                                {isUserVote ? "✓" : ""}
                              </span>
                              <span className="truncate text-slate-800 dark:text-slate-200">
                                {opt.text}
                              </span>
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0 ml-2">
                              {percentage}% ({voteCount})
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        {post.poll_data.total_votes || 0}{" "}
                        {post.poll_data.total_votes === 1 ? "vote" : "votes"}
                        {post.poll_data.is_anonymous ? " • Anonymous" : ""}
                      </span>
                      {post.poll_data.expires_at && (
                        <span>
                          Expires {format(parseISO(post.poll_data.expires_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Attached Image if present */}
                {post.media_url && (
                  <div className="rounded-md overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 max-h-[480px]">
                    <img
                      src={post.media_url}
                      alt="Post attachment"
                      className="w-full h-auto max-h-[480px] object-contain rounded-md"
                      loading="lazy"
                    />
                  </div>
                )}

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
