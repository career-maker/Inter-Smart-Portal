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
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { format, parseISO, addDays } from "date-fns";

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

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll Form State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", "", ""]);
  const [pollExpiresOn, setPollExpiresOn] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [notifyEmployees, setNotifyEmployees] = useState(false);
  const [anonymousPoll, setAnonymousPoll] = useState(false);

  // Praise Form State
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [praiseDescription, setPraiseDescription] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<any>(PRAISE_BADGES[0]);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");

  // Comment & Like State
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
      // 1. Try summary
      const summaryRes = await api.get("/community/summary");
      let empMap: { [id: number]: any } = {};

      if (summaryRes.data?.all_employees && summaryRes.data.all_employees.length > 0) {
        summaryRes.data.all_employees.forEach((emp: any) => {
          empMap[emp.id] = {
            id: emp.id,
            name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            designation: emp.designation || "Team Member",
            profile_photo_path: emp.profile_photo_path,
            email: emp.email,
          };
        });
      }

      if (summaryRes.data?.projects) {
        setProjectsList(summaryRes.data.projects);
      }

      // 2. Also query /employees endpoint to ensure complete employee pool
      try {
        const empRes = await api.get("/employees?per_page=500&page=1");
        const list = Array.isArray(empRes.data)
          ? empRes.data
          : empRes.data?.data || [];

        list.forEach((emp: any) => {
          empMap[emp.id] = {
            id: emp.id,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || "Employee",
            designation: emp.designation || "Team Member",
            profile_photo_path: emp.profile_photo_path,
            email: emp.email,
          };
        });
      } catch (e) {
        // Fallback to summary list
      }

      setEmployeesList(Object.values(empMap));
    } catch (err) {
      console.error("Failed to load metadata", err);
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
      if (!selectedEmployee) {
        alert("Please search and select an employee to praise.");
        return;
      }
      if (!praiseDescription.trim()) {
        alert("Please enter what the employee did to deserve the praise.");
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
          notify_employees: notifyEmployees,
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
          setTotalPosts((prev) => prev + 1);
        }
        setPollQuestion("");
        setPollOptions(["", "", ""]);
        setActiveType("post");
      } else if (activeType === "praise") {
        const formData = new FormData();
        formData.append("content", praiseDescription.trim());
        formData.append("type", "praise");
        formData.append("praised_user_id", String(selectedEmployee.id));
        if (selectedBadge?.name) {
          formData.append("badge", selectedBadge.name);
        }
        if (selectedProject) {
          formData.append("project_name", selectedProject);
        }
        if (selectedImage) {
          formData.append("image", selectedImage);
        }

        const res = await api.post("/community/posts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.data) {
          setPosts([res.data.data, ...posts]);
          setTotalPosts((prev) => prev + 1);
        }
        setPraiseDescription("");
        setSelectedEmployee(null);
        setEmployeeSearch("");
        setSelectedProject("");
        handleRemoveImage();
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

  // Filtered employees for search
  const filteredEmployees = employeesList.filter((emp) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true; // Show all when empty
    const matchName = emp.name ? emp.name.toLowerCase().includes(q) : false;
    const matchEmail = emp.email ? emp.email.toLowerCase().includes(q) : false;
    const matchDesig = emp.designation ? emp.designation.toLowerCase().includes(q) : false;
    return matchName || matchEmail || matchDesig;
  });

  return (
    <div
      style={{
        fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="space-y-6"
    >
      {/* ── TOP POST PUBLISHER BOX ── */}
      <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200/90 dark:border-slate-700/60 shadow-sm p-5">
        
        {/* Post Type Selector Tabs */}
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

        {/* ── PRAISE CREATION FORM ── */}
        {activeType === "praise" ? (
          <div className="space-y-4 pt-1">
            {/* 1. Search Employee Input */}
            <div className="relative">
              {selectedEmployee ? (
                <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-[#56348f]/40 rounded-md">
                  <div className="flex items-center gap-2.5">
                    <RoyalAvatar
                      src={selectedEmployee.profile_photo_path}
                      name={selectedEmployee.name}
                      userId={selectedEmployee.id}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {selectedEmployee.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {selectedEmployee.designation}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setEmployeeSearch("");
                    }}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      placeholder="Search Employee"
                      className="w-full text-[14px] font-medium py-2 px-1 border-b-2 border-[#56348f] bg-transparent focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Dropdown Results */}
                  {isEmployeeDropdownOpen && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl custom-scrollbar">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          {employeesList.length === 0 ? "Loading employee directory..." : "No employees found matching search"}
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsEmployeeDropdownOpen(false);
                            }}
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
              )}
            </div>

            {/* 2. Praise Message Textarea */}
            <div>
              <textarea
                value={praiseDescription}
                onChange={(e) => setPraiseDescription(e.target.value)}
                rows={3}
                placeholder="What did the employee do to deserve the praise"
                className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white resize-none"
              />
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
                  Choose a recognition badge for your colleague
                </p>
              </div>
            </div>

            {/* Badge Selection Modal / Grid */}
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

            {/* 5. Gift Rewards & Balance */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Gift Rewards</span>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  You don&apos;t have enough Rewards to gift.
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400">Balance</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">0 Rewards</p>
              </div>
            </div>

            {/* 6. Image Preview */}
            {imagePreview && (
              <div className="relative inline-block rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56">
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
                disabled={posting || !selectedEmployee || !praiseDescription.trim()}
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
          <div className="space-y-4 pt-1">
            <div>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="What this poll is about"
                className="w-full text-[14px] font-medium py-2 px-1 border-b border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:border-[#56348f] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
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
                placeholder="Write your message or company update here..."
                className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#56348f] dark:text-white resize-none"
              />

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

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />

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
                          ? format(parseISO(post.created_at), "MMM d, yyyy 'at' h:mm a")
                          : "Recently"}
                      </p>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-md transition-colors cursor-pointer"
                      title={isSuperAdmin ? "Delete Post (Super Admin)" : "Delete Post"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Praise Highlight Card */}
                {isPraise && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-50/80 via-purple-50/50 to-pink-50/60 dark:from-amber-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-md border border-amber-200/80 dark:border-amber-900/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 shadow-xs">
                        🎖️
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Praise for</span>
                          {post.praised_user ? (
                            <span className="text-[#56348f] dark:text-purple-300 font-bold">
                              {post.praised_user.first_name} {post.praised_user.last_name}
                            </span>
                          ) : (
                            <span>a Colleague</span>
                          )}
                        </p>
                        {post.poll_data?.badge && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 bg-amber-200/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-full">
                            Badge: {post.poll_data.badge}
                          </span>
                        )}
                        {post.poll_data?.project_name && (
                          <span className="ml-1.5 inline-block text-[10px] text-slate-500 dark:text-slate-400">
                            • Project: {post.poll_data.project_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {post.praised_user && (
                      <RoyalAvatar
                        src={post.praised_user.profile_photo_path}
                        name={`${post.praised_user.first_name} ${post.praised_user.last_name}`}
                        userId={post.praised_user.id}
                        className="w-9 h-9 rounded-full ring-2 ring-amber-400 shrink-0"
                      />
                    )}
                  </div>
                )}

                {/* Post Body Text */}
                {post.content && (
                  <div className="text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
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

                {/* Poll Options & Live Voting */}
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

                {/* Attached Image */}
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
  );
}
