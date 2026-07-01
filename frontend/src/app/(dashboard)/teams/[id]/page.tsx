"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import TeamForm from "@/components/teams/TeamForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditTeamPage() {
  const params = useParams();
  const [team, setTeam] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  useEffect(() => {
    fetchTeamAndUsers();
  }, [params.id]);

  const fetchTeamAndUsers = async () => {
    try {
      const [teamRes, usersRes] = await Promise.all([
        api.get(`/teams/${params.id}`),
        api.get(`/employees?limit=500`) // In production, we'd use search/pagination for members
      ]);
      setTeam(teamRes.data.data);
      setAllUsers(usersRes.data.data);
      // Pre-select current members
      const currentIds = teamRes.data.data.members?.map((m: any) => m.id) || [];
      setSelectedMemberIds(currentIds);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMemberSelection = (id: number) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(m => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSyncMembers = async () => {
    setMembersLoading(true);
    try {
      await api.post(`/teams/${params.id}/members`, {
        member_ids: selectedMemberIds
      });
      alert("Members synced successfully");
      fetchTeamAndUsers(); // refresh data
    } catch (err: any) {
      alert("Failed to sync members");
    } finally {
      setMembersLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!team) return <div className="p-8 text-center">Team not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Manage {team.name}</h1>
          <p className="text-slate-300">{team.members_count || 0} Members</p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Team Details</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <TeamForm initialData={team} isEdit={true} />
        </TabsContent>
        
        <TabsContent value="members">
          <Card className="max-w-4xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Manage Members</CardTitle>
              <CardDescription>Select employees to assign to this team. Anyone not selected will be removed from the team.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md max-h-96 overflow-y-auto mb-6 bg-white/5">
                {allUsers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No employees found in the system.</div>
                ) : (
                  <div className="divide-y">
                    {allUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedMemberIds.includes(user.id)}
                          onChange={() => toggleMemberSelection(user.id)}
                        />
                        <label htmlFor={`user-${user.id}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile_photo_path} alt={user.first_name} />
                            <AvatarFallback>{user.first_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.first_name} {user.last_name}</span>
                            <span className="text-xs text-muted-foreground">{user.designation || 'No Designation'} • {user.email}</span>
                          </div>
                        </label>
                        <div className="text-xs text-muted-foreground">
                          {user.team_id === team.id ? (
                            <span className="text-primary font-medium">Currently in team</span>
                          ) : user.team_id ? (
                            <span>Currently in another team</span>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSyncMembers} disabled={membersLoading}>
                  {membersLoading ? "Syncing..." : `Save Assignments (${selectedMemberIds.length} Selected)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
