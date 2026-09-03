"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Briefcase, FileText,
  FolderKanban, HelpCircle, X, ChevronRight,
  ChevronDown, ChevronUp, History, MessageSquare,
  CheckSquare, Shield, HardDrive, Clock, Home, Award, UserCheck
} from "lucide-react";
import api from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { RoyalAvatar, RoyalName } from "@/components/ui/RoyalAvatar";
import { EmployeeIdCardDrawer } from "@/components/employee/EmployeeIdCardDrawer";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [showMore, setShowMore] = React.useState(false);
  const [selectedEmployeeForCard, setSelectedEmployeeForCard] = React.useState<any | null>(null);
  const [isEmployeeSearchMode, setIsEmployeeSearchMode] = React.useState(false);
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
      setIsEmployeeSearchMode(false);
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

  // Fetch employees when searching or when searching employees mode
  const { data: employeesData } = useQuery({
    queryKey: ["employees-search", search, isEmployeeSearchMode],
    queryFn: async () => {
      const q = search.trim();
      const endpoint = q.length >= 1 ? `/employees?search=${encodeURIComponent(q)}&per_page=8` : `/employees?per_page=8`;
      try {
        const res = await api.get(endpoint);
        return res.data?.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: search.trim().length >= 1 || isEmployeeSearchMode,
  });

  const employees = employeesData || [];

  // Strictly Role-Based Quick Actions
  const ALL_ACTIONS = React.useMemo(() => {
    // ── SUPER ADMIN / ADMIN ACTIONS ──
    if (isSuperAdmin) {
      return [
        {
          id: "search-employee",
          title: "Search An Employee",
          subtitle: "Look up colleague ID card, awards, and work tenure.",
          icon: UserCheck,
          isSearchAction: true,
          keywords: "search an employee find colleague staff team users directory profile id card awards tenure",
        },
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
          id: "search-employee",
          title: "Search An Employee",
          subtitle: "Look up colleague ID card, awards, and work tenure.",
          icon: UserCheck,
          isSearchAction: true,
          keywords: "search an employee find colleague coworker staff directory id card awards tenure",
        },
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
        id: "search-employee",
        title: "Search An Employee",
        subtitle: "Look up colleague ID card, awards, and work tenure.",
        icon: UserCheck,
        isSearchAction: true,
        keywords: "search an employee find colleague coworker staff directory id card awards tenure",
      },
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

  const handleOpenEmployeeCard = (emp: any) => {
    setSelectedEmployeeForCard(emp);
    onOpenChange(false);
  };

  const handleActionClick = (action: any) => {
    if (action.isSearchAction) {
      setIsEmployeeSearchMode(true);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    if (action.href) {
      onOpenChange(false);
      router.push(action.href);
    }
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
        handleActionClick(filteredActions[selectedIndex]);
      } else {
        const empIndex = selectedIndex - filteredActions.length;
        if (employees[empIndex]) {
          handleOpenEmployeeCard(employees[empIndex]);
        }
      }
    }
  };

  return (
    <>
      {open && (
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
            {/* Top Search Input Box */}
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
                placeholder={isEmployeeSearchMode ? "Search employee by name, code, or role..." : "Search any command, employee, or help"}
                style={{ outline: "none", border: "none", boxShadow: "none" }}
                className="w-full text-[14.5px] text-[#27272a] placeholder-[#9ca3af] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 font-normal"
              />
              <button 
                type="button"
                onClick={() => onOpenChange(false)} 
                className="text-[#a1a1aa] hover:text-[#27272a] p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Results */}
            <div className="p-3 sm:p-4 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {/* Employee Search Mode Active Indicator */}
              {isEmployeeSearchMode && (
                <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#56348f] text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Searching Employees Directory (Click any colleague to view ID card)
                  </span>
                  <button
                    onClick={() => {
                      setIsEmployeeSearchMode(false);
                      setSearch("");
                    }}
                    className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Matched Employees */}
              {employees.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Employees ({employees.length})</span>
                    <span className="text-[10px] text-purple-600 font-bold">Select to view ID Card</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {employees.map((emp: any, idx: number) => {
                      const isSelected = selectedIndex === filteredActions.length + idx;
                      const empName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee";
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleOpenEmployeeCard(emp);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-purple-50 text-[#56348f] font-medium"
                              : "hover:bg-[#f8fafc] text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <RoyalAvatar
                              src={emp.profile_photo_path}
                              name={empName}
                              userId={emp.id}
                              className="w-8 h-8 rounded-full shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-medium text-slate-800 truncate flex items-center gap-1.5">
                                <RoyalName name={empName} userId={emp.id} showCrownIcon={false} />
                                {emp.employee_code && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                    #{emp.employee_code}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11.5px] text-slate-500 truncate">
                                {emp.designation || emp.department || "Employee"} • {emp.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#56348f] font-bold shrink-0 pl-2">
                            <span className="hidden sm:inline text-[11px] text-slate-400 font-normal">View ID</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
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
                            handleActionClick(action);
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
              {!search && !isEmployeeSearchMode && ALL_ACTIONS.length > 4 && (
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
      )}

      {/* Employee Corporate ID Card Drawer */}
      <EmployeeIdCardDrawer
        employeeId={selectedEmployeeForCard?.id ?? null}
        isOpen={!!selectedEmployeeForCard}
        onClose={() => setSelectedEmployeeForCard(null)}
        fallbackData={selectedEmployeeForCard}
      />
    </>
  );
}
