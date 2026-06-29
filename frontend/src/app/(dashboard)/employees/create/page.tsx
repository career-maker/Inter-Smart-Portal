import EmployeeForm from "@/components/employees/EmployeeForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateEmployeePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Employee</h1>
          <p className="text-muted-foreground">Create a new employee profile in the system.</p>
        </div>
      </div>
      
      <EmployeeForm isEdit={false} />
    </div>
  );
}
