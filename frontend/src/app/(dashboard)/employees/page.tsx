"use client";

import { PageLoader } from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, Ban, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    fetchEmployees(1);
  }, [search]);

  useEffect(() => {
    fetchEmployees(currentPage);
  }, [currentPage]);

  const fetchEmployees = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/employees?search=${search}&page=${page}`);
      setEmployees(response.data.data);
      setTotalPages(response.data.meta?.last_page || 1);
      setCurrentPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Disabled" : "Active";
    try {
      await api.post(`/employees/${id}/status`, { status: newStatus });
      fetchEmployees();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await api.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Employees</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">Manage your organization's workforce.</p>
        </div>
        <Button onClick={() => router.push("/employees/create")} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2">
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Search Card */}
      <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                type="search"
                placeholder="Search by name, email, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm transition-colors"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No employees found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Team</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-slate-700 border border-slate-200 dark:border-white/10">
                            <AvatarImage src={emp.profile_photo_path} alt={emp.first_name} />
                            <AvatarFallback className="bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold">{emp.first_name.charAt(0)}{emp.last_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-white">{emp.first_name} {emp.last_name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">{emp.employee_code}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.designation || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.team?.name || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          emp.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {emp.status === 'Active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-slate-600 dark:text-slate-300">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/employees/${emp.id}`)} className="text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10">
                                <FileEdit className="mr-2 h-4 w-4" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(emp.id, emp.status)} className="text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10">
                                {emp.status === 'Active' ? (
                                  <><Ban className="mr-2 h-4 w-4" /> Disable Account</>
                                ) : (
                                  <><CheckCircle className="mr-2 h-4 w-4" /> Enable Account</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => handleDelete(emp.id)} className="text-rose-400 cursor-pointer hover:text-rose-300 hover:bg-rose-500/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && employees.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-white/10 bg-slate-900/50">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    return page <= totalPages ? (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        disabled={isLoading}
                        className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                          currentPage === page
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {page}
                      </button>
                    ) : null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
