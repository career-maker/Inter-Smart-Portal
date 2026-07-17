"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { FavoriteButton } from "@/components/layout/FavoriteButton";

export default function LeavesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "Super Admin";

  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [filterType, setFilterType] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filteredTotals, setFilteredTotals] = useState<any>(null);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, filterType, filterFromDate, filterToDate]);

  const clearFilters = () => {
    setFilterType("");
    setFilterFromDate("");
    setFilterToDate("");
    setCurrentPage(1);
  };

  const fetchData = async (page = 1) => {
    setIsLoading(true);
    try {
      let queryParams = `page=${page}`;
      if (filterType) queryParams += `&type=${filterType}`;
      if (filterFromDate) queryParams += `&from_date=${filterFromDate}`;
      if (filterToDate) queryParams += `&to_date=${filterToDate}`;

      const [balRes, reqRes] = await Promise.all([
        api.get("/leave-balances"),
        api.get(`/leave-requests?${queryParams}`)
      ]);

      const filtered = reqRes.data.filtered_totals;
      setFilteredTotals(filtered || null);

      const balanceData = balRes.data.data;
      if (balanceData && !isSuperAdmin) {
        const clBalance  = (balanceData.casual_leave_balance || 0) + (balanceData.cl_carry_forward || 0);
        const slBalance  = balanceData.sick_leave_balance || 0;
        setBalances([
          {
            id: 1,
            leave_type: { name: "Casual Leave" },
            color: "text-emerald-400",
            remaining: clBalance,
            cl_carry_forward: balanceData.cl_carry_forward || 0,
            total_taken: filtered?.casual ?? 0,
          },
          {
            id: 2,
            leave_type: { name: "Sick Leave" },
            color: "text-rose-400",
            remaining: slBalance,
            cl_carry_forward: 0,
            total_taken: filtered?.sick ?? 0,
          },
        ]);
      }

      const paginatedRes = reqRes.data.data;
      const allRequests = paginatedRes?.data || [];
      setRequests(
        allRequests.filter((r: any) => {
          const name = r.leave_type?.name?.toLowerCase() || "";
          return !name.includes("wfh") && !name.includes("work from home");
        })
      );
      if (paginatedRes) {
        setPagination({
          current_page: paginatedRes.current_page,
          last_page: paginatedRes.last_page,
          total: paginatedRes.total,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (req: any) => {
    if (req.status === "Approved")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    if (req.status === "Rejected")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );

    let pendingText = "Pending";
    if (req.tl_status === "Pending") pendingText = "Pending TL";
    else if (req.admin_status === "Pending") pendingText = "Pending Admin";

    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
        <Clock className="w-3 h-3" /> {pendingText}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Leave Management</h1>
          <p className="text-slate-600 dark:text-slate-300">View your balances and leave history.</p>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton label="My Leaves" />
          {!isSuperAdmin && (
            <button
              onClick={() => router.push("/leaves/apply")}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" /> Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* Balance cards — only shown for non-Super Admin */}
      {!isSuperAdmin && balances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {balances.map((balance) => (
            <div
              key={balance.id}
              className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 backdrop-blur-md"
            >
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {balance.leave_type.name}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <span className={`text-5xl font-black ${balance.color}`}>
                    {balance.remaining}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2 text-sm">Remaining</span>
                  {balance.cl_carry_forward > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{balance.cl_carry_forward} carry-fwd included</p>
                  )}
                </div>
                <div className="text-sm text-slate-500 text-right space-y-0.5">
                  <div>
                    {!!(filterType || filterFromDate || filterToDate) ? "Taken (Filtered): " : "Total Taken: "}
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{balance.total_taken} Day(s)</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTotals && !!(filterType || filterFromDate || filterToDate) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-md">
          <div className="text-center p-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Filtered Casual</p>
            <p className="text-xl font-black text-emerald-400">{filteredTotals.casual} Day(s)</p>
          </div>
          <div className="text-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 p-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Filtered Sick</p>
            <p className="text-xl font-black text-rose-400">{filteredTotals.sick} Day(s)</p>
          </div>
          <div className="text-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 p-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Filtered LOP</p>
            <p className="text-xl font-black text-rose-500">{filteredTotals.lop} Day(s)</p>
          </div>
          <div className="text-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 p-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Filtered Total</p>
            <p className="text-xl font-black text-amber-500">{filteredTotals.total} Day(s)</p>
          </div>
        </div>
      )}

      {/* Leave requests table */}
      <div className="bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Leave Requests</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Your history of time-off requests.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Leave Category</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
              >
                <option value="">All Categories</option>
                <option value="casual">Casual Leaves</option>
                <option value="sick">Sick Leaves</option>
                <option value="lop">Loss of Pay (LOP)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => { setFilterFromDate(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => { setFilterToDate(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
            
            {(filterType || filterFromDate || filterToDate) && (
              <button
                onClick={clearFilters}
                className="mt-5 text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">No leave requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                    <th className="px-6 py-3">Employee</th>
                  )}
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Days</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    {(user?.role === "Super Admin" || user?.role === "Team Lead") && (
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {req.user?.first_name} {req.user?.last_name}
                      </td>
                    )}
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {req.leave_type?.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                        {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {req.days_taken ?? req.actual_leave_days ?? "—"} Day(s)
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{req.reason}</td>
                    <td className="px-6 py-4">{getStatusBadge(req)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {pagination.current_page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} request{pagination.total !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page === 1}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/5 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/5 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
