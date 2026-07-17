"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/services/api";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { differenceInYears, parseISO } from "date-fns";

const formSchema = z.object({
  // Personal Info
  first_name: z.string().min(1, "First Name is required"),
  last_name: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  blood_group: z.string().optional(),
  marital_status: z.string().optional(),

  // Address Info
  permanent_address: z.string().optional(),
  current_address: z.string().optional(),

  // Employment Info
  employee_code: z.string().min(1, "Employee Code is required"),
  designation: z.string().optional(),
  team_id: z.string().optional(),
  joining_date: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  password: z.string().optional(),

  // Contact Info
  email: z.string().email("Invalid email"),
  personal_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_number: z.string().optional(),
  alternate_contact_number: z.string().optional(),
});

type EmployeeFormProps = {
  initialData?: any;
  isEdit?: boolean;
};

export default function EmployeeForm({ initialData, isEdit }: EmployeeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const roles = ["Super Admin", "Team Lead", "Employee"];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      dob: initialData?.dob || "",
      gender: initialData?.gender || "",
      blood_group: initialData?.blood_group || "",
      marital_status: initialData?.marital_status || "",
      
      permanent_address: initialData?.permanent_address || "",
      current_address: initialData?.current_address || "",
      
      employee_code: initialData?.employee_code || "",
      designation: initialData?.designation || "",
      team_id: initialData?.team_id?.toString() || "none",
      joining_date: initialData?.joining_date || "",
      role: initialData?.role || "Employee",
      password: "",
      
      email: initialData?.email || "",
      personal_email: initialData?.personal_email || "",
      contact_number: initialData?.contact_number || "",
      alternate_contact_number: initialData?.alternate_contact_number || "",
    },
  });

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await api.get("/teams");
        setTeams(res.data.data || res.data || []);
      } catch (error) {
        console.error("Failed to fetch teams", error);
      }
    }
    fetchTeams();
  }, []);

  const dob = useWatch({ control: form.control, name: "dob" });
  const joiningDate = useWatch({ control: form.control, name: "joining_date" });

  const calculatedAge = useMemo(() => {
    if (!dob) return "";
    try {
      const age = differenceInYears(new Date(), parseISO(dob));
      return Number.isNaN(age) ? "" : `${age} years`;
    } catch {
      return "";
    }
  }, [dob]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        team_id: values.team_id === "none" ? null : values.team_id,
      };

      if (isEdit) {
        if (!payload.password) delete payload.password;
        await api.put(`/employees/${initialData.id}`, payload);
      } else {
        await api.post("/employees", payload);
      }
      router.push("/employees");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto pb-10">
        
        {/* PERSONAL INFORMATION */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic personal details of the employee.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="first_name" render={({ field }) => (
              <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="last_name" render={({ field }) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="dob" render={({ field }) => (
              <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormItem>
              <FormLabel>Age (Automatically Calculated)</FormLabel>
              <FormControl>
                <Input value={calculatedAge} disabled className="bg-gray-50 text-gray-700 font-medium" placeholder="Select DOB first" />
              </FormControl>
            </FormItem>

            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="blood_group" render={({ field }) => (
              <FormItem><FormLabel>Blood Group</FormLabel><FormControl><Input placeholder="e.g. O+, A-" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="marital_status" render={({ field }) => (
              <FormItem>
                <FormLabel>Marital Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* ADDRESS INFORMATION */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="permanent_address" render={({ field }) => (
              <FormItem><FormLabel>Permanent Address</FormLabel><FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="current_address" render={({ field }) => (
              <FormItem><FormLabel>Current Address</FormLabel><FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        {/* EMPLOYMENT INFORMATION */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="employee_code" render={({ field }) => (
              <FormItem><FormLabel>Employee Code *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="designation" render={({ field }) => (
              <FormItem><FormLabel>Designation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="team_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Team</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a team" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teams.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="joining_date" render={({ field }) => (
                  <FormItem><FormLabel>Joining Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {!isEdit && (
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Initial Password *</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        {/* CONTACT INFORMATION */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Official Email ID *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="personal_email" render={({ field }) => (
              <FormItem><FormLabel>Personal Email ID</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact_number" render={({ field }) => (
              <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="alternate_contact_number" render={({ field }) => (
              <FormItem><FormLabel>Alternative Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" size="lg" onClick={() => router.push("/employees")}>Cancel</Button>
          <Button type="submit" size="lg" className="bg-amber-500 hover:bg-amber-600 text-foreground font-bold" disabled={isLoading}>{isLoading ? "Saving..." : "Save Employee Profile"}</Button>
        </div>
      </form>
    </Form>
  );
}
