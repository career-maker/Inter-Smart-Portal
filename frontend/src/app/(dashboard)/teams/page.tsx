"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, Users } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTeams();
  }, [search]);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/teams?search=${search}`);
      setTeams(response.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this team? Members will be unassigned.")) {
      try {
        await api.delete(`/teams/${id}`);
        fetchTeams();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Departments</h1>
        </div>
        <Button onClick={() => router.push("/teams/create")}>
          <Plus className="mr-2 h-4 w-4" /> Create Department
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search departments..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading departments...</div>
      ) : teams.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-white border rounded-lg shadow-sm">No departments found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px] mt-2">
                    {team.description || "No description provided."}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 focus-visible:outline-none">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/teams/${team.id}`)}>
                      <FileEdit className="mr-2 h-4 w-4" /> Manage Team
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(team.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border">
                        {team.team_lead ? (
                          <>
                            <AvatarImage src={team.team_lead.profile_photo_path} alt={team.team_lead.first_name} />
                            <AvatarFallback>{team.team_lead.first_name?.charAt(0)}</AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback>?</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">
                          {team.team_lead ? `${team.team_lead.first_name} ${team.team_lead.last_name}` : 'No Lead'}
                        </span>
                        <span className="text-xs text-muted-foreground">Team Lead</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50/50 border-t px-6 py-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  {team.members_count} Members
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
