"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Loader2 } from "lucide-react";
import api from "@/services/api";

interface LeaveData {
  id: number;
  user: { id: number; first_name: string; last_name: string };
  start_date: string;
  end_date: string;
  reason: string;
  days_taken?: number;
  leaveType?: { name: string };
  created_at: string;
}

interface WfhData {
  id: number;
  user: { id: number; first_name: string; last_name: string };
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}

export default function ManageLeavesPage() {
  const [tab, setTab] = useState<"leaves" | "wfh">("leaves");
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [wfh, setWfh] = useState<WfhData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    employee_id: "",
    start_date: "",
    end_date: "",
  });

  const [deleting, setDeleting] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [tab, filters]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append("employee_id", filters.employee_id);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const endpoint =
        tab === "leaves" ? "/admin/approved-leaves" : "/admin/approved-wfh";
      const res = await api.get(`${endpoint}?${params.toString()}`);

      if (tab === "leaves") {
        setLeaves(res.data?.data || []);
      } else {
        setWfh(res.data?.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, type: "leave" | "wfh") => {
    if (!confirm(`Are you sure you want to delete this ${type}? This will restore the leave balance.`)) {
      return;
    }

    setDeleting(id);

    try {
      const endpoint = type === "leave" ? `/admin/approved-leaves/${id}` : `/admin/approved-wfh/${id}`;
      await api.delete(endpoint);

      // Show success message
      setSuccessMessage(`${type === "leave" ? "Leave" : "WFH"} deleted successfully and balance restored!`);

      // Refresh data
      fetchData();

      // Clear success message after 4 seconds
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to delete ${type}`);
    } finally {
      setDeleting(null);
    }
  };

  const data = tab === "leaves" ? leaves : wfh;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Manage Approved Leaves & WFH</h1>
        <p className="text-gray-400 mt-1">View and delete approved leaves/WFH requests. Deleting will restore leave balance.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setTab("leaves")}
          className={`px-4 py-2 font-medium transition ${
            tab === "leaves"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Approved Leaves
        </button>
        <button
          onClick={() => setTab("wfh")}
          className={`px-4 py-2 font-medium transition ${
            tab === "wfh"
              ? "text-amber-400 border-b-2 border-amber-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Approved WFH
        </button>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-300">Employee</label>
            <select
              value={filters.employee_id}
              onChange={(e) =>
                setFilters({ ...filters, employee_id: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                setFilters({ ...filters, start_date: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                setFilters({ ...filters, end_date: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm"
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded text-green-400 animate-in fade-in">
          ✓ {successMessage}
        </div>
      )}

      {/* Data Table */}
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No approved {tab} found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="hover:bg-white/5 transition">
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Start Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">End Date</th>
                  {tab === "leaves" && (
                    <th className="px-4 py-3 text-left font-semibold text-gray-300">Type</th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-4 py-3 text-white">
                      {item.user.first_name} {item.user.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.start_date}</td>
                    <td className="px-4 py-3 text-gray-300">{item.end_date}</td>
                    {tab === "leaves" && (
                      <td className="px-4 py-3 text-gray-300">
                        {(item as LeaveData).leaveType?.name || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                      {item.reason}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() =>
                          handleDelete(item.id, tab === "leaves" ? "leave" : "wfh")
                        }
                        disabled={deleting === item.id}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.length > 0 && (
        <p className="text-sm text-gray-400">Total: {data.length} approved {tab}</p>
      )}
    </div>
  );
}
