"use client";

import EmployeeForm from "@/components/employees/EmployeeForm";
import { CSVImport } from "@/components/employees/CSVImport";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function CreateEmployeePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Add Employee</h1>
          <p className="text-slate-600 dark:text-slate-300">Create a new employee profile in the system.</p>
        </div>
      </div>

      {/* CSV Import Section */}
      <CSVImport onSuccess={() => router.push("/employees")} />

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400">OR</span>
        </div>
      </div>

      {/* Single Employee Form */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Create Single Employee</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Fill in the form below to add an employee manually</p>
        <EmployeeForm isEdit={false} />
      </div>
    </div>
  );
}
