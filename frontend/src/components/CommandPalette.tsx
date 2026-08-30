"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Briefcase, FileText,
  FolderKanban, HelpCircle, User, X, ChevronRight,
  ChevronDown, ChevronUp, CheckSquare
} from "lucide-react";
import api from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [showMore, setShowMore] = React.useState(false);
  const router = useRouter();
  const { user } = useAuthStore();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener for Alt + K, Ctrl + K, and ⌘K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey || e.altKey)) || (e.altKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setSelectedIndex(0);
    } else {
      setSearch("");
      setShowMore(false);
    }
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  // Fetch employees when searching
  const { data: employeesData } = useQuery({
    queryKey: ["employees-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      try {
        const res = await api.get(`/employees?search=${encodeURIComponent(search)}&per_page=6`);
        return res.data?.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: search.length >= 2,
  });

  const employees = employeesData || [];

  // Default Quick Actions matching Keka screenshots
  const ALL_ACTIONS = React.useMemo(() => [
    {
      id: "employees",
      title: "Employee Directory",
      subtitle: "Find your colleagues.",
      icon: Users,
      href: "/employees",
      keywords: "employees staff team people directory",
    },
    {
      id: "ta",
      title: "Expenses and Travel Summary",
      subtitle: "Monitor and analyze expenses and travel-related data.",
      icon: Briefcase,
      href: "/ta/status",
      keywords: "ta travel allowance expenses finance money",
    },
    {
      id: "apply-leave",
      title: "Apply Leave",
      subtitle: "Submit leave requests and check balances.",
      icon: Calendar,
      href: "/leaves/apply",
      keywords: "leave apply vacation holiday off time",
    },
    {
      id: "projects",
      title: "Projects & Tasks",
      subtitle: "Track deliverables, milestones, and task allocations.",
      icon: FolderKanban,
      href: "/project-management",
      keywords: "projects tasks taskboard tracker deliverables",
    },
    {
      id: "policies",
      title: "HR Policies & Documents",
      subtitle: "Review company handbook and policy manuals.",
      icon: FileText,
      href: "/policies",
      keywords: "policies documents handbook hr rules",
    },
    {
      id: "issues",
      title: "Raise an Issue / Helpdesk",
      subtitle: "Submit support or workplace ticket.",
      icon: HelpCircle,
      href: "/issues",
      keywords: "issue help helpdesk ticket support problem",
    },
  ], []);

  // Filter Quick Actions based on search term
  const filteredActions = React.useMemo(() => {
    if (!search.trim()) {
      return showMore ? ALL_ACTIONS : ALL_ACTIONS.slice(0, 4);
    }
    const term = search.toLowerCase();
    return ALL_ACTIONS.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.subtitle.toLowerCase().includes(term) ||
        a.keywords.toLowerCase().includes(term)
    );
  }, [search, showMore, ALL_ACTIONS]);

  const totalItems = filteredActions.length + employees.length;

  const navigateTo = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  // Keyboard arrow navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(1, totalItems)) % Math.max(1, totalItems));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < filteredActions.length) {
        navigateTo(filteredActions[selectedIndex].href);
      } else {
        const empIndex = selectedIndex - filteredActions.length;
        if (employees[empIndex]) {
          navigateTo(`/employees`);
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-start justify-center p-3 pt-12 sm:pt-20 animate-in fade-in duration-150">
      <div
        ref={containerRef}
        style={{
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        className="w-full max-w-xl bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
      >
        {/* Top Search Input Box (Clean Borderless Input matching Keka) */}
        <div className="flex items-center px-4 sm:px-6 py-3.5 border-b border-slate-100 gap-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search employees or actions (Ex: Apply Leave, WFH)..."
            style={{ outline: "none", border: "none", boxShadow: "none" }}
            className="w-full text-[14.5px] text-[#27272a] placeholder-[#9ca3af] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 font-normal"
          />
          {search && (
            <button onClick={() => setSearch("")} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-semibold px-2 py-1 bg-slate-100 shrink-0"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar space-y-3">
          {/* Matched Employees (if searching) */}
          {employees.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                Employees
              </div>
              <div className="space-y-1 mt-0.5">
                {employees.map((emp: any, idx: number) => {
                  const isSelected = selectedIndex === filteredActions.length + idx;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => navigateTo("/employees")}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#f4f4f5] text-slate-900 font-medium"
                          : "hover:bg-[#f8fafc] text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">
                          {emp.first_name?.[0] || "E"}
                        </div>
                        <div>
                          <div className="text-[13.5px] font-medium text-slate-800">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[11.5px] text-slate-500">
                            {emp.designation || emp.department || "Employee"} • {emp.email}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Header */}
          <div>
            <div className="px-3 py-1.5 text-[12.5px] font-semibold text-[#71717a]">
              Quick Actions
            </div>
            <div className="space-y-0.5 mt-0.5">
              {filteredActions.length === 0 && employees.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching actions or employees found.
                </div>
              ) : (
                filteredActions.map((action, idx) => {
                  const Icon = action.icon;
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={action.id}
                      onClick={() => navigateTo(action.href)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#f4f4f5] text-slate-900"
                          : "hover:bg-[#f8fafc] text-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-1 text-[#3f3f46] mt-0.5">
                          <Icon className="w-4 h-4 stroke-[1.75]" />
                        </div>
                        <div>
                          <div className="text-[13.5px] font-medium text-[#18181b] leading-snug">
                            {action.title}
                          </div>
                          <div className="text-[11.5px] text-[#71717a] leading-tight mt-0.5">
                            {action.subtitle}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* View More / View Less Button */}
          {!search && ALL_ACTIONS.length > 4 && (
            <div className="flex justify-center pt-1 border-t border-slate-100">
              <button
                onClick={() => setShowMore((prev) => !prev)}
                className="text-[11.5px] text-[#71717a] hover:text-slate-900 font-medium px-3 py-1 rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1 border border-slate-200"
              >
                <span>{showMore ? "View Less" : `View ${ALL_ACTIONS.length - 4} More`}</span>
                {showMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-5 py-2.5 border-t border-slate-100 bg-[#fbfbfb] flex items-center justify-end text-[11px] text-[#a1a1aa] gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span>Navigate</span>
            <kbd className="font-sans bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px]">↑</kbd>
            <kbd className="font-sans bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px]">↓</kbd>
          </div>
          <div className="flex items-center gap-1.5">
            <span>To select</span>
            <kbd className="font-sans bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px]">↵</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
