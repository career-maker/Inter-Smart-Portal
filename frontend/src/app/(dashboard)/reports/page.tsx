"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, FileText, Search } from "lucide-react";
import api from "@/services/api";

type ReportType = "employees" | "leaves" | "leave-balances";

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState<ReportType>("employees");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  // We could add more filters here (date range, team, etc.)
  
  if (user?.role !== "Super Admin" && user?.role !== "HR") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have permission to view reports.</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setReportData([]);
    try {
      const res = await api.get(`/reports/${reportType}`);
      setReportData(res.data.data);
    } catch (error) {
      console.error("Failed to generate report", error);
      // Optional: add toast error handling
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (reportData.length === 0) return;
    
    // Extract headers from first row
    const headers = Object.keys(reportData[0]);
    
    // Build CSV string
    const csvRows = [
      headers.join(","), // header row
      ...reportData.map(row => {
        return headers.map(header => {
          let cellValue = row[header] === null || row[header] === undefined ? "" : String(row[header]);
          // Escape quotes and wrap in quotes if contains comma
          if (cellValue.includes(",") || cellValue.includes("\"") || cellValue.includes("\n")) {
            cellValue = `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        }).join(",");
      })
    ];
    
    const csvContent = csvRows.join("\n");
    
    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Generate and export system reports.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Select the type of report you want to generate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 max-w-sm">
              <label className="text-sm font-medium">Report Type</label>
              <Select 
                value={reportType} 
                onValueChange={(val) => setReportType(val as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employees">Employee Report</SelectItem>
                  <SelectItem value="leaves">Leave Report</SelectItem>
                  <SelectItem value="leave-balances">Leave Balances Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Report Results
              </CardTitle>
              <CardDescription className="mt-1">
                Showing {reportData.length} records.
              </CardDescription>
            </div>
            <Button onClick={downloadCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  {Object.keys(reportData[0]).map((header) => (
                    <th key={header} className="px-6 py-3 font-medium whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.keys(reportData[0]).map((header) => (
                      <td key={header} className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {row[header] !== null ? String(row[header]) : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!loading && reportData.length === 0 && (
        <div className="text-center p-12 text-gray-500 bg-white rounded-xl border border-dashed">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p>No report data to display. Click "Generate Report" to fetch data.</p>
        </div>
      )}
    </div>
  );
}
