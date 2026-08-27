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
  Paperclip,
  Award,
  ChevronDown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  UserPlus,
  Plus,
  Globe,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO, addDays } from "date-fns";


const EMOJI_REACTIONS = [
  { id: "like", emoji: "👍", label: "Like", color: "text-[#56348f]" },
  { id: "smile", emoji: "😊", label: "Smile", color: "text-amber-500" },
  { id: "heart", emoji: "❤️", label: "Love", color: "text-rose-500" },
  { id: "clap", emoji: "👏", label: "Clap", color: "text-emerald-500" },
  { id: "idea", emoji: "💡", label: "Idea", color: "text-purple-500" },
  { id: "think", emoji: "💭", label: "Think", color: "text-sky-500" },
];

const PRAISE_BADGES = [
  { id: "superstar", name: "Superstar", icon: "⭐", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  { id: "team_player", name: "Team Player", icon: "🚀", bg: "bg-sky-100 text-sky-800 border-sky-300" },
  { id: "innovator", name: "Innovator", icon: "💡", bg: "bg-purple-100 text-purple-800 border-purple-300" },
  { id: "high_performer", name: "High Performer", icon: "🎯", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { id: "helping_hand", name: "Helping Hand", icon: "👏", bg: "bg-rose-100 text-rose-800 border-rose-300" },
  { id: "customer_delight", name: "Customer Delight", icon: "🌟", bg: "bg-indigo-100 text-indigo-800 border-indigo-300" },
];

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function CommunityFeed() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin =
    currentUser?.role === "Super Admin" ||
    (currentUser as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin") ||
    (currentUser as any)?.is_super_admin === true;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"post" | "poll" | "praise">("post");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Filters State
  const [filterType, setFilterType] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  // Image Upload State (Multi-photo supported)
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<{ [postId: number]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll Form State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", "", ""]);
  const [pollExpiresOn, setPollExpiresOn] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [notifyEmployees, setNotifyEmployees] = useState(false);
  const [anonymousPoll, setAnonymousPoll] = useState(false);

  // Praise Form State (Multiple Employees Support)
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [praiseDescription, setPraiseDescription] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<any>(PRAISE_BADGES[0]);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");

  // Mentions State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionActiveField, setMentionActiveField] = useState<"post" | "praise" | "poll" | null>(null);
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);

  // Comment & Like State
    // Reaction Picker States
    // Who Reacted Modal State
  const [reactionModalPost, setReactionModalPost] = useState<any | null>(null);
  const [reactionModalTab, setReactionModalTab] = useState<string>("all");

  const [hoveredReactionPostId, setHoveredReactionPostId] = useState<number | null>(null);
  const reactionTimeoutRef = useRef<{ [postId: number]: any }>({});
  const longPressTimerRef = useRef<{ [postId: number]: any }>({});

  const [commentInputs, setCommentInputs] = useState<{ [postId: number]: string }>({});
  const [openComments, setOpenComments] = useState<{ [postId: number]: boolean }>({});
  const [commentSubmitting, setCommentSubmitting] = useState<{ [postId: number]: boolean }>({});
  const [votingPostId, setVotingPostId] = useState<number | null>(null);

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage, filterType, filterYear, filterMonth, filterDate]);

  useEffect(() => {
    fetchMetadataAndEmployees();
  }, []);

  const handleMentionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    field: "post" | "praise" | "poll",
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const val = e.target.value;
    setter(val);
    
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbolIndex !== -1) {
      const prevChar = textBeforeCursor[lastAtSymbolIndex - 1];
      if (!prevChar || prevChar === " " || prevChar === "\n") {
        const query = textBeforeCursor.substring(lastAtSymbolIndex + 1);
        if (!query.includes(" ")) {
          setMentionQuery(query.toLowerCase());
          setMentionActiveField(field);
          setMentionCursorPos(lastAtSymbolIndex);
          return;
        }
      }
    }
    
    setMentionQuery(null);
    setMentionActiveField(null);
  };

  const handleMentionSelect = (emp: any, field: "post" | "praise" | "poll", setter: React.Dispatch<React.SetStateAction<string>>, currentVal: string) => {
    const textBeforeMention = currentVal.substring(0, mentionCursorPos);
    const textAfterMention = currentVal.substring(mentionCursorPos + (mentionQuery?.length || 0) + 1);
    
    // Insert the name with a space after it
    const newVal = textBeforeMention + `@${emp.name} ` + textAfterMention;
    setter(newVal);
    
    setMentionQuery(null);
    setMentionActiveField(null);
  };

  const parseMentions = (text: string) => {
    const mentionedIds: number[] = [];
    employeesList.forEach((emp) => {
      // Check if @Name is in the text
      if (text.includes(`@${emp.name}`)) {
        mentionedIds.push(emp.id);
      }
    });
    return mentionedIds;
  };

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 10 };
      if (filterType !== "all") params.type = filterType;
      if (filterYear !== "all") params.year = filterYear;
      if (filterMonth !== "all") params.month = filterMonth;
      if (filterDate) params.date = filterDate;

      const res = await api.get("/community/posts", { params });
      setPosts(res.data?.data || []);
      setCurrentPage(res.data?.current_page || 1);
      setLastPage(res.data?.last_page || 1);
      setTotalPosts(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to load community posts", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadataAndEmployees = async () => {
    try {
      // 1. Fetch lightweight direct employee list
      api.get("/community/employees")
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setEmployeesList(res.data);
          }
        })
        .catch(() => {});

      // 2. Fetch projects list
      api.get("/community/projects")
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setProjectsList(res.data);
          }
        })
        .catch(() => {});

      // 3. Summary metadata
      const summaryRes = await api.get("/community/summary");
      if (summaryRes.data?.projects && summaryRes.data.projects.length > 0) {
        setProjectsList((prev) => (prev.length > 0 ? prev : summaryRes.data.projects));
      }
      if (summaryRes.data?.all_employees && summaryRes.data.all_employees.length > 0) {
        setEmployeesList((prev) => (prev.length > 0 ? prev : summaryRes.data.all_employees));
      }
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const combinedFiles = [...selectedImages, ...files].slice(0, 10);
      setSelectedImages(combinedFiles);

      const previewPromises = combinedFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      );

      Promise.all(previewPromises).then((previews) => {
        setImagePreviews(previews);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveSingleImage = (index: number) => {
    const updatedFiles = selectedImages.filter((_, idx) => idx !== index);
    const updatedPreviews = imagePreviews.filter((_, idx) => idx !== index);
    setSelectedImages(updatedFiles);
    setImagePreviews(updatedPreviews);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = () => {
    setSelectedImages([]);
    setImagePreviews([]);
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

  const handleSelectEmployee = (emp: any) => {
    if (!selectedEmployees.some((e) => e.id === emp.id)) {
      setSelectedEmployees([...selectedEmployees, emp]);
    }
    setEmployeeSearch("");
    setIsEmployeeDropdownOpen(false);
  };

  const handleRemoveSelectedEmployee = (id: number) => {
    setSelectedEmployees(selectedEmployees.filter((e) => e.id !== id));
  };

  const handleResetFilters = () => {
    setFilterType("all");
    setFilterYear("all");
    setFilterMonth("all");
    setFilterDate("");
    setCurrentPage(1);
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
    } else if (activeType === "praise") {
      if (selectedEmployees.length === 0) {
        alert("Please search and select at least one employee to praise.");
        return;
      }
      if (!praiseDescription.trim()) {
        alert("Please enter what the employee did to deserve the praise.");
        return;
      }
    } else {
      if (!content.trim() && selectedImages.length === 0) return;
    }

    if (posting) return;

    setPosting(true);
    try {
      if (activeType === "poll") {
        const mentionedIds = parseMentions(pollQuestion);
        const res = await api.post("/community/posts", {
          content: pollQuestion.trim(),
          type: "poll",
          options: pollOptions.filter((o) => o.trim().length > 0),
          expires_at: pollExpiresOn,
          is_anonymous: anonymousPoll,
          notify_employees: notifyEmployees,
          mentioned_user_ids: mentionedIds,
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
          setTotalPosts((prev) => prev + 1);
        }
        setPollQuestion("");
        setPollOptions(["", "", ""]);
        setActiveType("post");
      } else if (activeType === "praise") {
        const mentionedIds = parseMentions(praiseDescription);
        const formData = new FormData();
        formData.append("content", praiseDescription.trim());
        formData.append("type", "praise");
        formData.append("praised_user_ids", JSON.stringify(selectedEmployees.map((e) => e.id)));
        formData.append("praised_user_id", String(selectedEmployees[0]?.id || ""));
        formData.append("mentioned_user_ids", JSON.stringify(mentionedIds));
        if (selectedBadge?.name) {
          formData.append("badge", selectedBadge.name);
        }
        if (selectedProject) {
          formData.append("project_name", selectedProject);
        }
        if (selectedImages.length > 0) {
          selectedImages.forEach((img) => {
            formData.append("images[]", img);
          });
        }

        const res = await api.post("/community/posts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
          setTotalPosts((prev) => prev + 1);
        }
        setPraiseDescription("");
        setSelectedEmployees([]);
        setEmployeeSearch("");
        setSelectedProject("");
        handleRemoveImage();
        setActiveType("post");
      } else {
        const mentionedIds = parseMentions(content);
        const formData = new FormData();
        formData.append("content", content.trim());
        formData.append("type", activeType);
        formData.append("mentioned_user_ids", JSON.stringify(mentionedIds));
        if (selectedImages.length > 0) {
          selectedImages.forEach((img) => {
            formData.append("images[]", img);
          });
        }

        const res = await api.post("/community/posts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
          setTotalPosts((prev) => prev + 1);
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

  const handleToggleLike = async (postId: number, reaction = "like") => {
    setHoveredReactionPostId(null);

    // 0ms Instant Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        const currentReaction = p.user_reaction;
        const willRemove = currentReaction === reaction;
        const newReaction = willRemove ? null : reaction;
        const newBreakdown = { ...(p.reactions_breakdown || {}) };

        if (currentReaction && newBreakdown[currentReaction]) {
          newBreakdown[currentReaction] = Math.max(0, newBreakdown[currentReaction] - 1);
          if (newBreakdown[currentReaction] === 0) delete newBreakdown[currentReaction];
        }

        if (!willRemove) {
          newBreakdown[reaction] = (newBreakdown[reaction] || 0) + 1;
        }

        const newTotal = Object.values(newBreakdown).reduce((a: any, b: any) => a + Number(b), 0) as number;

        return {
          ...p,
          user_has_liked: !willRemove,
          user_reaction: newReaction,
          likes_count: newTotal,
          reactions_breakdown: newBreakdown,
        };
      })
    );

    try {
      const res = await api.post(`/community/posts/${postId}/like`, { reaction });
      const { liked, likes_count, user_reaction, reactions_breakdown, reactions_users } = res.data;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_liked: liked,
                user_reaction,
                likes_count,
                reactions_breakdown,
                reactions_users: reactions_users || p.reactions_users,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to react to post", err);
      // Re-fetch on error to sync state
      fetchPosts(currentPage);
    }
  };

  const handleMouseEnterLike = (postId: number) => {
    if (reactionTimeoutRef.current[postId]) {
      clearTimeout(reactionTimeoutRef.current[postId]);
    }
    setHoveredReactionPostId(postId);
  };

  const handleMouseLeaveLike = (postId: number) => {
    reactionTimeoutRef.current[postId] = setTimeout(() => {
      setHoveredReactionPostId((cur) => (cur === postId ? null : cur));
    }, 350);
  };

  const handleTouchStartLike = (postId: number) => {
    longPressTimerRef.current[postId] = setTimeout(() => {
      setHoveredReactionPostId(postId);
    }, 400);
  };

  const handleTouchEndLike = (postId: number) => {
    if (longPressTimerRef.current[postId]) {
      clearTimeout(longPressTimerRef.current[postId]);
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
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotalPosts((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error("Failed to delete post", err);
      alert(err.response?.data?.message || "Failed to delete post.");
    }
  };

  // Filtered employees for search (excluding already selected)
  const filteredEmployees = employeesList.filter((emp) => {
    const isAlreadySelected = selectedEmployees.some((se) => se.id === emp.id);
    if (isAlreadySelected) return false;
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    const matchName = emp.name ? emp.name.toLowerCase().includes(q) : false;
    const matchEmail = emp.email ? emp.email.toLowerCase().includes(q) : false;
    const matchDesig = emp.designation ? emp.designation.toLowerCase().includes(q) : false;
    return matchName || matchEmail || matchDesig;
  });

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
      className="bg-[#F0F2F5] dark:bg-slate-900 min-h-screen py-6 px-4 sm:px-0"
    >
      <div className="max-w-[680px] mx-auto space-y-4">
        {/* ── TOP POST PUBLISHER BOX ── */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.1)] mb-4">
          {/* Hidden File Input for All Tabs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple
            className="hidden"
          />
          
          {/* Post Type Selector Tabs */}
          <div className="flex items-center px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-700 gap-1.5">
            <button
              onClick={() => setActiveType("post")}
              className={`flex-1 flex items-center justify-center gap-2 text-[14px] font-semibold py-2.5 rounded-md transition-all cursor-pointer ${
                activeType === "post" ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Edit3 className="w-5 h-5 text-red-500" />
              <span>Post</span>
            </button>

            <button
              onClick={() => setActiveType("poll")}
              className={`flex-1 flex items-center justify-center gap-2 text-[14px] font-semibold py-2.5 rounded-md transition-all cursor-pointer ${
                activeType === "poll" ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <BarChart2 className="w-5 h-5 text-green-500" />
              <span>Poll</span>
            </button>

            <button
              onClick={() => setActiveType("praise")}
              className={`flex-1 flex items-center justify-center gap-2 text-[14px] font-semibold py-2.5 rounded-md transition-all cursor-pointer ${
                activeType === "praise" ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Medal className="w-5 h-5 text-yellow-500" />
              <span>Praise</span>
            </button>
          </div>

          <div className="p-4">

        {/* ── PRAISE CREATION FORM (Multiple Employees Supported) ── */}
        {activeType === "praise" ? (
          <div className="space-y-4">
            {/* 1. Multiple Employees Selection & Search */}
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2 p-2.5 border-b-2 border-[#56348f] bg-slate-50/50 dark:bg-slate-900/40 rounded-t-md">
                {/* Selected Employee Pills */}
                {selectedEmployees.map((emp) => (
                  <span
                    key={emp.id}
                    className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-200 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs animate-in fade-in"
                  >
                    <RoyalAvatar
                      src={emp.profile_photo_path}
                      name={emp.name}
                      userId={emp.id}
                      className="w-4 h-4 rounded-full"
                    />
                    <span className="truncate max-w-[130px]">{emp.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedEmployee(emp.id)}
                      className="hover:text-red-500 transition-colors cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Search Input */}
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setIsEmployeeDropdownOpen(true);
                  }}
                  onFocus={() => setIsEmployeeDropdownOpen(true)}
                  placeholder={
                    selectedEmployees.length === 0
                      ? "Search Employee (type name or select)"
                      : "+ Add more employees..."
                  }
                  className="flex-1 min-w-[160px] text-[13px] font-medium py-1 px-1 bg-transparent focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Dropdown Results */}
              {isEmployeeDropdownOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl custom-scrollbar">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      {employeesList.length === 0 ? "Loading employee directory..." : "No matching employees found"}
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <RoyalAvatar
                          src={emp.profile_photo_path}
                          name={emp.name}
                          userId={emp.id}
                          className="w-8 h-8 rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {emp.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {emp.designation}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Praise Message Textarea */}
            <div className="relative">
              <textarea
                value={praiseDescription}
                onChange={(e) => handleMentionChange(e, "praise", setPraiseDescription)}
                rows={3}
                placeholder="What did the employee do to deserve the praise"
                className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white resize-none"
              />
              {mentionActiveField === "praise" && mentionQuery !== null && (
                <div className="absolute z-40 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl custom-scrollbar">
                  {employeesList.filter(e => e.name?.toLowerCase().includes(mentionQuery) || e.email?.toLowerCase().includes(mentionQuery)).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleMentionSelect(emp, "praise", setPraiseDescription, praiseDescription)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <RoyalAvatar src={emp.profile_photo_path} name={emp.name} userId={emp.id} className="w-6 h-6 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{emp.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Badge Selector Box */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => setIsBadgeModalOpen(!isBadgeModalOpen)}
                className="w-14 h-14 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center text-2xl shadow-xs cursor-pointer hover:border-[#56348f] transition"
              >
                <span>{selectedBadge?.icon || "🎖️"}</span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setIsBadgeModalOpen(!isBadgeModalOpen)}
                  style={{ color: "#56348f" }}
                  className="text-xs font-semibold hover:underline cursor-pointer dark:text-purple-400 flex items-center gap-1"
                >
                  <span>{selectedBadge?.name ? `Badge: ${selectedBadge.name}` : "Select badge"}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Choose a recognition badge for your colleague(s)
                </p>
              </div>
            </div>

            {/* Badge Selection Grid */}
            {isBadgeModalOpen && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRAISE_BADGES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBadge(b);
                      setIsBadgeModalOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs font-semibold transition cursor-pointer ${
                      selectedBadge?.id === b.id
                        ? "border-[#56348f] bg-white dark:bg-slate-800 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 hover:border-slate-400"
                    }`}
                  >
                    <span className="text-lg">{b.icon}</span>
                    <span className="truncate text-slate-800 dark:text-slate-200">{b.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 4. Projects Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Projects (optional)
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white"
              >
                <option value="">Select project</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>



            {/* 6. Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {imagePreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs group"
                  >
                    <img
                      src={preview}
                      alt={`Attachment ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleImage(idx)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-0.5 rounded-full transition-colors cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 7. Bottom Bar: Add Attachment & Submit Post */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ color: "#56348f" }}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:underline cursor-pointer dark:text-purple-400"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Add Attachment</span>
                </button>
                <span className="text-[11px] text-slate-400">Max number of files allowed is 5</span>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={posting || selectedEmployees.length === 0 || !praiseDescription.trim()}
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
        ) : activeType === "poll" ? (
          /* ── POLL CREATION FORM ── */
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => handleMentionChange(e, "poll", setPollQuestion)}
                placeholder="What this poll is about"
                className="w-full text-[14px] font-medium py-2 px-1 border-b border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:border-[#56348f] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {mentionActiveField === "poll" && mentionQuery !== null && (
                <div className="absolute z-40 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl custom-scrollbar">
                  {employeesList.filter(e => e.name?.toLowerCase().includes(mentionQuery) || e.email?.toLowerCase().includes(mentionQuery)).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleMentionSelect(emp, "poll", setPollQuestion, pollQuestion)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <RoyalAvatar src={emp.profile_photo_path} name={emp.name} userId={emp.id} className="w-6 h-6 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{emp.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Poll Expires on</span>
                  <input
                    type="date"
                    value={pollExpiresOn}
                    onChange={(e) => setPollExpiresOn(e.target.value)}
                    className="text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyEmployees}
                    onChange={(e) => setNotifyEmployees(e.target.checked)}
                    className="rounded text-[#56348f] focus:ring-[#56348f]"
                  />
                  <span>Notify employees</span>
                </label>

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
          /* ── STANDARD POST FORM ── */
          <div className="flex flex-col gap-3 relative">
            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => handleMentionChange(e, "post", setContent)}
                rows={3}
                placeholder="Write your post here and mention your peers"
                className="w-full text-[15px] leading-relaxed bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-700 dark:text-white placeholder:text-slate-400 placeholder:font-normal resize-none p-0"
              />
              {mentionActiveField === "post" && mentionQuery !== null && (
                <div className="absolute z-40 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl custom-scrollbar">
                  {employeesList.filter(e => e.name?.toLowerCase().includes(mentionQuery) || e.email?.toLowerCase().includes(mentionQuery)).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleMentionSelect(emp, "post", setContent, content)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <RoyalAvatar src={emp.profile_photo_path} name={emp.name} userId={emp.id} className="w-6 h-6 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{emp.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {imagePreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs group"
                    >
                      <img
                        src={preview}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSingleImage(idx)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:text-[#56348f] hover:border-[#56348f] transition-colors cursor-pointer"
                    >
                      <Plus className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold">Add more</span>
                    </button>
                  )}
                </div>
              )}



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
                  disabled={(!content.trim() && selectedImages.length === 0) || posting}
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
      </div>

      {/* ── FILTER BAR (Date, Year, Month, Type) ── */}
      <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#56348f]" /> Filter Feed:
          </span>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
          >
            <option value="all">All Types</option>
            <option value="post">📝 Regular Posts</option>
            <option value="poll">📊 Polls</option>
            <option value="praise">🎖️ Praise & Shoutouts</option>
          </select>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
          >
            <option value="all">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#56348f]"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Exact Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1">
            <span className="text-[11px] text-slate-400">Date:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {(filterType !== "all" || filterYear !== "all" || filterMonth !== "all" || filterDate) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 p-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        <div className="text-slate-400 text-[11px]">
          {totalPosts} {totalPosts === 1 ? "post" : "posts"} total
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
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No community posts found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your filters or be the first to create a post!
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
            const isPraise = post.type === "praise";
            const praisedList = post.praised_users || (post.praised_user ? [post.praised_user] : []);

            // Human friendly relative time
            const formatRelativeTime = (dateStr?: string) => {
              if (!dateStr) return "Recently";
              try {
                const d = parseISO(dateStr);
                const now = new Date();
                const diffMs = now.getTime() - d.getTime();
                const diffSec = Math.floor(diffMs / 1000);
                const diffMin = Math.floor(diffSec / 60);
                const diffHour = Math.floor(diffMin / 60);
                const diffDay = Math.floor(diffHour / 24);

                if (diffSec < 60) return "Just now";
                if (diffMin < 60) return `${diffMin}m ago`;
                if (diffHour < 24) return `${diffHour}h ago`;
                if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
                if (diffDay < 30) return `${diffDay} days ago`;
                return format(d, "MMM d, yyyy");
              } catch (e) {
                return "Recently";
              }
            };

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.1)] mb-4"
              >
                {/* Author Info Header matching screenshot exact layout */}
                <div className="flex items-start justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <RoyalAvatar
                      src={post.user?.profile_photo_path}
                      name={authorName}
                      userId={post.user_id}
                      className="w-10 h-10 rounded-full shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[14px] leading-tight text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer">
                          <RoyalName name={authorName} userId={post.user_id} />
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal text-[14px]">
                          {isPraise ? "shared a praise" : isPoll ? "created a poll" : ""}
                        </span>
                      </p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1">
                        {formatRelativeTime(post.created_at)}
                        <span>·</span>
                        <Globe className="w-3 h-3" />
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title={isSuperAdmin ? "Delete Post (Super Admin)" : "Delete Post"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Praise Highlight Card (Multi-recipient supported) */}
                {isPraise && (
                  <div className="flex items-center justify-between gap-3 px-4 pb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-[14px] text-slate-900 dark:text-white flex flex-wrap items-center gap-1">
                          <span className="font-semibold">Praise for</span>
                          {praisedList.length > 0 ? (
                            praisedList.map((pUser: any, pIdx: number) => (
                              <span key={pUser.id || pIdx} className="text-[#56348f] dark:text-purple-400 font-semibold">
                                {pUser.first_name} {pUser.last_name}
                                {pIdx < praisedList.length - 1 ? "," : ""}
                              </span>
                            ))
                          ) : (
                            <span className="font-semibold text-[#56348f]">Colleague</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {post.poll_data?.badge && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                              🎖️ {post.poll_data.badge}
                            </span>
                          )}
                          {post.poll_data?.project_name && (
                            <span className="inline-block text-[11px] text-slate-500 dark:text-slate-400">
                              • Project: {post.poll_data.project_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recipient Avatars */}
                    {praisedList.length > 0 && (
                      <div className="flex items-center -space-x-2 shrink-0">
                        {praisedList.slice(0, 3).map((pUser: any, pIdx: number) => (
                          <RoyalAvatar
                            key={pUser.id || pIdx}
                            src={pUser.profile_photo_path}
                            name={`${pUser.first_name} ${pUser.last_name}`}
                            userId={pUser.id}
                            className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-sm"
                          />
                        ))}
                        {praisedList.length > 3 && (
                          <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800 shadow-sm">
                            +{praisedList.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Body Text with proper padding and line-height */}
                {post.content && (
                  <div className="text-[14px] leading-relaxed text-slate-900 dark:text-slate-200 whitespace-pre-wrap px-4 pb-3">
                    {post.type === "poll" && (
                      <div className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-full">
                        <BarChart2 className="w-4 h-4 text-[#56348f]" /> Community Poll
                      </div>
                    )}
                    <p className={isPoll ? "font-semibold text-sm text-slate-900 dark:text-white" : ""}>
                      {post.content}
                    </p>
                  </div>
                )}

                {/* Poll Options & Live Voting */}
                {isPoll && (
                  <div className="space-y-2.5 px-4 pb-3 pt-1">
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

                {/* Attached Image(s) — Instagram-style Slider Carousel with Pagination Dots & Large Centered View */}
                {(() => {
                  const postImages = post.images && post.images.length > 0
                    ? post.images
                    : post.media_url
                    ? [post.media_url]
                    : [];

                  if (postImages.length === 0) return null;

                  const currentSlide = activeSlideIndex[post.id] || 0;
                  const totalSlides = postImages.length;

                  return (
                    <div className="pt-1.5 w-full flex flex-col items-center justify-center">
                      {/* Image Frame - Tightly hugs the image with zero empty side background wings */}
                      <div className="relative w-fit max-w-full rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center select-none group bg-transparent">
                        
                        {/* Current Image (Tight fit, centered, no placeholder wings) */}
                        <img
                          src={postImages[currentSlide]}
                          alt={`Post attachment ${currentSlide + 1}`}
                          className="max-w-full w-auto h-auto max-h-[360px] md:max-h-[380px] object-contain rounded-xl block transition-all duration-300"
                          loading="lazy"
                        />

                        {/* Image Counter Badge (Top Right) */}
                        {totalSlides > 1 && (
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md pointer-events-none">
                            {currentSlide + 1} / {totalSlides}
                          </div>
                        )}

                        {/* Previous Slide Button */}
                        {totalSlides > 1 && currentSlide > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSlideIndex((prev) => ({
                                ...prev,
                                [post.id]: Math.max(0, currentSlide - 1),
                              }));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white shadow-lg flex items-center justify-center opacity-80 group-hover:opacity-100 hover:scale-110 transition-all cursor-pointer z-10"
                            title="Previous image"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        )}

                        {/* Next Slide Button */}
                        {totalSlides > 1 && currentSlide < totalSlides - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSlideIndex((prev) => ({
                                ...prev,
                                [post.id]: Math.min(totalSlides - 1, currentSlide + 1),
                              }));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white shadow-lg flex items-center justify-center opacity-80 group-hover:opacity-100 hover:scale-110 transition-all cursor-pointer z-10"
                            title="Next image"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Instagram-Style Slider Dots */}
                      {totalSlides > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                          {postImages.map((_: any, sIdx: number) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() =>
                                setActiveSlideIndex((prev) => ({ ...prev, [post.id]: sIdx }))
                              }
                              className={`transition-all duration-200 rounded-full cursor-pointer ${
                                currentSlide === sIdx
                                  ? "w-2.5 h-2.5 bg-[#56348f] dark:bg-purple-400 scale-110 shadow-xs"
                                  : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
                              }`}
                              title={`Go to photo ${sIdx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Facebook Style Action Bar */}
                <div className="px-4">
                  {/* Stats Row */}
                  {((post.likes_count || 0) > 0 || (post.comments_count || 0) > 0) && (
                    <div className="flex items-center justify-between py-2 text-[13px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:underline" onClick={() => { setReactionModalPost(post); setReactionModalTab("all"); }}>
                        {(post.likes_count || 0) > 0 && (
                          <div className="flex items-center">
                            {Object.entries(post.reactions_breakdown || {})
                              .sort((a, b) => Number(b[1]) - Number(a[1]))
                              .slice(0, 3)
                              .map(([reaction], idx) => {
                                const r = EMOJI_REACTIONS.find((er) => er.id === reaction);
                                if (!r) return null;
                                return (
                                  <span 
                                    key={reaction} 
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 -ml-1 first:ml-0`}
                                    style={{ zIndex: 10 - idx }}
                                  >
                                    {r.emoji}
                                  </span>
                                );
                              })}
                            <span className="ml-1.5">{post.likes_count}</span>
                          </div>
                        )}
                      </div>
                      <div className="cursor-pointer hover:underline" onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: true }))}>
                        {(post.comments_count || 0) > 0 && (
                          <span>{post.comments_count} {post.comments_count === 1 ? 'Comment' : 'Comments'}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Buttons Row */}
                  <div className={`flex items-center justify-between py-1 ${!post.likes_count && !post.comments_count ? "border-t border-slate-200 dark:border-slate-700 mt-2" : ""}`}>
                    {/* Like Button */}
                    <div
                      className="relative group/reaction-box flex-1"
                      onMouseEnter={() => handleMouseEnterLike(post.id)}
                      onMouseLeave={() => handleMouseLeaveLike(post.id)}
                      onTouchStart={() => handleTouchStartLike(post.id)}
                      onTouchEnd={() => handleTouchEndLike(post.id)}
                    >
                      {/* Floating Emoji Reactions Bar */}
                      <div
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-50 transition-all duration-200 ${
                          hoveredReactionPostId === post.id
                            ? "opacity-100 visible translate-y-0"
                            : "opacity-0 invisible pointer-events-none translate-y-1 group-hover/reaction-box:opacity-100 group-hover/reaction-box:visible group-hover/reaction-box:pointer-events-auto group-hover/reaction-box:translate-y-0"
                        }`}
                      >
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                          {EMOJI_REACTIONS.map((re) => {
                            const isSelected = post.user_reaction === re.id;
                            return (
                              <button
                                key={re.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(post.id, re.id);
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer ${
                                  isSelected ? "scale-110 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                                title={re.label}
                              >
                                <span>{re.emoji}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLike(post.id, post.user_reaction || "like")}
                        className={`w-full flex items-center justify-center gap-2 text-[14px] font-semibold py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                          post.user_has_liked
                            ? (post.user_reaction === "like" ? "text-blue-600 dark:text-blue-400" : (EMOJI_REACTIONS.find((r) => r.id === post.user_reaction)?.color || "text-blue-600 dark:text-blue-400"))
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {post.user_reaction ? (
                          <span className="text-lg leading-none mb-0.5">
                            {EMOJI_REACTIONS.find((r) => r.id === post.user_reaction)?.emoji || "👍"}
                          </span>
                        ) : (
                          <ThumbsUp className="w-5 h-5" />
                        )}
                        <span>
                          {post.user_reaction
                            ? (EMOJI_REACTIONS.find((r) => r.id === post.user_reaction)?.label || "Like")
                            : "Like"}
                        </span>
                      </button>
                    </div>

                    {/* Comment Button */}
                    <button
                      type="button"
                      onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex-1 flex items-center justify-center gap-2 text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 py-2 rounded-md transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span>Comment</span>
                    </button>
                  </div>
                </div>

                {/* Comment Section (Collapsible) */}
                {isCommentsOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700"></div>
                    <div className="flex items-start gap-2">
                      <RoyalAvatar
                        src={currentUser?.profile_photo_path}
                        name={`${currentUser?.first_name} ${currentUser?.last_name}`}
                        userId={currentUser?.id}
                        className="w-8 h-8 rounded-full shrink-0 mt-0.5"
                      />
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(post.id);
                          }}
                          placeholder="Write a comment..."
                          className="w-full text-[14px] px-4 py-2 bg-[#F0F2F5] dark:bg-slate-700 rounded-full focus:outline-none dark:text-white"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim() || commentSubmitting[post.id]}
                          className="absolute right-2 p-1.5 text-blue-500 disabled:opacity-50 cursor-pointer"
                        >
                          {commentSubmitting[post.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {post.comments.map((cmt: any) => (
                          <div key={cmt.id} className="flex items-start gap-2">
                            <RoyalAvatar
                              src={cmt.user?.profile_photo_path}
                              name={`${cmt.user?.first_name} ${cmt.user?.last_name}`}
                              userId={cmt.user_id}
                              className="w-8 h-8 rounded-full shrink-0"
                            />
                            <div>
                              <div className="bg-[#F0F2F5] dark:bg-slate-700 rounded-2xl px-3 py-2 inline-block max-w-full">
                                <p className="font-semibold text-[13px] text-slate-900 dark:text-white hover:underline cursor-pointer">
                                  {cmt.user ? `${cmt.user.first_name} ${cmt.user.last_name}` : "Member"}
                                </p>
                                <p className="text-[14px] text-slate-800 dark:text-slate-200 mt-0.5 whitespace-pre-wrap leading-tight">
                                  {cmt.comment}
                                </p>
                              </div>
                              <div className="text-[12px] text-slate-500 font-semibold px-3 mt-0.5">
                                <span className="hover:underline cursor-pointer">Like</span>
                                <span className="mx-1">·</span>
                                <span className="hover:underline cursor-pointer">Reply</span>
                                <span className="mx-1">·</span>
                                <span className="font-normal text-slate-400">
                                  {cmt.created_at ? formatRelativeTime(cmt.created_at) : "Just now"}
                                </span>
                              </div>
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

          {/* ── PAGINATION CONTROLS ── */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-4 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Page <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> of{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{lastPage}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {Array.from({ length: lastPage }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === lastPage || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-md text-xs font-semibold transition cursor-pointer ${
                          currentPage === p
                            ? "bg-[#56348f] text-white"
                            : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage}
                  className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── WHO REACTED MODAL (Facebook / LinkedIn Style) ── */}
      {reactionModalPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setReactionModalPost(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Reactions</span>
                <span className="text-xs font-normal text-slate-400">
                  ({reactionModalPost.likes_count || 0})
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setReactionModalPost(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reaction Type Filter Tabs */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setReactionModalTab("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer shrink-0 ${
                  reactionModalTab === "all"
                    ? "bg-[#56348f] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All {reactionModalPost.likes_count || 0}
              </button>

              {EMOJI_REACTIONS.map((re) => {
                const count = reactionModalPost.reactions_breakdown?.[re.id] || 0;
                if (count <= 0) return null;
                const isSelected = reactionModalTab === re.id;

                return (
                  <button
                    key={re.id}
                    type="button"
                    onClick={() => setReactionModalTab(re.id)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-[#56348f] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <span>{re.emoji}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Users List */}
            <div className="max-h-80 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
              {(() => {
                const allUsers = reactionModalPost.reactions_users || [];
                const filteredUsers =
                  reactionModalTab === "all"
                    ? allUsers
                    : allUsers.filter((ru: any) => ru.reaction_type === reactionModalTab);

                if (filteredUsers.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No reactions found for this filter.
                    </div>
                  );
                }

                return filteredUsers.map((ru: any) => {
                  const emojiObj = EMOJI_REACTIONS.find((r) => r.id === ru.reaction_type) || EMOJI_REACTIONS[0];
                  const u = ru.user;

                  return (
                    <div key={ru.id || ru.user_id} className="pt-3 first:pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <RoyalAvatar
                            src={u?.profile_photo_path}
                            name={u?.name || `${u?.first_name} ${u?.last_name}`}
                            userId={u?.id}
                            className="w-10 h-10 rounded-full"
                          />
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs">
                            {emojiObj.emoji}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            <RoyalName name={u?.name || `${u?.first_name} ${u?.last_name}`} userId={u?.id} />
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {u?.designation || "Team Member"}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-slate-500 capitalize px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
                        {emojiObj.label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
