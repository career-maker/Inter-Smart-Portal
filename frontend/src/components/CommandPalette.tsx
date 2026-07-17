"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Search, User, FileText, Home, Bell, Users, Settings, LogOut, Briefcase } from "lucide-react";
import api from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();
  const { user } = useAuthStore();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch employees when searching
  const { data: employeesData } = useQuery({
    queryKey: ["employees-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      try {
        const res = await api.get(`/employees?search=${search}&per_page=10`);
        return res.data?.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: search.length >= 2,
  });

  const employees = employeesData || [];

  // Fetch leave requests for Team Lead or HR
  const { data: leavesData } = useQuery({
    queryKey: ["leaves-search"],
    queryFn: async () => {
      try {
        const isApprover = user?.role === "Team Lead" || user?.role === "HR" || user?.role === "Super Admin";
        const endpoint = isApprover ? "/leave-requests?status=Pending" : "/leave-requests/my-requests";
        const res = await api.get(endpoint);
        return res.data?.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: open && !!user, // Only fetch when palette is open
  });

  const leaves = leavesData || [];
  
  // Filter leaves locally since there's no backend search endpoint
  const filteredLeaves = React.useMemo(() => {
    if (!search) return leaves.slice(0, 5); // Show first 5 if no search
    const lowerSearch = search.toLowerCase();
    return leaves.filter((leave: any) => 
      leave.user?.name?.toLowerCase().includes(lowerSearch) || 
      leave.leave_type?.toLowerCase().includes(lowerSearch) ||
      leave.status?.toLowerCase().includes(lowerSearch)
    ).slice(0, 5);
  }, [leaves, search]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {search === "" && (
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <Home className="mr-2 h-4 w-4 text-slate-500" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/teams"))}>
              <Users className="mr-2 h-4 w-4 text-slate-500" />
              <span>Teams</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/leaves"))}>
              <FileText className="mr-2 h-4 w-4 text-slate-500" />
              <span>My Leaves</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/wfh"))}>
              <Briefcase className="mr-2 h-4 w-4 text-slate-500" />
              <span>WFH Requests</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/announcements"))}>
              <Bell className="mr-2 h-4 w-4 text-slate-500" />
              <span>Announcements</span>
            </CommandItem>
          </CommandGroup>
        )}

        {employees.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Employees">
              {employees.map((emp: any) => (
                <CommandItem 
                  key={emp.id} 
                  value={`employee-${emp.first_name} ${emp.last_name}`}
                  onSelect={() => runCommand(() => router.push(`/employees/${emp.id}`))}
                >
                  <User className="mr-2 h-4 w-4 text-amber-500" />
                  <span>{emp.first_name} {emp.last_name}</span>
                  <span className="ml-2 text-xs text-slate-400">{emp.employee_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredLeaves.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leave Requests">
              {filteredLeaves.map((leave: any) => (
                <CommandItem 
                  key={leave.id} 
                  value={`leave-${leave.user?.name}-${leave.leave_type}`}
                  onSelect={() => {
                    const isApprover = user?.role === "Team Lead" || user?.role === "HR" || user?.role === "Super Admin";
                    runCommand(() => router.push(isApprover ? "/leaves/approvals" : "/leaves"));
                  }}
                >
                  <FileText className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{leave.user?.name || "Me"} - {leave.leave_type}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{leave.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {search === "" && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <span>Profile</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                <Settings className="mr-2 h-4 w-4 text-slate-500" />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
