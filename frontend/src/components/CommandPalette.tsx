"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Briefcase, FileText,
  FolderKanban, HelpCircle, X, ChevronRight,
  ChevronDown, ChevronUp, History, MessageSquare,
  CheckSquare, Shield, HardDrive, Clock, Home, Award
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

  const isSuperAdmin =
    user?.role === "Super Admin" ||
    user?.role === "Admin" ||
    (user as any)?.roles?.some((r: any) => (r.name || r) === "Super Admin" || (r.name || r) === "Admin") ||
    (user as any)?.is_super_admin === true;

  const isTeamLead = user?.role === "Team Lead";
  const isEmployee = !isSuperAdmin && !isTeamLead;

  // Keyboard shortcut listener for Alt + K, Ctrl + K, and ⌘K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey || e.altKey)) ||
        (e.altKey && e.key.toLowerCase() === "k")
      ) {
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

  // Strictly Role-Based Quick Actions
  const ALL_ACTIONS = React.useMemo(() => {
    // ── SUPER ADMIN / ADMIN ACTIONS ──
    if (isSuperAdmin) {
      return [
        {
          id: "chat",
          title: "Direct Chat",
          subtitle: "Message colleagues, paste screenshots, and share files.",
          icon: MessageSquare,
          href: "/community?tab=chat",
          keywords: "chat direct message talk discussion conversation colleagues",
        },
        {
          id: "employees",
          title: "Employee Management",
          subtitle: "Manage employee profiles, onboarding, and directory.",
          icon: Users,
          href: "/employees",
          keywords: "employees staff team users directory management add employee",
        },
        {
          id: "attendance-mgmt",
          title: "Attendance Management",
          subtitle: "Review biometric punches, shifts, and check-in logs.",
          icon: Clock,
          href: "/attendance/management",
          keywords: "attendance management biometric punches check in out timing logs",
        },
        {
          id: "leave-approvals",
          title: "Leave Approvals",
          subtitle: "Review and approve company-wide leave requests.",
          icon: Calendar,
          href: "/leaves/approvals",
          keywords: "leaves approvals applications requests vacation time off",
        },
        {
          id: "projects",
          title: "Projects & Tasks",
          subtitle: "Track deliverables, milestones, and task allocations.",
          icon: FolderKanban,
          href: "/project-management",
          keywords: "projects tasks taskboard tracker deliverables forecast kanban",
        },
        {
          id: "ta-mgmt",
          title: "Expenses & Travel (TA)",
          subtitle: "Monitor, analyze, and approve TA claims.",
          icon: Briefcase,
          href: "/ta/management",
          keywords: "ta travel allowance expenses finance money reimbursement",
        },
        {
          id: "storage",
          title: "Storage & Data Retention",
          subtitle: "Configure automated chat and community post retention.",
          icon: HardDrive,
          href: "/project-management/addons/storage",
          keywords: "storage retention clean database cleanup delete chat history posts",
        },
        {
          id: "audit-logs",
          title: "Audit & Security Logs",
          subtitle: "View system audit trails and administrative activities.",
          icon: Shield,
          href: "/audit-logs",
          keywords: "audit logs security activity history tracking",
        },
        {
          id: "policies",
          title: "HR Policies & Documents",
          subtitle: "Review company handbook and policy manuals.",
          icon: FileText,
          href: "/policies",
          keywords: "policies documents handbook hr rules company",
        },
        {
          id: "issues",
          title: "Helpdesk & Issues",
          subtitle: "Manage support and workplace tickets.",
          icon: HelpCircle,
          href: "/issues",
          keywords: "issue help helpdesk ticket support bug problem",
        },
      ];
    }

    // ── TEAM LEAD ACTIONS (NEVER show Employee Management or System Retention) ──
    if (isTeamLead) {
      return [
        {
          id: "chat",
          title: "Direct Chat",
          subtitle: "Message colleagues, paste screenshots, and share files.",
          icon: MessageSquare,
          href: "/community?tab=chat",
          keywords: "chat direct message talk discussion conversation team",
        },
        {
          id: "projects",
          title: "Team Projects & Tasks",
          subtitle: "Manage team deliverables, milestones, and daily tasks.",
          icon: FolderKanban,
          href: "/project-management",
          keywords: "projects tasks taskboard tracker deliverables team forecast",
        },
        {
          id: "leave-approvals",
          title: "Team Leave Approvals",
          subtitle: "Approve or review team member leave applications.",
          icon: CheckSquare,
          href: "/leaves/approvals",
          keywords: "leaves approvals team member requests vacation",
        },
        {
          id: "apply-leave",
          title: "Apply Leave",
          subtitle: "Submit personal leave requests and check balances.",
          icon: Calendar,
          href: "/leaves/apply",
          keywords: "leave apply vacation holiday off time personal",
        },
        {
          id: "attendance",
          title: "Team Attendance",
          subtitle: "Check attendance records and daily biometric status.",
          icon: Clock,
          href: "/attendance",
          keywords: "attendance team daily logs punch check in",
        },
        {
          id: "ta",
          title: "Expenses & Travel (TA)",
          subtitle: "Track travel allowance claims and expense status.",
          icon: Briefcase,
          href: "/ta/status",
          keywords: "ta travel allowance expenses finance reimbursement",
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
      ];
    }

    // ── REGULAR EMPLOYEE ACTIONS (Purely Self-Service, ZERO Admin Tools) ──
    return [
      {
        id: "chat",
        title: "Direct Chat",
        subtitle: "Message colleagues, paste screenshots, and share files.",
        icon: MessageSquare,
        href: "/community?tab=chat",
        keywords: "chat direct message talk discussion messages conversation",
      },
      {
        id: "my-tasks",
        title: "My Tasks & Todo",
        subtitle: "View and update your assigned tasks.",
        icon: FolderKanban,
        href: "/project-management/tasks/my",
        keywords: "tasks my todo assignments deliverables",
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
        id: "my-attendance",
        title: "My Attendance",
        subtitle: "View your daily check-in times and biometric logs.",
        icon: Clock,
        href: "/attendance",
        keywords: "attendance my punch check in check out timings",
      },
      {
        id: "wfh",
        title: "Work From Home (WFH)",
        subtitle: "Request and track work from home applications.",
        icon: Home,
        href: "/wfh",
        keywords: "wfh work from home remote request",
      },
      {
        id: "ta-apply",
        title: "Travel Allowance (TA)",
        subtitle: "Apply for travel expenses and monitor reimbursement.",
        icon: Briefcase,
        href: "/ta/apply",
        keywords: "ta travel allowance expenses reimbursement claim",
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
    ];
  }, [isSuperAdmin, isTeamLead]);

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

  const handleSelect = (href: string) => {
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
        handleSelect(filteredActions[selectedIndex].href);
      } else {
        const empIndex = selectedIndex - filteredActions.length;
        if (employees[empIndex]) {
          if (isSuperAdmin) {
            handleSelect(`/employees/${employees[empIndex].id}`);
          } else {
            handleSelect(`/community?tab=chat`);
          }
        }
      }
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Mobile-only background overlay to catch outside taps */}
      <div 
        className="fixed inset-0 bg-black/40 z-[90] sm:hidden" 
        onClick={() => onOpenChange(false)} 
      />
      <div
        ref={containerRef}
        style={{
          fontFamily: '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        className="fixed inset-x-3 top-3 z-[100] sm:absolute sm:inset-auto sm:top-0 sm:left-0 sm:w-full bg-white text-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-98 duration-100 max-h-[85vh] flex flex-col"
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
            placeholder="Search any command or help"
            style={{ outline: "none", border: "none", boxShadow: "none" }}
            className="w-full text-[14.5px] text-[#27272a] placeholder-[#9ca3af] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 font-normal"
          />
          {search && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch("");
              }}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
            className="sm:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-semibold px-2 py-1 bg-slate-100 shrink-0"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar space-y-2.5">
          {/* Quick Recent Tag Pills */}
          {!search && (
            <div className="flex items-center gap-2 px-3 pt-1 pb-1 flex-wrap">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(isEmployee ? "/project-management/tasks/my" : "/project-management/tasks");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 rounded-full text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Tasks</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect("/community?tab=chat");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 rounded-full text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>Chat</span>
              </button>
            </div>
          )}

          {/* Matched Employees (if searching) */}
          {employees.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Employees
              </div>
              <div className="space-y-1 mt-0.5">
                {employees.map((emp: any, idx: number) => {
                  const isSelected = selectedIndex === filteredActions.length + idx;
                  const targetHref = isSuperAdmin ? `/employees` : `/community?tab=chat`;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(targetHref);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#f4f4f5] text-slate-900 font-medium"
                          : "hover:bg-[#f8fafc] text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#56348f] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {emp.first_name?.[0] || "E"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-slate-800 truncate">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[11.5px] text-slate-500 truncate">
                            {emp.designation || emp.department || "Employee"} • {emp.email}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
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
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(action.href);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between transition-colors cursor-pointer select-none ${
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
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowMore((prev) => !prev);
                }}
                className="text-[11.5px] text-[#71717a] hover:text-slate-900 font-medium px-3 py-1 rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1 border border-slate-200 cursor-pointer"
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
    </>
  );
}
