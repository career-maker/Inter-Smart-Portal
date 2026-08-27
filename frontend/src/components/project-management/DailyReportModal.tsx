"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  FileText,
  Calendar,
  Users,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  Copy,
  Download,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  Lock,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

export interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function DailyReportModal({
  isOpen,
  onClose,
  defaultDate,
}: DailyReportModalProps) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";
  const isAdmin = user?.role === "Admin";
  const isTeamLead = user?.role === "Team Lead";
  const isEmployee = !isSuperAdmin && !isAdmin && !isTeamLead;
  const loggedInUserName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Employee";

  // Selected parameters
  const [selectedDate, setSelectedDate] = useState(
    defaultDate || format(new Date(), "yyyy-MM-dd")
  );
  const [reportType, setReportType] = useState<string>(
    isEmployee ? "my_daily" : "full_team_daily"
  );
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [includeTimeTracking, setIncludeTimeTracking] = useState<boolean>(false);

  // Data & loading state
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageGenerating, setImageGenerating] = useState<boolean>(false);
  const [imageCopied, setImageCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set default report type based on role whenever modal opens or role is detected
  useEffect(() => {
    if (isOpen) {
      setReportType(isEmployee ? "my_daily" : "full_team_daily");
    }
  }, [isOpen, isEmployee]);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params: any = {
        date: selectedDate,
        report_type: reportType,
        include_time_tracking: includeTimeTracking ? 1 : 0,
      };

      if (selectedTeamId && !isEmployee) {
        params.team_id = selectedTeamId;
      }
      if (reportType === "individual_member" && !isEmployee) {
        if (selectedUserId) {
          params.user_id = selectedUserId;
        }
      }

      const res = await api.get("/project-tasks/daily-report", { params });
      setReportData(res.data);

      if (res.data?.team?.id && !selectedTeamId) {
        setSelectedTeamId(res.data.team.id);
      }
      if (res.data?.team_members?.length > 0 && !selectedUserId) {
        setSelectedUserId(res.data.team_members[0].id);
      }
    } catch (err) {
      console.error("Failed to load daily report", err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, selectedDate, reportType, selectedTeamId, selectedUserId, includeTimeTracking, isEmployee]);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, fetchReport]);

  if (!isOpen) return null;

  const isSingleMemberScope = isEmployee || reportType === "my_daily" || reportType === "my_tomorrow" || reportType === "individual_member";

  const formatShortDate = (d?: string | null): string => {
    if (!d) return "—";
    try {
      const clean = d.split("T")[0];
      const dt = parseISO(clean);
      if (isNaN(dt.getTime())) return d;
      return format(dt, "dd MMM yyyy");
    } catch {
      return String(d);
    }
  };

  // Generate plain text report
  const generateTextReport = (): string => {
    if (!reportData) return "";

    const dateFormatted = format(parseISO(reportData.date || selectedDate), "dd MMMM yyyy");
    const summary = reportData.summary || {};
    const teamName = reportData.team?.name || "Team";

    let text = "";

    if (isSingleMemberScope) {
      const member = reportData.member_reports?.[0] || {};
      const title = reportType === "my_tomorrow" ? "TOMORROW'S WORK SCHEDULE" : reportType === "individual_member" ? "INDIVIDUAL MEMBER DAILY REPORT" : "DAILY WORK REPORT";
      text += `📊 ${title}\n`;
      text += `📅 ${dateFormatted}\n`;
      text += `👤 ${member.name || loggedInUserName} (${member.designation || user?.designation || "Team Member"})\n`;
      if (reportData.team?.name) {
        text += `🏢 ${reportData.team.name}\n`;
      }
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📈 SUMMARY\n`;
      text += `📋 Total Tasks: ${summary.total_tasks || 0}\n`;
      text += `✅ Completed: ${summary.completed || 0}\n`;
      text += `🔄 In Progress: ${summary.in_progress || 0}\n`;
      text += `⏳ Pending: ${summary.pending || 0}\n`;
      if (summary.overdue > 0) {
        text += `⚠️ Overdue: ${summary.overdue}\n`;
      }

      const targetUserIdForTime = member.user_id || user?.id || 0;
      if (includeTimeTracking && reportData.time_tracking?.[targetUserIdForTime]) {
        const tt = reportData.time_tracking[targetUserIdForTime];
        text += `\n⏱️ TIME TRACKING\n`;
        text += `⏰ Check-in: ${tt.check_in} | Check-out: ${tt.check_out}\n`;
        text += `⏳ Working Hours: ${tt.working_hours} (Effective: ${tt.effective_hours})\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📋 TASKS BREAKDOWN\n━━━━━━━━━━━━━━━━━━━━━\n`;

      const tasks = member.tasks || reportData.tasks || [];
      if (tasks.length === 0) {
        text += `(No tasks assigned for this date)\n`;
      } else {
        tasks.forEach((t: any, idx: number) => {
          const statusIcon = t.status === "Completed" ? "✅" : t.is_overdue ? "⚠️" : t.status === "Yet to Start" ? "⏳" : "🔄";
          text += `\n${idx + 1}. [${t.project_name}] ${t.title}\n`;
          text += `   • Status: ${statusIcon} ${t.status} [Pty: ${t.priority}]\n`;
          text += `   • Timeline: Start: ${formatShortDate(t.start_date)} | Due: ${formatShortDate(t.due_date)}${t.actual_completion_date ? ` | Achieved: ${formatShortDate(t.actual_completion_date)}` : ""}\n`;
          if (t.is_overdue) {
            text += `   • ⚠️ Deviation: Deviated by +${t.delay_days}d (Overdue)\n`;
          } else if (t.deviation) {
            text += `   • ⚠️ Deviation: ${t.deviation}\n`;
          }
          if (t.current_updates || t.description) {
            text += `   • Notes: ${t.current_updates || t.description}\n`;
          }
        });
      }
    } else {
      // Team report
      const title = reportType === "tomorrow_team" ? "TEAM TOMORROW'S SCHEDULE" : reportType === "full_tracker" ? "TEAM FULL TASK TRACKER" : "TEAM DAILY WORK REPORT";
      text += `📊 ${title}\n`;
      text += `📅 ${dateFormatted}\n`;
      text += `👥 ${teamName}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📈 TEAM SUMMARY\n`;
      text += `👥 Members: ${summary.total_members || 0}\n`;
      text += `📋 Total Tasks: ${summary.total_tasks || 0}\n`;
      text += `✅ Completed: ${summary.completed || 0}\n`;
      text += `🔄 In Progress: ${summary.in_progress || 0}\n`;
      text += `⏳ Pending: ${summary.pending || 0}\n`;
      text += `⚠️ Overdue: ${summary.overdue || 0}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `👤 TEAM MEMBER DETAILS\n━━━━━━━━━━━━━━━━━━━━━\n`;

      const members = reportData.member_reports || [];
      if (members.length === 0) {
        text += `(No member data available)\n`;
      } else {
        members.forEach((m: any) => {
          text += `\n👤 ${m.name} (${m.designation || "Member"})\n`;
          text += `📊 Tasks: ${m.total_tasks} | ✅ ${m.completed_count} | 🔄 ${m.in_progress_count} | ⚠️ ${m.overdue_count}\n`;

          if (includeTimeTracking && reportData.time_tracking?.[m.user_id]) {
            const tt = reportData.time_tracking[m.user_id];
            text += `⏱️ Time: ${tt.working_hours} (In: ${tt.check_in} | Out: ${tt.check_out})\n`;
          }

          const mTasks = m.tasks || [];
          if (mTasks.length === 0) {
            text += `  • (No tasks scheduled)\n`;
          } else {
            mTasks.forEach((t: any) => {
              const statusIcon = t.status === "Completed" ? "✅" : t.is_overdue ? "⚠️" : t.status === "Yet to Start" ? "⏳" : "🔄";
              text += `  • [${t.project_name}] ${t.title} [Pty: ${t.priority}] — ${statusIcon} ${t.status}\n`;
              text += `    📅 Start: ${formatShortDate(t.start_date)} | Due: ${formatShortDate(t.due_date)}${t.actual_completion_date ? ` | Achieved: ${formatShortDate(t.actual_completion_date)}` : ""}\n`;
              if (t.is_overdue) {
                text += `    ⚠️ Deviation: Deviated by +${t.delay_days}d (Overdue)\n`;
              } else if (t.deviation) {
                text += `    ⚠️ Deviation: ${t.deviation}\n`;
              }
              if (t.current_updates) {
                text += `    ↳ Updates: ${t.current_updates}\n`;
              }
            });
          }
        });
      }
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━\nGenerated via Inter Smart Workplace Portal`;
    return text;
  };

  // Generate Image Report Canvas (High Resolution 2x)
  const generateImageReport = () => {
    if (!reportData) return;
    setImageGenerating(true);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setImageGenerating(false);
      return;
    }

    const scale = 2; // High-res retina scale
    const width = 840;

    // Calculate dynamic canvas height
    let estimatedHeight = 220; // Header & metrics
    const memberReports = reportData.member_reports || [];

    if (isSingleMemberScope) {
      const tasks = memberReports[0]?.tasks || reportData.tasks || [];
      estimatedHeight += Math.max(140, tasks.length * 76 + 80);
      if (includeTimeTracking) estimatedHeight += 60;
    } else {
      memberReports.forEach((m: any) => {
        estimatedHeight += 50; // Member header
        const tCount = m.tasks?.length || 1;
        estimatedHeight += tCount * 74 + 14;
        if (includeTimeTracking) estimatedHeight += 26;
      });
      estimatedHeight += 60; // Footer
    }

    canvas.width = width * scale;
    canvas.height = estimatedHeight * scale;
    ctx.scale(scale, scale);

    // Deep modern dark canvas background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, estimatedHeight);

    // Top Brand Gradient Bar
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "#56348f");
    grad.addColorStop(0.5, "#7c3aed");
    grad.addColorStop(1, "#3b82f6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 8);

    // Header Content
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Proxima Nova', sans-serif";
    const reportTitle =
      isEmployee || reportType === "my_daily"
        ? "DAILY WORK REPORT"
        : reportType === "my_tomorrow"
        ? "TOMORROW'S SCHEDULE"
        : reportType === "individual_member"
        ? "INDIVIDUAL MEMBER REPORT"
        : reportType === "tomorrow_team"
        ? "TEAM TOMORROW'S SCHEDULE"
        : "TEAM DAILY WORK REPORT";

    ctx.fillText(reportTitle, 32, 44);

    // Subtitle
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px 'Proxima Nova', sans-serif";
    const dateFormatted = format(parseISO(reportData.date || selectedDate), "EEEE, dd MMMM yyyy");
    const entityName = isSingleMemberScope
      ? `${reportData.member_reports?.[0]?.name || loggedInUserName} • ${reportData.team?.name || "Inter Smart"}`
      : `${reportData.team?.name || "Development Team"} • Inter Smart Portal`;
    ctx.fillText(`${dateFormatted}  |  ${entityName}`, 32, 64);

    // Summary Metric Pills
    const summary = reportData.summary || {};
    const pillY = 82;
    const pillHeight = 52;
    const pillWidth = 146;

    const pills = [
      { label: "TOTAL TASKS", val: summary.total_tasks || 0, bg: "#131b2e", text: "#f8fafc", border: "#1e293b" },
      { label: "COMPLETED", val: summary.completed || 0, bg: "#064e3b", text: "#34d399", border: "#059669" },
      { label: "IN PROGRESS", val: summary.in_progress || 0, bg: "#1e3a8a", text: "#60a5fa", border: "#2563eb" },
      { label: "PENDING", val: summary.pending || 0, bg: "#312e81", text: "#a5b4fc", border: "#4338ca" },
      { label: "OVERDUE", val: summary.overdue || 0, bg: "#881337", text: "#f43f5e", border: "#e11d48" },
    ];

    pills.forEach((p, idx) => {
      const px = 32 + idx * (pillWidth + 10);
      ctx.fillStyle = p.bg;
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px, pillY, pillWidth, pillHeight, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px 'Proxima Nova', sans-serif";
      ctx.fillText(p.label, px + 12, pillY + 18);

      ctx.fillStyle = p.text;
      ctx.font = "bold 20px 'Proxima Nova', sans-serif";
      ctx.fillText(String(p.val), px + 12, pillY + 41);
    });

    let currentY = 158;

    // Body content
    if (isSingleMemberScope) {
      const member = memberReports[0] || {};
      const tasks = member.tasks || reportData.tasks || [];
      const targetUserIdForTime = member.user_id || user?.id || 0;

      // Time tracking box if enabled
      if (includeTimeTracking && reportData.time_tracking?.[targetUserIdForTime]) {
        const tt = reportData.time_tracking[targetUserIdForTime];
        ctx.fillStyle = "#131b2e";
        ctx.strokeStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(32, currentY, width - 64, 38, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 11px 'Proxima Nova', sans-serif";
        ctx.fillText("⏱️ TIME TRACKING:", 46, currentY + 24);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "11px 'Proxima Nova', sans-serif";
        ctx.fillText(`Check-in: ${tt.check_in}   |   Check-out: ${tt.check_out}   |   Total: ${tt.working_hours} (Effective: ${tt.effective_hours})`, 160, currentY + 24);

        currentY += 50;
      }

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 13px 'Proxima Nova', sans-serif";
      ctx.fillText("ASSIGNED TASKS & DELIVERABLES", 32, currentY);
      currentY += 16;

      if (tasks.length === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "italic 12px 'Proxima Nova', sans-serif";
        ctx.fillText("No tasks recorded for this date.", 32, currentY + 20);
        currentY += 40;
      } else {
        tasks.forEach((t: any) => {
          const cardHeight = 64;
          ctx.fillStyle = "#131b2e";
          ctx.strokeStyle = t.is_overdue ? "#f43f5e" : "#1e293b";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(32, currentY, width - 64, cardHeight, 8);
          ctx.fill();
          ctx.stroke();

          // Left Priority Accent Badge (Pty: M)
          const ptyLetter = t.priority ? t.priority.charAt(0) : "M";
          const ptyBg = t.priority === "High" || t.priority === "Critical" ? "#7f1d1d" : t.priority === "Medium" ? "#78350f" : "#1e293b";
          const ptyText = t.priority === "High" || t.priority === "Critical" ? "#fca5a5" : t.priority === "Medium" ? "#fde68a" : "#94a3b8";

          ctx.fillStyle = ptyBg;
          ctx.beginPath();
          ctx.roundRect(44, currentY + 12, 22, 18, 4);
          ctx.fill();
          ctx.fillStyle = ptyText;
          ctx.font = "bold 10px 'Proxima Nova', sans-serif";
          ctx.fillText(ptyLetter, 52, currentY + 25);

          // Project Name & Task Title
          ctx.fillStyle = "#c084fc";
          ctx.font = "bold 11px 'Proxima Nova', sans-serif";
          const projText = `[${t.project_name}] `;
          ctx.fillText(projText, 74, currentY + 25);

          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 12px 'Proxima Nova', sans-serif";
          ctx.fillText(t.title, 74 + ctx.measureText(projText).width, currentY + 25);

          // Status Badge Pill (Right Side)
          const isComp = t.status === "Completed";
          const statusBg = isComp ? "#064e3b" : t.is_overdue ? "#881337" : "#1e3a8a";
          const statusBorder = isComp ? "#059669" : t.is_overdue ? "#e11d48" : "#2563eb";
          const statusColor = isComp ? "#34d399" : t.is_overdue ? "#f43f5e" : "#60a5fa";
          const statusLabel = isComp ? "Completed" : t.is_overdue ? `Overdue (${t.delay_days}d)` : t.status;

          ctx.font = "bold 10px 'Proxima Nova', sans-serif";
          const badgeWidth = ctx.measureText(statusLabel).width + 18;
          const badgeX = width - 44 - badgeWidth;

          ctx.fillStyle = statusBg;
          ctx.strokeStyle = statusBorder;
          ctx.beginPath();
          ctx.roundRect(badgeX, currentY + 12, badgeWidth, 20, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = statusColor;
          ctx.fillText(statusLabel, badgeX + 9, currentY + 26);

          // Line 2: Start Date, End/Due Date, Achieved Date, Deviation info
          const startStr = `Start: ${formatShortDate(t.start_date)}`;
          const dueStr = `End: ${formatShortDate(t.due_date)}`;
          const achStr = t.actual_completion_date ? `Achieved: ${formatShortDate(t.actual_completion_date)}` : "";

          ctx.fillStyle = "#94a3b8";
          ctx.font = "10px 'Proxima Nova', sans-serif";
          let line2Text = `📅 ${startStr}   •   🎯 ${dueStr}`;
          if (achStr) {
            line2Text += `   •   🏁 ${achStr}`;
          }

          ctx.fillText(line2Text, 44, currentY + 49);

          // Line 2 Right / Deviation info
          if (t.is_overdue) {
            ctx.fillStyle = "#f43f5e";
            ctx.font = "bold 10px 'Proxima Nova', sans-serif";
            ctx.fillText(`⚠️ Deviated (+${t.delay_days}d delay)`, width - 210, currentY + 49);
          } else if (t.deviation) {
            ctx.fillStyle = "#f59e0b";
            ctx.font = "bold 10px 'Proxima Nova', sans-serif";
            ctx.fillText(`⚠️ ${t.deviation}`, width - 210, currentY + 49);
          } else if (isComp) {
            ctx.fillStyle = "#34d399";
            ctx.font = "10px 'Proxima Nova', sans-serif";
            ctx.fillText("⚡ On-Time Completion", width - 180, currentY + 49);
          }

          currentY += 72;
        });
      }
    } else {
      // Team report: Member cards with structured Task sub-cards
      memberReports.forEach((m: any) => {
        // Member Header Card
        ctx.fillStyle = "#131b2e";
        ctx.strokeStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(32, currentY, width - 64, 34, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 12px 'Proxima Nova', sans-serif";
        ctx.fillText(`👤 ${m.name}  (${m.designation || "Member"})`, 46, currentY + 22);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px 'Proxima Nova', sans-serif";
        ctx.fillText(`Tasks: ${m.total_tasks}  |  ✅ ${m.completed_count}  |  🔄 ${m.in_progress_count}  |  ⚠️ ${m.overdue_count}`, width - 270, currentY + 22);

        currentY += 42;

        const mTasks = m.tasks || [];
        if (mTasks.length === 0) {
          ctx.fillStyle = "#64748b";
          ctx.font = "italic 11px 'Proxima Nova', sans-serif";
          ctx.fillText("• No tasks assigned for this date", 46, currentY + 14);
          currentY += 26;
        } else {
          mTasks.forEach((t: any) => {
            const isComp = t.status === "Completed";
            ctx.fillStyle = "#0c1322";
            ctx.strokeStyle = t.is_overdue ? "#f43f5e" : "#1e293b";
            ctx.beginPath();
            ctx.roundRect(44, currentY, width - 88, 62, 6);
            ctx.fill();
            ctx.stroke();

            // Priority badge
            const ptyLetter = t.priority ? t.priority.charAt(0) : "M";
            ctx.fillStyle = t.priority === "High" || t.priority === "Critical" ? "#7f1d1d" : "#1e293b";
            ctx.beginPath();
            ctx.roundRect(54, currentY + 10, 18, 16, 3);
            ctx.fill();
            ctx.fillStyle = t.priority === "High" || t.priority === "Critical" ? "#fca5a5" : "#cbd5e1";
            ctx.font = "bold 9px 'Proxima Nova', sans-serif";
            ctx.fillText(ptyLetter, 60, currentY + 22);

            // Project & Task Name
            ctx.fillStyle = "#c084fc";
            ctx.font = "bold 10px 'Proxima Nova', sans-serif";
            const projTag = `[${t.project_name}] `;
            ctx.fillText(projTag, 78, currentY + 22);

            ctx.fillStyle = "#f1f5f9";
            ctx.font = "11px 'Proxima Nova', sans-serif";
            ctx.fillText(t.title, 78 + ctx.measureText(projTag).width, currentY + 22);

            // Status Pill (Right)
            const statusLabel = isComp ? "Completed" : t.is_overdue ? `Overdue (${t.delay_days}d)` : t.status;
            const statusColor = isComp ? "#34d399" : t.is_overdue ? "#f43f5e" : "#60a5fa";
            ctx.font = "bold 9px 'Proxima Nova', sans-serif";
            const statusWidth = ctx.measureText(statusLabel).width + 14;
            const statusX = width - 56 - statusWidth;

            ctx.fillStyle = isComp ? "#064e3b" : t.is_overdue ? "#881337" : "#1e3a8a";
            ctx.strokeStyle = isComp ? "#059669" : t.is_overdue ? "#e11d48" : "#2563eb";
            ctx.beginPath();
            ctx.roundRect(statusX, currentY + 10, statusWidth, 18, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = statusColor;
            ctx.fillText(statusLabel, statusX + 7, currentY + 22);

            // Line 2: Start, End, Achieved & Deviation
            const startStr = `Start: ${formatShortDate(t.start_date)}`;
            const dueStr = `End: ${formatShortDate(t.due_date)}`;
            const achStr = t.actual_completion_date ? `Achieved: ${formatShortDate(t.actual_completion_date)}` : "";

            ctx.fillStyle = "#94a3b8";
            ctx.font = "9px 'Proxima Nova', sans-serif";
            let line2 = `📅 ${startStr}   •   🎯 ${dueStr}`;
            if (achStr) line2 += `   •   🏁 ${achStr}`;
            ctx.fillText(line2, 54, currentY + 47);

            // Deviation tag if overdue / deviated
            if (t.is_overdue) {
              ctx.fillStyle = "#f43f5e";
              ctx.font = "bold 9px 'Proxima Nova', sans-serif";
              ctx.fillText(`⚠️ Deviated (+${t.delay_days}d)`, width - 200, currentY + 47);
            } else if (t.deviation) {
              ctx.fillStyle = "#f59e0b";
              ctx.font = "bold 9px 'Proxima Nova', sans-serif";
              ctx.fillText(`⚠️ ${t.deviation}`, width - 200, currentY + 47);
            } else if (isComp) {
              ctx.fillStyle = "#34d399";
              ctx.font = "9px 'Proxima Nova', sans-serif";
              ctx.fillText("⚡ On-Time", width - 150, currentY + 47);
            }

            currentY += 70;
          });
        }

        currentY += 12;
      });
    }

    // Footer
    ctx.fillStyle = "#475569";
    ctx.font = "10px 'Proxima Nova', sans-serif";
    ctx.fillText("Generated from Inter Smart Workplace Portal", 32, estimatedHeight - 15);

    const dataUrl = canvas.toDataURL("image/png");
    setGeneratedImageUrl(dataUrl);
    setImageModalOpen(true);
    setImageGenerating(false);
  };

  const copyTextReport = async () => {
    const text = generateTextReport();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const downloadImage = () => {
    if (!generatedImageUrl) return;
    const a = document.createElement("a");
    const fileName =
      isEmployee || reportType === "my_daily" || reportType === "my_tomorrow"
        ? `my_daily_report_${selectedDate}.png`
        : `team_daily_report_${selectedDate}.png`;
    a.href = generatedImageUrl;
    a.download = fileName;
    a.click();
  };

  const copyImageToClipboard = async () => {
    if (!generatedImageUrl) return;
    try {
      const res = await fetch(generatedImageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy image to clipboard", err);
    }
  };

  const summary = reportData?.summary || {};

  return (
    <>
      {/* ── Main Daily Report Right-Side Drawer ── */}
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onClick={onClose} />

        <div className="fixed inset-y-0 right-0 max-w-2xl sm:max-w-3xl w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-right duration-300">
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Daily Reports</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {isEmployee ? "Employee Mode" : isTeamLead ? "Team Lead Mode" : "Admin Mode"}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEmployee
                    ? "Generate and export your personal daily work report."
                    : "Generate complete team work report or individual member reports."}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. Report Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Report Type
                </label>
                {isEmployee ? (
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="my_daily">My Daily Report</option>
                    <option value="my_tomorrow">My Tomorrow's Schedule</option>
                  </select>
                ) : (
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="full_team_daily">Full Team Daily Report</option>
                    <option value="individual_member">Individual Member Report</option>
                    <option value="my_daily">My Daily Report</option>
                    <option value="tomorrow_team">Tomorrow's Team Schedule</option>
                    <option value="full_tracker">Full Tracker</option>
                  </select>
                )}
              </div>

              {/* 2. Date Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Report Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* 3. Team / Member Selector (Role-based) */}
              {isEmployee ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Employee Scope
                  </label>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Me ({loggedInUserName})</span>
                  </div>
                </div>
              ) : reportType === "individual_member" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Select Member
                  </label>
                  <select
                    value={selectedUserId || ""}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    {reportData?.team_members?.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.employee_code || m.designation || "Member"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Assigned Team
                  </label>
                  {reportData?.available_teams && reportData.available_teams.length > 1 ? (
                    <select
                      value={selectedTeamId || ""}
                      onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      {reportData.available_teams.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="truncate">{reportData?.team?.name || "Assigned Team"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Time Tracking Toggle */}
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:border-purple-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeTimeTracking}
                    onChange={(e) => setIncludeTimeTracking(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                  <span>Include Time Tracking</span>
                </label>
              </div>
            </div>
          </div>

          {/* Metric Summary Ribbon */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {!isSingleMemberScope && reportData?.summary?.total_members !== undefined && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{summary.total_members || 0} Members</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>{summary.total_tasks || 0} Total Tasks</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{summary.completed || 0} Completed</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">
                <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>{summary.in_progress || 0} In Progress</span>
              </div>

              {summary.overdue > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>{summary.overdue} Overdue</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={copyTextReport}
                disabled={loading || !reportData}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? "Copied!" : "Copy Text Report"}</span>
              </button>

              <button
                onClick={generateImageReport}
                disabled={loading || !reportData || imageGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#56348f] hover:bg-purple-800 !text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-purple-500/20"
              >
                {imageGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin !text-white" /> : <ImageIcon className="w-3.5 h-3.5 !text-white" />}
                <span className="!text-white font-bold">Generate Image Report</span>
              </button>
            </div>
          </div>

          {/* Report Preview Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading daily report data...</p>
              </div>
            ) : !reportData || (!reportData.tasks?.length && !reportData.member_reports?.[0]?.tasks?.length) ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 italic text-xs">
                No task records found for the selected date and filters.
              </div>
            ) : isSingleMemberScope ? (
              /* Single Employee View (Employee mode OR Individual Member Mode) */
              <div className="space-y-4">
                {/* Member Banner Card for Individual Member Report */}
                {reportType === "individual_member" && reportData.member_reports?.[0] && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center">
                        {reportData.member_reports[0].name?.[0] || "U"}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {reportData.member_reports[0].name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {reportData.member_reports[0].designation || "Member"} {reportData.member_reports[0].employee_code && `• ${reportData.member_reports[0].employee_code}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                      {reportData.member_reports[0].total_tasks} Tasks Scheduled
                    </span>
                  </div>
                )}

                {/* Time Tracking Card */}
                {includeTimeTracking && reportData.time_tracking && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-slate-900 dark:text-white">Time Tracking:</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        Check-in: {reportData.time_tracking[reportData.member_reports?.[0]?.user_id || user?.id || 0]?.check_in || "—"} | Check-out: {reportData.time_tracking[reportData.member_reports?.[0]?.user_id || user?.id || 0]?.check_out || "—"}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      Total Working Hours: <span className="font-bold text-purple-600 dark:text-purple-400">{reportData.time_tracking[reportData.member_reports?.[0]?.user_id || user?.id || 0]?.working_hours || "0h 00m"}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {(reportData.member_reports?.[0]?.tasks || reportData.tasks || []).map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                            {t.project_name}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {t.title}
                          </h4>
                        </div>
                        {t.current_updates && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-slate-300 dark:border-slate-700">
                            {t.current_updates}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {t.priority}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            t.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                              : t.is_overdue
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {t.status} {t.is_overdue && `(! ${t.delay_days}d)`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Team View: Member-wise Grouping */
              <div className="space-y-6">
                {reportData.member_reports?.map((m: any) => (
                  <div
                    key={m.user_id}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm"
                  >
                    {/* Member Header */}
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                          {m.name?.[0] || "U"}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {m.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {m.designation || "Member"} {m.employee_code && `• ${m.employee_code}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        {includeTimeTracking && reportData.time_tracking?.[m.user_id] && (
                          <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                            ⏱️ {reportData.time_tracking[m.user_id].working_hours}
                          </span>
                        )}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {m.total_tasks} Tasks:
                        </span>
                        <span className="text-emerald-600 font-bold">✅ {m.completed_count}</span>
                        <span className="text-blue-600 font-bold">🔄 {m.in_progress_count}</span>
                        {m.overdue_count > 0 && <span className="text-rose-600 font-bold">⚠️ {m.overdue_count}</span>}
                      </div>
                    </div>

                    {/* Member Tasks */}
                    <div className="p-3.5 space-y-2">
                      {m.tasks?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No tasks assigned for this date.</p>
                      ) : (
                        m.tasks.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 truncate">
                              <span className="text-purple-600 dark:text-purple-400 font-bold mr-2">
                                [{t.project_name}]
                              </span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                {t.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-slate-500">{t.priority}</span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  t.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : t.is_overdue
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                }`}
                              >
                                {t.status} {t.is_overdue && `(!${t.delay_days}d)`}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Live data from Inter Smart Project Tasks
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Generated Image Preview Modal ── */}
      {imageModalOpen && generatedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setImageModalOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Daily Report Image Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyImageToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                >
                  {imageCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{imageCopied ? "Copied Image!" : "Copy Image"}</span>
                </button>
                <button
                  onClick={downloadImage}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={() => setImageModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canvas / Image Container */}
            <div className="p-6 overflow-auto flex items-center justify-center bg-slate-950/80">
              <img
                src={generatedImageUrl}
                alt="Daily Work Report"
                className="max-w-full h-auto rounded-xl shadow-2xl border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
