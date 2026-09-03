import api from "./api";

export interface EmergencyContact {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  avatar_bg: string;
  initials: string;
  order: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmergencyContactsStats {
  total: number;
  active: number;
  inactive: number;
  departments: string[];
}

export interface CreateEmergencyContactPayload {
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  avatar_bg?: string;
  initials?: string | null;
  order?: number;
  is_active?: boolean;
}

export const emergencyContactsApi = {
  // Public / Dashboard endpoint
  getContacts: async (): Promise<{ status: string; contacts: EmergencyContact[] }> => {
    const res = await api.get("/emergency-contacts");
    return res.data;
  },

  // Super Admin Management endpoints
  getAdminContacts: async (params?: {
    search?: string;
    department?: string;
    is_active?: string;
  }): Promise<{
    status: string;
    contacts: EmergencyContact[];
    stats: EmergencyContactsStats;
  }> => {
    const res = await api.get("/admin/emergency-contacts", { params });
    return res.data;
  },

  createContact: async (
    data: CreateEmergencyContactPayload
  ): Promise<{ status: string; message: string; contact: EmergencyContact }> => {
    const res = await api.post("/admin/emergency-contacts", data);
    return res.data;
  },

  updateContact: async (
    id: number,
    data: Partial<CreateEmergencyContactPayload>
  ): Promise<{ status: string; message: string; contact: EmergencyContact }> => {
    const res = await api.put(`/admin/emergency-contacts/${id}`, data);
    return res.data;
  },

  deleteContact: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await api.delete(`/admin/emergency-contacts/${id}`);
    return res.data;
  },

  toggleContact: async (
    id: number
  ): Promise<{ status: string; message: string; is_active: boolean }> => {
    const res = await api.patch(`/admin/emergency-contacts/${id}/toggle`);
    return res.data;
  },

  reorderContacts: async (
    items: Array<{ id: number; order: number }>
  ): Promise<{ status: string; message: string }> => {
    const res = await api.post("/admin/emergency-contacts/reorder", { items });
    return res.data;
  },
};

export default emergencyContactsApi;
