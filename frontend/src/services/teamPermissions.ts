import api from "@/services/api";

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export interface PermissionTeam {
  id: number;
  name: string;
  code?: string;
  team_lead_id?: number | null;
  team_lead?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export type PermissionScope = "all_members" | "leads_only" | null;

export interface PermissionMatrix {
  [permission_key: string]: {
    [team_id: number]: PermissionScope;
  };
}

export interface PermissionsResponse {
  definitions: PermissionDefinition[];
  teams: PermissionTeam[];
  matrix: PermissionMatrix;
}

export interface UserPermissionsMap {
  [permission_key: string]: boolean;
}

export interface MyPermissionsResponse {
  permissions: UserPermissionsMap;
  is_super_admin: boolean;
}

const teamPermissionsApi = {
  // Get all permission definitions and the current matrix (Super Admin)
  getMatrix: async (): Promise<PermissionsResponse> => {
    const res = await api.get<PermissionsResponse>("/addons/permissions");
    return res.data;
  },

  // Update permission assignments matrix (Super Admin)
  updateMatrix: async (matrix: PermissionMatrix): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/addons/permissions", { matrix });
    return res.data;
  },

  // Get current user's resolved permissions
  getMyPermissions: async (): Promise<MyPermissionsResponse> => {
    const res = await api.get<MyPermissionsResponse>("/user-permissions");
    return res.data;
  },
};

export default teamPermissionsApi;
