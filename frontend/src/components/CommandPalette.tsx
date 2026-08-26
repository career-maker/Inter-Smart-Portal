"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search, Users, Calendar, Briefcase, FileText,
  FolderKanban, HelpCircle, User, LogOut, ArrowRight,
  Sparkles, CheckSquare, Bell, Shield, ChevronRight, X, Home
} from "lucide-react";
import api from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: externalOpen, onOpenChange: externalOnOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = React.useCallback(
    (val: boolean) => {
      if (isControlled && externalOnOpenChange) {
        externalOnOpenChange(val);
      } else {
        setInternalOpen(val);
      }
    },
    [isControlled, externalOnOpenChange]
  );

  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();
  const { user } = useAuthStore();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Alt + K, Ctrl + K, and ⌘K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey || e.altKey)) || (e.altKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setSearch("");
    }
  }, [open]);

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

  // Default Quick Actions
  const QUICK_ACTIONS = React.useMemo(() => [
    {
      id: "employees",
      title: "Employee Directory",
      subtitle: "Find your colleagues and team members.",
      icon: Users,
      href: "/employees",
      keywords: "employees staff team people directory",
    },
    {
      id: "apply-leave",
      title: "Apply Leave",
      subtitle: "Submit casual, sick, or earned leave requests.",
      icon: Calendar,
      href: "/leaves/apply",
      keywords: "leave apply vacation holiday off time",
    },
    {
      id: "projects",
      title: "Projects & Tasks",
      subtitle: "Manage project deliverables and task tracking.",
      icon: FolderKanban,
      href: "/project-management",
      keywords: "projects tasks taskboard tracker deliverables",
    },
    {
      id: "ta",
      title: "Expenses and Travel Summary",
      subtitle: "Monitor and submit travel allowance requests.",
      icon: Briefcase,
      href: "/ta/status",
      keywords: "ta travel allowance expenses finance money",
    },
    {
      id: "wfh",
      title: "WFH Requests",
      subtitle: "Submit work from home applications.",
      icon: Home,
      href: "/wfh",
      keywords: "wfh remote home work",
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
    {
      id: "profile",
      title: "My Profile",
      subtitle: "View and update your employee information.",
      icon: User,
      href: "/profile",
      keywords: "profile account me details info",
    },
  ], []);

  // Filter Quick Actions based on search term
  const filteredActions = React.useMemo(() => {
    if (!search.trim()) return QUICK_ACTIONS;
    const term = search.toLowerCase();
    return QUICK_ACTIONS.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.subtitle.toLowerCase().includes(term) ||
        a.keywords.toLowerCase().includes(term)
    );
  }, [search, QUICK_ACTIONS]);

  const totalItems = filteredActions.length + employees.length;

  const navigateTo = (href: string) => {
    setOpen(false);
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Keka-Style Search Card */}
      <div
        style={{ fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search any command, employee or help..."
            className="w-full text-base text-slate-800 dark:text-white placeholder-slate-400 bg-transparent outline-none font-normal"
          />
          {search && (
            <button onClick={() => setSearch("")} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto py-3 px-2 custom-scrollbar space-y-3">
          {/* Matched Employees (if searching) */}
          {employees.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Employees
              </div>
              <div className="space-y-1 mt-1">
                {employees.map((emp: any, idx: number) => {
                  const isSelected = selectedIndex === filteredActions.length + idx;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => navigateTo("/employees")}
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                          {emp.first_name?.[0] || "E"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
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

          {/* Quick Actions List */}
          <div>
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Actions
            </div>
            <div className="space-y-1 mt-1">
              {filteredActions.length === 0 && employees.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
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
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2 rounded-xl ${isSelected ? "bg-purple-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {action.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {action.subtitle}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 opacity-60" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Navigate <kbd className="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">↑</kbd> <kbd className="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">↓</kbd></span>
            <span>Select <kbd className="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">↵</kbd></span>
          </div>
          <span>Close <kbd className="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
