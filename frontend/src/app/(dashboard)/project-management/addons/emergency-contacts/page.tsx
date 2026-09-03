"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Mail,
  Phone,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  User,
  Building2,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import emergencyContactsApi, {
  EmergencyContact,
  EmergencyContactsStats,
  CreateEmergencyContactPayload,
} from "@/services/emergencyContacts";

const AVATAR_COLOR_PALETTE = [
  { label: "Rose Red", class: "bg-rose-500" },
  { label: "Indigo", class: "bg-indigo-500" },
  { label: "Sky Blue", class: "bg-sky-500" },
  { label: "Amber", class: "bg-amber-500" },
  { label: "Teal", class: "bg-teal-500" },
  { label: "Emerald", class: "bg-emerald-500" },
  { label: "InterSmart Purple", class: "bg-[#56348f]" },
  { label: "Slate Gray", class: "bg-slate-700" },
];

export default function EmergencyContactsManagementPage() {
  const { user } = useAuthStore();
  const userRoleStr = (user?.role || "").toLowerCase();
  const isSuperAdmin = userRoleStr === "super admin";

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [stats, setStats] = useState<EmergencyContactsStats>({
    total: 0,
    active: 0,
    inactive: 0,
    departments: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<CreateEmergencyContactPayload>({
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    avatar_bg: "bg-indigo-500",
    initials: "",
    order: 0,
    is_active: true,
  });

  // Delete Modal
  const [deletingContact, setDeletingContact] = useState<EmergencyContact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Contacts
  const fetchContacts = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await emergencyContactsApi.getAdminContacts();
      setContacts(res.contacts || []);
      setStats(
        res.stats || {
          total: res.contacts?.length || 0,
          active: res.contacts?.filter((c) => c.is_active).length || 0,
          inactive: res.contacts?.filter((c) => !c.is_active).length || 0,
          departments: [],
        }
      );
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to load emergency contacts."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      department: "HR",
      avatar_bg: "bg-[#56348f]",
      initials: "",
      order: contacts.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      role: contact.role,
      email: contact.email || "",
      phone: contact.phone || "",
      department: contact.department || "",
      avatar_bg: contact.avatar_bg || "bg-indigo-500",
      initials: contact.initials || "",
      order: contact.order,
      is_active: contact.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  // Auto-generate initials on name change
  const handleNameChange = (newName: string) => {
    const trimmed = newName.trim();
    let computedInitials = formData.initials;
    if (!editingContact || !formData.initials) {
      const parts = trimmed.split(/[\s,]+/);
      if (parts.length >= 2) {
        computedInitials = `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      } else if (trimmed.length > 0) {
        computedInitials = trimmed.substring(0, 2).toUpperCase();
      }
    }
    setFormData((prev) => ({
      ...prev,
      name: newName,
      initials: computedInitials,
    }));
  };

  // Save Contact (Create or Edit)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim()) {
      setErrorMessage("Please enter both Contact Name and Role/Designation.");
      return;
    }

    setSavingContact(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (editingContact) {
        const res = await emergencyContactsApi.updateContact(editingContact.id, formData);
        setSuccessMessage(res.message);
      } else {
        const res = await emergencyContactsApi.createContact(formData);
        setSuccessMessage(res.message);
      }
      setIsModalOpen(false);
      fetchContacts(true);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to save emergency contact."
      );
    } finally {
      setSavingContact(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleActive = async (contact: EmergencyContact) => {
    try {
      const res = await emergencyContactsApi.toggleContact(contact.id);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, is_active: res.is_active } : c))
      );
      setStats((prev) => ({
        ...prev,
        active: res.is_active ? prev.active + 1 : prev.active - 1,
        inactive: res.is_active ? prev.inactive - 1 : prev.inactive + 1,
      }));
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to toggle contact status."
      );
    }
  };

  // Confirm and Delete
  const handleConfirmDelete = async () => {
    if (!deletingContact) return;
    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await emergencyContactsApi.deleteContact(deletingContact.id);
      setSuccessMessage(res.message);
      setDeletingContact(null);
      fetchContacts(true);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to delete emergency contact."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Move Contact Up or Down (Reorder)
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredContacts.length) return;

    const newContacts = [...filteredContacts];
    const temp = newContacts[index];
    newContacts[index] = newContacts[targetIndex];
    newContacts[targetIndex] = temp;

    // Reassign orders
    const itemsToUpdate = newContacts.map((c, idx) => ({
      id: c.id,
      order: idx + 1,
    }));

    // Optimistic UI update
    setContacts((prev) => {
      const map = new Map(itemsToUpdate.map((i) => [i.id, i.order]));
      return [...prev].map((c) => ({
        ...c,
        order: map.get(c.id) ?? c.order,
      })).sort((a, b) => a.order - b.order);
    });

    try {
      await emergencyContactsApi.reorderContacts(itemsToUpdate);
    } catch (err: any) {
      setErrorMessage("Failed to save reordered contacts.");
      fetchContacts(true);
    }
  };

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.department && c.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept = selectedDept === "all" || c.department === selectedDept;

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && c.is_active) ||
        (selectedStatus === "inactive" && !c.is_active);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [contacts, searchTerm, selectedDept, selectedStatus]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-bold">Super Admin Access Only</h2>
          <p className="text-xs">
            Only Super Administrators can configure and manage emergency contacts for employee
            dashboards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
    >
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link
              href="/project-management"
              className="hover:text-purple-600 dark:hover:text-purple-400"
            >
              Project Management
            </Link>
            <span>/</span>
            <Link
              href="/project-management/addons"
              className="hover:text-purple-600 dark:hover:text-purple-400"
            >
              Add-on Features
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold">Emergency Contacts</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-[#56348f] shrink-0" />
            <span>Emergency Contacts Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure the emergency, HR, and technical helpdesk contacts shown on all employee dashboards
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/project-management/addons"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Add-ons</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchContacts(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#56348f]" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{ backgroundColor: "#56348f" }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* ── Notification Banners ── */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
            Total Contacts
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
            Active on Dashboard
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
            Hidden / Inactive
          </p>
          <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-1">
            {stats.inactive}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#56348f] dark:text-purple-400">
            Departments
          </p>
          <p className="text-2xl font-bold text-[#56348f] dark:text-purple-400 mt-1">
            {stats.departments.length || 1}
          </p>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, role, email, or department…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#56348f]/20"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden"
          >
            <option value="all">All Departments</option>
            {stats.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ── Emergency Contacts List Table ── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3 animate-pulse">
            <LifeBuoy className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
            <p className="text-xs font-medium">Loading emergency contacts…</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <LifeBuoy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No emergency contacts found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedDept !== "all" || selectedStatus !== "all"
                ? "Try clearing your search query or status filters to see available contacts."
                : "Click 'Add Contact' above to configure your first emergency helpdesk entry."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">Order</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Role / Designation</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Contact Channels</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                {filteredContacts.map((contact, idx) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Order & Reorder Controls */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-slate-400 text-[11px] w-4">
                          {contact.order}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "up")}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "down")}
                            disabled={idx === filteredContacts.length - 1}
                            title="Move Down"
                            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full ${contact.avatar_bg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          {contact.initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {contact.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role / Designation */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {contact.role}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      {contact.department ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-[#56348f] dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          <Building2 className="w-3 h-3" />
                          <span>{contact.department}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Contact Channels */}
                    <td className="py-3.5 px-4 space-y-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#56348f] dark:hover:text-purple-300 group"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f]" />
                          <span>{contact.email}</span>
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#56348f] dark:hover:text-purple-300 group"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#56348f]" />
                          <span>{contact.phone}</span>
                        </a>
                      )}
                      {!contact.email && !contact.phone && (
                        <span className="text-slate-400">No channels specified</span>
                      )}
                    </td>

                    {/* Status Toggle Switch */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(contact)}
                        className="inline-flex items-center gap-1.5 cursor-pointer"
                        title={contact.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {contact.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(contact)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#56348f] hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingContact(contact)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-[#56348f]" />
                <span>{editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahad, Nobby or Manu K O"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#56348f]/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Team HR or Lead Developer"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#56348f]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department / Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HR, Development, Tech"
                    value={formData.department || ""}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#56348f]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. hr@intersmart.in"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#56348f]/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#56348f]/20"
                  />
                </div>
              </div>

              {/* Avatar Color & Initials Preview */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Avatar Circle Style
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Live Preview:</span>
                    <div
                      className={`w-7 h-7 rounded-full ${formData.avatar_bg} text-white font-bold text-xs flex items-center justify-center shadow-xs`}
                    >
                      {formData.initials || "EC"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Custom Initials (2 Letters)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. HR, MK"
                      value={formData.initials || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, initials: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase font-bold"
                    />
                  </div>

                  <div className="flex-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Color Palette
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {AVATAR_COLOR_PALETTE.map((color) => (
                        <button
                          key={color.class}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar_bg: color.class })}
                          className={`w-6 h-6 rounded-full ${color.class} transition-transform cursor-pointer ${
                            formData.avatar_bg === color.class
                              ? "ring-2 ring-offset-2 ring-purple-600 scale-110"
                              : "hover:scale-105 opacity-80"
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Order & Active Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="contact_is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#56348f] rounded-sm border-slate-300 focus:ring-[#56348f]"
                  />
                  <label
                    htmlFor="contact_is_active"
                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Display as Active on Dashboard
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-slate-500 font-medium text-[11px]">Display Order:</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.order ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-14 px-2 py-1 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={savingContact}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  style={{ backgroundColor: "#56348f" }}
                  className="px-5 py-2 rounded-xl text-white font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {savingContact ? "Saving…" : editingContact ? "Save Changes" : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Emergency Contact?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete{" "}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {deletingContact.name}
                </span>
                ? It will be removed from all employee dashboards immediately.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingContact(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
