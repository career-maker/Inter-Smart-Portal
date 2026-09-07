"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import {
  X,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";
import api from "@/services/api";
import html2canvas from "html2canvas";

interface MemberReportRow {
  user_id: number;
  name: string;
  full_name: string;
  employee_code?: string;
  floor_time: string;
  floor_status: "normal" | "wfh" | "leave" | "absent" | "present";
  hs_time: string;
  hs_seconds: number;
  hs_percent: string;
  hs_raw_percent: number;
  is_low_activity: boolean;
}

interface DepartmentReport {
  name: string;
  code: string;
  members_count: number;
  members: MemberReportRow[];
  averages: {
    floor_time: string;
    hs_time: string;
    hs_percent: string;
  };
}

interface DailyReportResponse {
  date: string;
  date_formatted_short: string;
  date_formatted_full: string;
  day_name: string;
  departments: DepartmentReport[];
  max_rows: number;
  legend: Record<string, string>;
  legend_text: string;
  generated_at: string;
}

interface DailyHubstaffReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export function DailyHubstaffReportModal({
  isOpen,
  onClose,
  initialDate,
}: DailyHubstaffReportModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || format(new Date(), "yyyy-MM-dd")
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DailyReportResponse | null>(null);
  const [exportingImage, setExportingImage] = useState<boolean>(false);
  const [exportingSheet, setExportingSheet] = useState<boolean>(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchDailyReport = useCallback(
    async (dateToFetch: string, isRefresh: boolean = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const res = await api.get<DailyReportResponse>("/hubstaff/daily-report", {
          params: {
            date: dateToFetch,
            refresh: isRefresh ? 1 : 0,
          },
        });

        setReportData(res.data);
      } catch (err: any) {
        console.error("Failed to fetch daily hubstaff report:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load daily Hubstaff report."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate || selectedDate;
      setSelectedDate(dateToUse);
      fetchDailyReport(dateToUse);
    }
  }, [isOpen, initialDate, fetchDailyReport]);

  if (!isOpen) return null;

  const handlePrevDay = () => {
    try {
      const prev = format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
      setSelectedDate(prev);
      fetchDailyReport(prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextDay = () => {
    try {
      const next = format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
      setSelectedDate(next);
      fetchDailyReport(next);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setSelectedDate(val);
      fetchDailyReport(val);
    }
  };

  // ── Download Image (.png) using html2canvas ─────────────────────────────
  const downloadImageReport = async () => {
    if (!tableContainerRef.current) return;
    try {
      setExportingImage(true);
      const canvas = await html2canvas(tableContainerRef.current, {
        scale: 2, // High resolution for crystal clear text
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: tableContainerRef.current.scrollWidth + 80,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Hubstaff_Daily_Report_${selectedDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate image report:", err);
      alert("Failed to export table image. Please try again.");
    } finally {
      setExportingImage(false);
    }
  };

  // ── Download Formatted Spreadsheet (.xls) ──────────────────────────────
  const downloadSheetReport = () => {
    if (!reportData) return;
    try {
      setExportingSheet(true);
      const { departments, max_rows, date_formatted_short, legend_text } = reportData;

      // Calculate total column span for header & footer
      const totalColumns = 1 + departments.length * 4;

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Hubstaff Daily Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }
  th, td { border: 1px solid #1c3b1a; text-align: center; vertical-align: middle; padding: 6px 10px; font-size: 11pt; }
  .title-row { background-color: #214d1f; color: #ffffff; font-weight: bold; font-size: 14pt; }
  .header-main { background-color: #a3d79f; color: #000000; font-weight: bold; }
  .header-sub { background-color: #c9e8c6; color: #000000; font-weight: bold; }
  .cell-sl { background-color: #ffffff; font-weight: bold; }
  .cell-name { text-align: left; font-weight: bold; }
  .cell-floor { font-weight: 500; }
  .cell-hs-time { }
  .cell-hs-pct { }
  .cell-low-activity { background-color: #ffff00; font-weight: bold; color: #000000; }
  .row-avg { background-color: #c9e8c6; font-weight: bold; }
  .footer-legend { background-color: #214d1f; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 12px; }
</style>
</head>
<body>
<table>
  <!-- Title Row -->
  <tr class="title-row">
    <th colspan="${totalColumns}">DATE: ${date_formatted_short}</th>
  </tr>

  <!-- Header Row 1: Sl + Department Names -->
  <tr class="header-main">
    <th rowspan="1">#</th>`;

      departments.forEach((dept) => {
        html += `
    <th colspan="4">${dept.name}</th>`;
      });

      html += `
  </tr>

  <!-- Header Row 2: Sub-columns -->
  <tr class="header-sub">
    <th></th>`;

      departments.forEach((dept) => {
        html += `
    <th>${dept.name}</th>
    <th>Floor Time</th>
    <th>HS TIME</th>
    <th>HS - %</th>`;
      });

      html += `
  </tr>`;

      // Data Rows
      for (let r = 0; r < max_rows; r++) {
        html += `
  <tr>
    <td class="cell-sl">${r + 1}</td>`;

        departments.forEach((dept) => {
          const m = dept.members[r];
          if (m) {
            const lowStyle = m.is_low_activity ? ' class="cell-low-activity"' : "";
            html += `
    <td class="cell-name">${m.name}</td>
    <td class="cell-floor">${m.floor_time}</td>
    <td class="cell-hs-time">${m.hs_time}</td>
    <td class="cell-hs-pct"${lowStyle}>${m.hs_percent}</td>`;
          } else {
            html += `
    <td></td>
    <td></td>
    <td></td>
    <td></td>`;
          }
        });

        html += `
  </tr>`;
      }

      // Average Row
      html += `
  <tr class="row-avg">
    <td class="cell-sl">Average</td>`;

      departments.forEach((dept) => {
        html += `
    <td></td>
    <td>${dept.averages.floor_time}</td>
    <td>${dept.averages.hs_time}</td>
    <td>${dept.averages.hs_percent}</td>`;
      });

      html += `
  </tr>

  <!-- Empty spacing row -->
  <tr>
    <td colspan="${totalColumns}"></td>
  </tr>

  <!-- Legend Footer -->
  <tr class="footer-legend">
    <td colspan="${totalColumns}">${legend_text}</td>
  </tr>
</table>
</body>
</html>`;

      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hubstaff_Daily_Report_${selectedDate}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate sheet:", e);
      alert("Failed to export spreadsheet.");
    } finally {
      setExportingSheet(false);
    }
  };

  // ── Download Standard CSV (.csv) ─────────────────────────────────────────
  const downloadCSVReport = () => {
    if (!reportData) return;
    const { departments, max_rows, date_formatted_short, legend_text } = reportData;

    const rows: string[][] = [];
    rows.push([`DATE: ${date_formatted_short}`]);

    // Header 1
    const header1: string[] = ["#"];
    departments.forEach((d) => {
      header1.push(d.name, "", "", "");
    });
    rows.push(header1);

    // Header 2
    const header2: string[] = ["#"];
    departments.forEach((d) => {
      header2.push(d.name, "Floor Time", "HS TIME", "HS - %");
    });
    rows.push(header2);

    // Members Rows
    for (let r = 0; r < max_rows; r++) {
      const row: string[] = [String(r + 1)];
      departments.forEach((d) => {
        const m = d.members[r];
        if (m) {
          row.push(m.name, m.floor_time, m.hs_time, m.hs_percent);
        } else {
          row.push("", "", "", "");
        }
      });
      rows.push(row);
    }

    // Average Row
    const avgRow: string[] = ["Average"];
    departments.forEach((d) => {
      avgRow.push(
        "",
        d.averages.floor_time,
        d.averages.hs_time,
        d.averages.hs_percent
      );
    });
    rows.push(avgRow);

    // Spacing and Legend
    rows.push([]);
    rows.push([legend_text]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows
        .map((e) =>
          e
            .map((field) => {
              const str = String(field ?? "").replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(",")
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hubstaff_Daily_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-[98vw] xl:max-w-[96vw] max-h-[96vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* ── Modal Header & Date Navigation ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Daily Hubstaff Report
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Image & Sheet Models
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Day-wise departmental comparison: eSSL Biometric Floor Time, Hubstaff Time, and HS Activity %
              </p>
            </div>
          </div>

          {/* Date Picker Ribbon */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              onClick={handlePrevDay}
              disabled={loading || refreshing}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              onClick={() => dateInputRef.current?.showPicker()}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:border-emerald-500 transition-colors"
            >
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                {reportData?.date_formatted_full || selectedDate}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                ({reportData?.day_name || ""})
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="sr-only"
              />
            </div>

            <button
              onClick={handleNextDay}
              disabled={loading || refreshing}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => fetchDailyReport(selectedDate, true)}
              disabled={loading || refreshing}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Refresh Hubstaff Data for this Day"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2">
            {/* Download Image Button */}
            <button
              onClick={downloadImageReport}
              disabled={loading || !reportData || exportingImage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Download as high-resolution PNG image"
            >
              {exportingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              <span>Download Image (.png)</span>
            </button>

            {/* Download Sheet Button */}
            <button
              onClick={downloadSheetReport}
              disabled={loading || !reportData || exportingSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Download formatted Excel spreadsheet (.xls)"
            >
              {exportingSheet ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              )}
              <span>Download Sheet (.xls)</span>
            </button>

            {/* Download CSV Button */}
            <button
              onClick={downloadCSVReport}
              disabled={loading || !reportData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Download raw CSV data"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Content: Table Preview Container ── */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/70 flex flex-col items-center">
          {loading ? (
            <div className="my-auto flex flex-col items-center justify-center p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Generating Daily Hubstaff Report for {selectedDate}...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Fetching biometric floor punches, WFH records, approved leaves, and Hubstaff activity
              </p>
            </div>
          ) : error ? (
            <div className="my-auto max-w-md p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Unable to Load Daily Report
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
              <button
                onClick={() => fetchDailyReport(selectedDate)}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : reportData && reportData.departments.length > 0 ? (
            <div className="w-full flex flex-col items-center">
              {/* Report Preview Wrapper - This element is captured for image export */}
              <div
                ref={tableContainerRef}
                className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-md border border-slate-300 max-w-full overflow-x-auto inline-block"
                style={{
                  fontFamily: '"Segoe UI", Calibri, Arial, sans-serif',
                }}
              >
                <table className="border-collapse text-xs border border-[#1b3d18] select-text">
                  {/* ── DATE BANNER ── */}
                  <thead>
                    <tr className="bg-[#1b3d18] text-white">
                      <th
                        colSpan={1 + reportData.departments.length * 4}
                        className="py-2.5 px-4 text-center text-sm font-bold tracking-wide border border-[#1b3d18]"
                      >
                        <div className="flex items-center justify-center gap-4">
                          <span className="uppercase tracking-widest text-emerald-300">
                            DATE
                          </span>
                          <span className="text-white text-base">
                            {reportData.date_formatted_short}
                          </span>
                        </div>
                      </th>
                    </tr>

                    {/* ── DEPARTMENT HEADERS ROW 1 ── */}
                    <tr className="bg-[#a8d5a2] text-slate-900 font-bold border border-[#1b3d18]">
                      <th
                        rowSpan={2}
                        className="border border-[#1b3d18] px-2.5 py-2 text-center text-xs font-extrabold w-10 bg-[#94ca8d]"
                      >
                        #
                      </th>
                      {reportData.departments.map((dept) => (
                        <th
                          key={dept.name}
                          colSpan={4}
                          className="border border-[#1b3d18] px-2 py-1.5 text-center text-xs font-extrabold uppercase tracking-wide"
                        >
                          {dept.name}
                        </th>
                      ))}
                    </tr>

                    {/* ── SUB-COLUMN HEADERS ROW 2 ── */}
                    <tr className="bg-[#cae8c5] text-slate-900 font-bold border border-[#1b3d18] text-[11px]">
                      {reportData.departments.map((dept) => (
                        <React.Fragment key={`${dept.name}-subheaders`}>
                          <th className="border border-[#1b3d18] px-2.5 py-1.5 text-left font-bold min-w-[110px]">
                            {dept.name}
                          </th>
                          <th className="border border-[#1b3d18] px-2 py-1.5 text-center font-bold min-w-[70px]">
                            Floor Time
                          </th>
                          <th className="border border-[#1b3d18] px-2 py-1.5 text-center font-bold min-w-[70px]">
                            HS TIME
                          </th>
                          <th className="border border-[#1b3d18] px-2 py-1.5 text-center font-bold min-w-[65px]">
                            HS - %
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>

                  {/* ── BODY DATA ROWS ── */}
                  <tbody className="divide-y divide-[#1b3d18] text-slate-900">
                    {Array.from({ length: reportData.max_rows }).map((_, rIdx) => (
                      <tr
                        key={`row-${rIdx}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* Serial Number Column */}
                        <td className="border border-[#1b3d18] px-2 py-1.5 text-center font-bold bg-[#fbfdfa] text-slate-800">
                          {rIdx + 1}
                        </td>

                        {/* Each Department Columns */}
                        {reportData.departments.map((dept) => {
                          const m = dept.members[rIdx];
                          if (!m) {
                            return (
                              <React.Fragment key={`${dept.name}-empty-${rIdx}`}>
                                <td className="border border-[#1b3d18] px-2 py-1.5 bg-white"></td>
                                <td className="border border-[#1b3d18] px-2 py-1.5 bg-white"></td>
                                <td className="border border-[#1b3d18] px-2 py-1.5 bg-white"></td>
                                <td className="border border-[#1b3d18] px-2 py-1.5 bg-white"></td>
                              </React.Fragment>
                            );
                          }

                          const isLow = m.is_low_activity;

                          return (
                            <React.Fragment key={`${dept.name}-${m.user_id}-${rIdx}`}>
                              {/* Member Name */}
                              <td className="border border-[#1b3d18] px-2.5 py-1.5 text-left font-bold text-slate-900 whitespace-nowrap bg-white">
                                {m.name}
                              </td>

                              {/* Floor Time */}
                              <td
                                className={`border border-[#1b3d18] px-2 py-1.5 text-center whitespace-nowrap font-semibold ${
                                  m.floor_time === "W"
                                    ? "text-blue-700 font-extrabold bg-blue-50/50"
                                    : m.floor_time === "A"
                                    ? "text-rose-700 font-extrabold bg-rose-50/50"
                                    : m.floor_status === "leave"
                                    ? "text-amber-700 font-extrabold bg-amber-50/50"
                                    : "text-slate-800 bg-white"
                                }`}
                              >
                                {m.floor_time}
                              </td>

                              {/* HS TIME */}
                              <td className="border border-[#1b3d18] px-2 py-1.5 text-center whitespace-nowrap font-medium text-slate-800 bg-white">
                                {m.hs_time}
                              </td>

                              {/* HS - % with Yellow Highlighting on Low Activity */}
                              <td
                                className={`border border-[#1b3d18] px-2 py-1.5 text-center whitespace-nowrap font-bold ${
                                  isLow
                                    ? "bg-[#ffff00] text-black ring-1 ring-inset ring-amber-400/50"
                                    : "bg-white text-slate-800"
                                }`}
                                style={isLow ? { backgroundColor: "#ffff00" } : undefined}
                              >
                                {m.hs_percent}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}

                    {/* ── AVERAGE SUMMARY ROW ── */}
                    <tr className="bg-[#cae8c5] font-bold text-slate-900 border-t-2 border-[#1b3d18]">
                      <td className="border border-[#1b3d18] px-2 py-2 text-center font-extrabold bg-[#a8d5a2]">
                        Average
                      </td>
                      {reportData.departments.map((dept) => (
                        <React.Fragment key={`${dept.name}-average-row`}>
                          <td className="border border-[#1b3d18] px-2 py-2 text-left font-bold">
                            Average
                          </td>
                          <td className="border border-[#1b3d18] px-2 py-2 text-center font-bold">
                            {dept.averages.floor_time}
                          </td>
                          <td className="border border-[#1b3d18] px-2 py-2 text-center font-bold">
                            {dept.averages.hs_time}
                          </td>
                          <td className="border border-[#1b3d18] px-2 py-2 text-center font-bold">
                            {dept.averages.hs_percent}
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>

                    {/* ── FOOTER ABBREVIATIONS BANNER ── */}
                    <tr className="bg-[#1b3d18] text-white">
                      <td
                        colSpan={1 + reportData.departments.length * 4}
                        className="border border-[#1b3d18] py-2.5 px-4 text-left text-xs font-bold tracking-wide"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-300">
                            {reportData.legend_text}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="my-auto p-8 text-center text-slate-500 dark:text-slate-400">
              No employees or departments found for this date.
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#ffff00] border border-amber-400 shrink-0" />
              <span>Low Hubstaff Activity (&lt; 60%)</span>
            </span>
            <span>•</span>
            <span>Biometric Floor Times from eSSL punches</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
