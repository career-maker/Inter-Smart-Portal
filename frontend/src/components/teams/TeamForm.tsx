"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(1, "Team Name is required"),
  description: z.string().optional(),
  team_lead_id: z.string().optional(),
});

type TeamFormProps = {
  initialData?: any;
  isEdit?: boolean;
};

export default function TeamForm({ initialData, isEdit }: TeamFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      team_lead_id: initialData?.team_lead_id?.toString() || "none",
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // For a real app with many users, this might be an autocomplete. 
      // For this demo, we fetch a large page of users.
      const res = await api.get("/employees?limit=100");
      setUsers(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        team_lead_id: values.team_lead_id === "none" ? null : values.team_lead_id,
      };

      if (isEdit) {
        await api.put(`/teams/${initialData.id}`, payload);
      } else {
        await api.post("/teams", payload);
      }
      router.push("/teams");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Team Details" : "Create New Team"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Team Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="team_lead_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Team Lead</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a team lead" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.first_name} {u.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-4 border-t pt-6">
              <Button type="button" variant="outline" onClick={() => router.push("/teams")}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Team"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
