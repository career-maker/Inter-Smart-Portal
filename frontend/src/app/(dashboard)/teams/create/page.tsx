import TeamForm from "@/components/teams/TeamForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateTeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Team</h1>
          <p className="text-muted-foreground">Setup a new organizational unit.</p>
        </div>
      </div>
      
      <TeamForm isEdit={false} />
    </div>
  );
}
