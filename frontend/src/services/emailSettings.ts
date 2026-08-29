import api from "./api";

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password?: string;
  from_address: string;
  from_name: string;
}

export interface RoutingRule {
  name?: string;
  notify_tl?: boolean;
  notify_admin?: boolean;
  notify_hr?: boolean;
  notify_recipient?: boolean;
  cc_applicant?: boolean;
  custom_to?: string[];
  custom_cc?: string[];
  enabled: boolean;
}

export interface EmployeeOverride {
  user_id: number;
  user_name?: string;
  employee_code?: string;
  user_email?: string;
  action: string;
  custom_to?: string;
  custom_cc?: string[];
  enabled: boolean;
  notes?: string;
}

export interface EmailSettingsResponse {
  smtp: SmtpConfig;
  routing: Record<string, RoutingRule>;
  employee_overrides: EmployeeOverride[];
  default_routing: Record<string, RoutingRule>;
}

export const emailSettingsApi = {
  getSettings: async (): Promise<EmailSettingsResponse> => {
    const res = await api.get("/email-settings");
    return res.data.data;
  },

  updateSmtp: async (payload: SmtpConfig): Promise<any> => {
    const res = await api.post("/email-settings/smtp", payload);
    return res.data;
  },

  updateRouting: async (routing: Record<string, RoutingRule>): Promise<any> => {
    const res = await api.post("/email-settings/routing", { routing });
    return res.data;
  },

  updateEmployeeOverrides: async (overrides: EmployeeOverride[]): Promise<any> => {
    const res = await api.post("/email-settings/employee-overrides", { overrides });
    return res.data;
  },

  sendTestEmail: async (payload: {
    test_email: string;
    host?: string;
    port?: number;
    encryption?: string;
    username?: string;
    password?: string;
    from_address?: string;
    from_name?: string;
  }): Promise<any> => {
    const res = await api.post("/email-settings/test", payload);
    return res.data;
  },
};

export default emailSettingsApi;
