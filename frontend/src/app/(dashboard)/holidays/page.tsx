"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Plus, Trash2, Edit, Loader2
} from "lucide-react";
import api from "@/services/api";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function HolidaysPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("Public");
  const [description, setDescription] = useState("");

  useEffect(() => {
    // Only Super Admin and HR can access this management page
    if (user && user.role !== "Super Admin" && user.role !== "HR") {
      router.push("/calendar");
      return;
    }
    fetchHolidays();
  }, [user, router]);

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/holidays");
      setHolidays(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setEditId(null);
    setName(""); setDate(""); setType("Public"); setDescription("");
    setShowDialog(true);
  };

  const openEdit = (h: any) => {
    setEditId(h.id);
    setName(h.name); setDate(h.date); setType(h.type); setDescription(h.description || "");
    setShowDialog(true);
  };

  const saveHoliday = async () => {
    if (!name || !date || !type) return;
    setActionLoading(true);
    try {
      const payload = { name, date, type, description };
      if (editId) {
        await api.put(`/holidays/${editId}`, payload);
      } else {
        await api.post("/holidays", payload);
      }
      setShowDialog(false);
      fetchHolidays();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error saving holiday.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchHolidays();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error deleting holiday.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Holiday Management</h1>
          <p className="text-muted-foreground">Configure the company's annual holiday calendar.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add Holiday
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Holiday Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No holidays configured yet.
                  </td>
                </tr>
              ) : (
                holidays.map((h: any) => (
                  <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {h.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        h.type === 'Public' ? 'bg-blue-100 text-blue-700' :
                        h.type === 'Company' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                      {h.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(h)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteHoliday(h.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <DialogDescription>
              {editId ? "Update details for this holiday." : "Create a new company holiday."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Holiday Name</Label>
              <Input
                className="mt-1"
                placeholder="e.g. New Year's Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                className="mt-1 block"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Holiday Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as string)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public Holiday</SelectItem>
                  <SelectItem value="Company">Company Holiday</SelectItem>
                  <SelectItem value="Restricted">Restricted Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                className="mt-1"
                placeholder="Additional notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveHoliday} disabled={actionLoading || !name || !date || !type}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
