"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Building2, Palmtree, Home, Loader2, Search, Filter
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function HallPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    fetchHallData();
  }, [user]);

  const fetchHallData = async () => {
    try {
      const res = await api.get("/hall");
      setData(res.data);
    } catch (e: any) {
      console.error(e);
      if (e.response?.status === 403) {
        router.push("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "Working") return "bg-green-100 text-green-700 border-green-200";
    if (status.includes("Leave")) return "bg-red-100 text-red-700 border-red-200";
    if (status.includes("WFH")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (status === "Holiday") return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Generate unique teams for filter
  const teams = Array.from(new Set(data.employees.map((e: any) => e.team)));

  // Filter employees
  const filteredEmployees = data.employees.filter((emp: any) => {
    const matchesSearch = 
      emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase());
    
    const matchesTeam = teamFilter === "all" || emp.team === teamFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "Leave" && emp.status.includes("Leave")) ||
      (statusFilter === "WFH" && emp.status.includes("WFH")) ||
      emp.status === statusFilter;

    return matchesSearch && matchesTeam && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">View The Hall</h1>
          <p className="text-slate-600 dark:text-slate-300">Today's organization-wide employee availability.</p>
        {data.is_holiday && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            🎉 Today is a company holiday: {data.holiday_name}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500">Total Employees</span>
            <Users className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-3xl font-bold mt-2">{data.summary.total}</span>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-b-4 border-b-green-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500">Working</span>
            <Building2 className="h-5 w-5 text-green-500" />
          </div>
          <span className="text-3xl font-bold mt-2 text-green-600">{data.summary.working}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-b-4 border-b-red-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500">On Leave</span>
            <Palmtree className="h-5 w-5 text-red-500" />
          </div>
          <span className="text-3xl font-bold mt-2 text-red-600">{data.summary.on_leave}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-b-4 border-b-blue-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500">WFH</span>
            <Home className="h-5 w-5 text-blue-500" />
          </div>
          <span className="text-3xl font-bold mt-2 text-blue-600">{data.summary.wfh}</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-b-4 border-b-orange-400 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500">Half Day</span>
            <div className="flex -space-x-1">
              <span className="h-5 w-5 border-2 border-white rounded-full bg-orange-400" />
            </div>
          </div>
          <span className="text-3xl font-bold mt-2 text-orange-500">{data.summary.half_day}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee or code..."
              className="pl-9 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as string)}>
            <SelectTrigger className="bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => <SelectItem key={t as string} value={t as string}>{t as string}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Working">Working</SelectItem>
              <SelectItem value="Leave">On Leave</SelectItem>
              <SelectItem value="WFH">WFH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4 text-right">Today's Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {emp.employee_code}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {emp.designation || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs">
                        {emp.team}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
