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

  // Date context helpers — compare selected date to today (IST)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = selectedDate === todayStr;
  const isFutureDate = selectedDate > todayStr;

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
      const title =
        reportType === "my_tomorrow"
          ? "TOMORROW'S WORK SCHEDULE"
          : reportType === "individual_member"
          ? isToday
            ? "INDIVIDUAL MEMBER TODAY'S REPORT"
            : isFutureDate
            ? "INDIVIDUAL MEMBER WORK SCHEDULE"
            : "INDIVIDUAL MEMBER DAILY REPORT"
          : isToday
          ? "TODAY'S WORK REPORT"
          : isFutureDate
          ? "WORK SCHEDULE FOR THE DAY"
          : "DAILY WORK REPORT";
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
      const title =
        reportType === "tomorrow_team"
          ? "TEAM TOMORROW'S SCHEDULE"
          : reportType === "full_tracker"
          ? "TEAM FULL TASK TRACKER"
          : isToday
          ? "TEAM TODAY'S WORK REPORT"
          : isFutureDate
          ? "TEAM WORK SCHEDULE FOR THE DAY"
          : "TEAM DAILY WORK REPORT";
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

  // Generate Image Report Canvas (High Resolution 2x - Clean Light Theme Enterprise Table)
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
    const width = 880;
    const marginX = 36;
    const tableWidth = width - marginX * 2; // 808px

    // Column widths: # (40px), Task (356px), Priority (68px), Schedule (162px), Status (182px)
    const colWidths = [40, 356, 68, 162, 182];
    const colX = [
      marginX,
      marginX + colWidths[0],
      marginX + colWidths[0] + colWidths[1],
      marginX + colWidths[0] + colWidths[1] + colWidths[2],
      marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    ];

    const memberReports = reportData.member_reports || [];

    // Calculate dynamic canvas height
    let estimatedHeight = 180; // Header & metrics
    if (includeTimeTracking) estimatedHeight += 48;

    if (isSingleMemberScope) {
      const tasks = memberReports[0]?.tasks || reportData.tasks || [];
      const rowH = 58;
      estimatedHeight += 38; // Table header
      estimatedHeight += Math.max(1, tasks.length) * rowH;
      estimatedHeight += 60; // Bottom footer
    } else {
      memberReports.forEach((m: any) => {
        estimatedHeight += 38; // Member banner
        estimatedHeight += 32; // Table header
        const tCount = m.tasks?.length || 1;
        estimatedHeight += tCount * 56;
        if (includeTimeTracking) estimatedHeight += 24;
        estimatedHeight += 16; // Member bottom spacing
      });
      estimatedHeight += 60; // Bottom footer
    }

    canvas.width = width * scale;
    canvas.height = estimatedHeight * scale;
    ctx.scale(scale, scale);

    // 1. Crisp White Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, estimatedHeight);

    // Top Brand Accent Bar (Corporate Royal Purple)
    ctx.fillStyle = "#56348f";
    ctx.fillRect(0, 0, width, 5);

    // 2. Header Section
    // Brand Tag
    ctx.fillStyle = "#56348f";
    ctx.font = "bold 11px 'Proxima Nova', sans-serif";
    ctx.fillText("INTER SMART WORKPLACE", marginX, 30);

    // Report Title — adapts to selected date: today vs future vs past
    const reportTitle =
      reportType === "my_tomorrow"
        ? "TOMORROW'S WORK SCHEDULE"
        : reportType === "tomorrow_team"
        ? "TEAM TOMORROW'S SCHEDULE"
        : reportType === "full_tracker"
        ? "TEAM FULL TASK TRACKER"
        : reportType === "individual_member"
        ? isToday
          ? "INDIVIDUAL MEMBER TODAY'S REPORT"
          : isFutureDate
          ? "INDIVIDUAL MEMBER WORK SCHEDULE"
          : "INDIVIDUAL MEMBER DAILY REPORT"
        : isSingleMemberScope
        ? isToday
          ? "TODAY'S WORK REPORT"
          : isFutureDate
          ? "WORK SCHEDULE FOR THE DAY"
          : "DAILY WORK REPORT"
        : isToday
        ? "TEAM TODAY'S WORK REPORT"
        : isFutureDate
        ? "TEAM WORK SCHEDULE FOR THE DAY"
        : "TEAM DAILY WORK REPORT";

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px 'Proxima Nova', sans-serif";
    ctx.fillText(reportTitle, marginX, 54);

    // Subtitle / Date & Scope
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Proxima Nova', sans-serif";
    const dateFormatted = format(parseISO(reportData.date || selectedDate), "EEEE, dd MMMM yyyy");
    const entityName = isSingleMemberScope
      ? `${reportData.member_reports?.[0]?.name || loggedInUserName}  •  ${reportData.team?.name || "Inter Smart"}`
      : `${reportData.team?.name || "Department"}  •  Inter Smart Portal`;
    ctx.fillText(`${dateFormatted}   |   ${entityName}`, marginX, 74);

    // Right Side Confidential / Official Stamp
    ctx.strokeStyle = "#cbd5e1";
    ctx.fillStyle = "#f8fafc";
    ctx.lineWidth = 1;
    ctx.strokeRect(width - marginX - 140, 24, 140, 48);
    ctx.fillRect(width - marginX - 140, 24, 140, 48);

    ctx.fillStyle = "#56348f";
    ctx.font = "bold 9px 'Proxima Nova', sans-serif";
    ctx.fillText("OFFICIAL REPORT", width - marginX - 128, 42);
    ctx.fillStyle = "#64748b";
    ctx.font = "9px 'Proxima Nova', sans-serif";
    ctx.fillText("VERIFIED ACCURACY", width - marginX - 128, 58);

    // 3. Summary Metric Grid (Clean rectangular data boxes, NO pill shapes)
    const summary = reportData.summary || {};
    const kpiY = 92;
    const kpiH = 50;
    const kpiGap = 10;
    const kpiW = (tableWidth - kpiGap * 4) / 5; // ~153.6px

    const metrics = [
      { label: "TOTAL TASKS", val: summary.total_tasks || 0, topColor: "#64748b", valColor: "#0f172a" },
      { label: "COMPLETED", val: summary.completed || 0, topColor: "#059669", valColor: "#059669" },
      { label: "IN PROGRESS", val: summary.in_progress || 0, topColor: "#2563eb", valColor: "#2563eb" },
      { label: "PENDING", val: summary.pending || 0, topColor: "#7c3aed", valColor: "#7c3aed" },
      { label: "OVERDUE", val: summary.overdue || 0, topColor: "#dc2626", valColor: "#dc2626" },
    ];

    metrics.forEach((m, idx) => {
      const kx = marginX + idx * (kpiW + kpiGap);

      // Box background & border
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(kx, kpiY, kpiW, kpiH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(kx, kpiY, kpiW, kpiH);

      // Top colored indicator line
      ctx.fillStyle = m.topColor;
      ctx.fillRect(kx, kpiY, kpiW, 3);

      // Metric Label
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px 'Proxima Nova', sans-serif";
      ctx.fillText(m.label, kx + 10, kpiY + 18);

      // Metric Value
      ctx.fillStyle = m.valColor;
      ctx.font = "bold 20px 'Proxima Nova', sans-serif";
      ctx.fillText(String(m.val), kx + 10, kpiY + 41);
    });

    let currentY = 158;

    // Helper: Draw Table Header with Column Borders
    const drawTableHeader = (y: number, h = 32) => {
      // Header background
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(marginX, y, tableWidth, h);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, y, tableWidth, h);

      // Vertical Column Dividers
      for (let i = 1; i < colX.length; i++) {
        ctx.beginPath();
        ctx.moveTo(colX[i], y);
        ctx.lineTo(colX[i], y + h);
        ctx.stroke();
      }

      // Column Header Labels
      ctx.fillStyle = "#334155";
      ctx.font = "bold 10px 'Proxima Nova', sans-serif";

      // Col 1: #
      ctx.textAlign = "center";
      ctx.fillText("#", colX[0] + colWidths[0] / 2, y + 20);

      // Col 2: TASK & DELIVERABLE
      ctx.textAlign = "left";
      ctx.fillText("TASK & DELIVERABLE", colX[1] + 10, y + 20);

      // Col 3: PRIORITY
      ctx.textAlign = "center";
      ctx.fillText("PRIORITY", colX[2] + colWidths[2] / 2, y + 20);

      // Col 4: SCHEDULE
      ctx.textAlign = "left";
      ctx.fillText("SCHEDULE / TIMELINE", colX[3] + 10, y + 20);

      // Col 5: STATUS & REMARKS
      ctx.fillText("STATUS & REMARKS", colX[4] + 10, y + 20);
      ctx.textAlign = "left";
    };

    // Helper: Draw Single Table Row with Column Borders
    const drawTableRow = (t: any, index: number, y: number, h = 58) => {
      const isEven = index % 2 === 0;
      ctx.fillStyle = isEven ? "#ffffff" : "#f8fafc";
      ctx.fillRect(marginX, y, tableWidth, h);

      // Outer row box
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, y, tableWidth, h);

      // Vertical Column Grid Lines
      for (let i = 1; i < colX.length; i++) {
        ctx.beginPath();
        ctx.moveTo(colX[i], y);
        ctx.lineTo(colX[i], y + h);
        ctx.stroke();
      }

      // Col 1: Index Number
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px 'Proxima Nova', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), colX[0] + colWidths[0] / 2, y + 32);
      ctx.textAlign = "left";

      // Col 2: Project Tag & Task Title
      const projTag = `[${t.project_name || "Project"}] `;
      ctx.fillStyle = "#56348f";
      ctx.font = "bold 11px 'Proxima Nova', sans-serif";
      ctx.fillText(projTag, colX[1] + 10, y + 22);

      const tagWidth = ctx.measureText(projTag).width;
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px 'Proxima Nova', sans-serif";

      // Truncate task title if too wide for column
      let titleStr = t.title || "Task";
      const maxTitleW = colWidths[1] - tagWidth - 20;
      if (ctx.measureText(titleStr).width > maxTitleW) {
        while (ctx.measureText(titleStr + "...").width > maxTitleW && titleStr.length > 5) {
          titleStr = titleStr.substring(0, titleStr.length - 1);
        }
        titleStr += "...";
      }
      ctx.fillText(titleStr, colX[1] + 10 + tagWidth, y + 22);

      // Secondary note or update (if any)
      if (t.current_updates || t.description) {
        const noteStr = t.current_updates || t.description;
        ctx.fillStyle = "#64748b";
        ctx.font = "10px 'Proxima Nova', sans-serif";
        let subNote = `↳ Updates: ${noteStr}`;
        if (ctx.measureText(subNote).width > colWidths[1] - 20) {
          subNote = subNote.substring(0, 48) + "...";
        }
        ctx.fillText(subNote, colX[1] + 10, y + 42);
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px 'Proxima Nova', sans-serif";
        ctx.fillText(`ID: #${t.id || "—"}`, colX[1] + 10, y + 42);
      }

      // Col 3: Priority (Square badge with clean border)
      const pty = t.priority || "Medium";
      const isHigh = pty === "High" || pty === "Critical";
      const isMed = pty === "Medium";
      const ptyBg = isHigh ? "#fef2f2" : isMed ? "#fffbeb" : "#f8fafc";
      const ptyBorder = isHigh ? "#fca5a5" : isMed ? "#fde68a" : "#cbd5e1";
      const ptyColor = isHigh ? "#b91c1c" : isMed ? "#b45309" : "#475569";

      const ptyBoxW = 46;
      const ptyBoxH = 20;
      const ptyBoxX = colX[2] + (colWidths[2] - ptyBoxW) / 2;
      const ptyBoxY = y + 19;

      ctx.fillStyle = ptyBg;
      ctx.fillRect(ptyBoxX, ptyBoxY, ptyBoxW, ptyBoxH);
      ctx.strokeStyle = ptyBorder;
      ctx.strokeRect(ptyBoxX, ptyBoxY, ptyBoxW, ptyBoxH);

      ctx.fillStyle = ptyColor;
      ctx.font = "bold 9px 'Proxima Nova', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pty.toUpperCase(), ptyBoxX + ptyBoxW / 2, ptyBoxY + 14);
      ctx.textAlign = "left";

      // Col 4: Schedule / Timeline
      ctx.fillStyle = "#475569";
      ctx.font = "10px 'Proxima Nova', sans-serif";
      ctx.fillText(`Start: ${formatShortDate(t.start_date)}`, colX[3] + 10, y + 21);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 10px 'Proxima Nova', sans-serif";
      ctx.fillText(`Due:   ${formatShortDate(t.due_date)}`, colX[3] + 10, y + 36);

      if (t.actual_completion_date) {
        ctx.fillStyle = "#059669";
        ctx.font = "10px 'Proxima Nova', sans-serif";
        ctx.fillText(`Achieved: ${formatShortDate(t.actual_completion_date)}`, colX[3] + 10, y + 50);
      }

      // Col 5: Status & Deviation Remarks (Square badge)
      const isComp = t.status === "Completed";
      const isOvd = t.is_overdue;
      const statBg = isComp ? "#ecfdf5" : isOvd ? "#fef2f2" : t.status === "In Progress" ? "#eff6ff" : "#f5f3ff";
      const statBorder = isComp ? "#a7f3d0" : isOvd ? "#fecaca" : t.status === "In Progress" ? "#bfdbfe" : "#ddd6fe";
      const statColor = isComp ? "#047857" : isOvd ? "#b91c1c" : t.status === "In Progress" ? "#1d4ed8" : "#6d28d9";
      const statLabel = isComp ? "COMPLETED" : isOvd ? `OVERDUE (${t.delay_days}d)` : t.status.toUpperCase();

      ctx.font = "bold 9px 'Proxima Nova', sans-serif";
      const statW = ctx.measureText(statLabel).width + 16;
      const statBoxY = y + 14;

      ctx.fillStyle = statBg;
      ctx.fillRect(colX[4] + 10, statBoxY, statW, 20);
      ctx.strokeStyle = statBorder;
      ctx.strokeRect(colX[4] + 10, statBoxY, statW, 20);

      ctx.fillStyle = statColor;
      ctx.fillText(statLabel, colX[4] + 18, statBoxY + 14);

      // Line 2 Remarks
      if (t.is_overdue) {
        ctx.fillStyle = "#dc2626";
        ctx.font = "bold 9px 'Proxima Nova', sans-serif";
        ctx.fillText(`⚠️ Deviated (+${t.delay_days}d delay)`, colX[4] + 10, y + 48);
      } else if (t.deviation) {
        ctx.fillStyle = "#d97706";
        ctx.font = "bold 9px 'Proxima Nova', sans-serif";
        ctx.fillText(`⚠️ ${t.deviation}`, colX[4] + 10, y + 48);
      } else if (isComp) {
        ctx.fillStyle = "#059669";
        ctx.font = "9px 'Proxima Nova', sans-serif";
        ctx.fillText("⚡ On-Time Completion", colX[4] + 10, y + 48);
      }
    };

    // Body content: Single Member Scope vs Multi-Member Scope
    if (isSingleMemberScope) {
      const member = memberReports[0] || {};
      const tasks = member.tasks || reportData.tasks || [];
      const targetUserIdForTime = member.user_id || user?.id || 0;

      // Time tracking bar if enabled
      if (includeTimeTracking && reportData.time_tracking?.[targetUserIdForTime]) {
        const tt = reportData.time_tracking[targetUserIdForTime];
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(marginX, currentY, tableWidth, 34);
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(marginX, currentY, tableWidth, 34);

        ctx.fillStyle = "#56348f";
        ctx.font = "bold 10px 'Proxima Nova', sans-serif";
        ctx.fillText("⏱️ TIME TRACKING:", marginX + 12, currentY + 21);

        ctx.fillStyle = "#334155";
        ctx.font = "10px 'Proxima Nova', sans-serif";
        ctx.fillText(`Check-in: ${tt.check_in}   |   Check-out: ${tt.check_out}   |   Total Working Hours: ${tt.working_hours} (Effective: ${tt.effective_hours})`, marginX + 130, currentY + 21);

        currentY += 44;
      }

      // Draw Main Table Header
      drawTableHeader(currentY, 32);
      currentY += 32;

      if (tasks.length === 0) {
        // Empty row with full border
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(marginX, currentY, tableWidth, 48);
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(marginX, currentY, tableWidth, 48);

        ctx.fillStyle = "#64748b";
        ctx.font = "italic 11px 'Proxima Nova', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("• No tasks recorded for this date •", marginX + tableWidth / 2, currentY + 28);
        ctx.textAlign = "left";
        currentY += 48;
      } else {
        tasks.forEach((t: any, idx: number) => {
          drawTableRow(t, idx, currentY, 58);
          currentY += 58;
        });
      }
    } else {
      // Team report: Member by member structured tables
      memberReports.forEach((m: any) => {
        // Member Banner (Clean rectangular box)
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(marginX, currentY, tableWidth, 32);
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(marginX, currentY, tableWidth, 32);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 11px 'Proxima Nova', sans-serif";
        ctx.fillText(`👤 ${m.name}   (${m.designation || "Member"})`, marginX + 12, currentY + 20);

        ctx.fillStyle = "#475569";
        ctx.font = "bold 10px 'Proxima Nova', sans-serif";
        const mSummary = `Tasks: ${m.total_tasks}   |   ✅ ${m.completed_count}   |   🔄 ${m.in_progress_count}   |   ⚠️ ${m.overdue_count}`;
        ctx.textAlign = "right";
        ctx.fillText(mSummary, width - marginX - 12, currentY + 20);
        ctx.textAlign = "left";

        currentY += 32;

        // Time tracking under member banner if active
        if (includeTimeTracking && reportData.time_tracking?.[m.user_id]) {
          const tt = reportData.time_tracking[m.user_id];
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(marginX, currentY, tableWidth, 24);
          ctx.strokeStyle = "#cbd5e1";
          ctx.strokeRect(marginX, currentY, tableWidth, 24);

          ctx.fillStyle = "#64748b";
          ctx.font = "10px 'Proxima Nova', sans-serif";
          ctx.fillText(`⏱️ Working Time: ${tt.working_hours}  (In: ${tt.check_in} | Out: ${tt.check_out})`, marginX + 12, currentY + 16);
          currentY += 24;
        }

        // Draw Table Header
        drawTableHeader(currentY, 28);
        currentY += 28;

        const mTasks = m.tasks || [];
        if (mTasks.length === 0) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(marginX, currentY, tableWidth, 40);
          ctx.strokeStyle = "#cbd5e1";
          ctx.strokeRect(marginX, currentY, tableWidth, 40);

          ctx.fillStyle = "#94a3b8";
          ctx.font = "italic 11px 'Proxima Nova', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("No tasks assigned for this date", marginX + tableWidth / 2, currentY + 24);
          ctx.textAlign = "left";
          currentY += 40;
        } else {
          mTasks.forEach((t: any, idx: number) => {
            drawTableRow(t, idx, currentY, 56);
            currentY += 56;
          });
        }

        currentY += 16; // Spacing between members
      });
    }

    // 4. Footer Section
    currentY += 12;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, currentY);
    ctx.lineTo(width - marginX, currentY);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px 'Proxima Nova', sans-serif";
    ctx.fillText("Generated from Inter Smart Workplace Portal", marginX, currentY + 20);

    const timeStampStr = format(new Date(), "dd MMM yyyy, hh:mm a");
    ctx.textAlign = "right";
    ctx.fillText(`Exported on ${timeStampStr}`, width - marginX, currentY + 20);
    ctx.textAlign = "left";

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
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Report Image Preview</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Copy to clipboard or download as high-resolution PNG</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={copyImageToClipboard}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-600 shadow-sm"
                >
                  {imageCopied ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  )}
                  <span className={imageCopied ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-800 dark:text-white font-bold"}>
                    {imageCopied ? "Copied Image!" : "Copy Image"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={downloadImage}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#56348f] hover:bg-purple-800 active:bg-purple-900 !text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4 !text-white shrink-0" />
                  <span className="!text-white font-bold">Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canvas / Image Container */}
            <div className="p-6 overflow-auto flex items-center justify-center bg-slate-200/70 dark:bg-slate-950">
              <img
                src={generatedImageUrl}
                alt="Daily Work Report"
                className="max-w-full h-auto rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
