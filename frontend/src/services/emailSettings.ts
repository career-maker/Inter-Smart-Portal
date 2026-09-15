import api from "./api";

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password?: string;
  has_password?: boolean;
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
  approver_user_id?: number;
  approver_name?: string;
  approver_email?: string;
  custom_to?: string;
  approver_user_id_2?: number;
  approver_name_2?: string;
  approver_email_2?: string;
  custom_to_2?: string;
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

export interface RoleApprovalRule {
  to_user_id: number | null;
  to_email: string | null;
  cc_user_ids: number[];
  cc_emails: string[];
  approval_level: "single" | "multi";
  enabled: boolean;
}

export interface TeamLeadApprovalRuleGroup {
  id: string;
  name?: string;
  team_lead_ids: number[];
  wfh: RoleApprovalRule;
  leave_single_day: RoleApprovalRule;
  leave_multi_day: RoleApprovalRule;
  enabled: boolean;
}

export interface DepartmentApprovalRule {
  id: string;
  team_id: number;
  request_type: "all" | "wfh" | "leave";
  to_user_id: number | null;
  to_email: string | null;
  cc_user_ids: number[];
  cc_emails: string[];
  approval_level: "single" | "multi";
  enabled: boolean;
  notes?: string;
}

export interface EmployeeApprovalRuleGroup {
  id: string;
  name?: string;
  user_ids: number[];
  wfh: RoleApprovalRule;
  leave_single_day: RoleApprovalRule;
  leave_multi_day: RoleApprovalRule;
  enabled: boolean;
}

export type EmployeeApprovalRule = EmployeeApprovalRuleGroup;

export interface ApprovalRoutingRules {
  role_rules: {
    team_lead: {
      wfh: RoleApprovalRule;
      leave_single_day: RoleApprovalRule;
      leave_multi_day: RoleApprovalRule;
    };
    [roleKey: string]: Record<string, RoleApprovalRule>;
  };
  team_lead_rules?: TeamLeadApprovalRuleGroup[];
  department_rules?: DepartmentApprovalRule[];
  employee_rules: EmployeeApprovalRuleGroup[];
}

export interface ApprovalRoutingResponse {
  rules: ApprovalRoutingRules;
  teams: { id: number; name: string; code: string; team_lead_id: number | null; team_lead?: any }[];
  users: { id: number; first_name: string; last_name: string; email: string; employee_code?: string; team_id?: number; designation?: string }[];
  team_leads?: { id: number; first_name: string; last_name: string; email: string; employee_code?: string; team_id?: number; designation?: string }[];
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

  getApprovalRouting: async (): Promise<ApprovalRoutingResponse> => {
    const res = await api.get("/email-settings/approval-routing");
    return res.data.data;
  },

  updateApprovalRouting: async (payload: Partial<ApprovalRoutingRules>): Promise<any> => {
    const res = await api.post("/email-settings/approval-routing", payload);
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
