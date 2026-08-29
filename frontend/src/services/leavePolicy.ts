import api from './api';

export interface LeavePolicySettings {
  id?: number;
  monthly_cycle_start_day: number;
  probation_period_months: number;
  default_monthly_cl: number;
  default_monthly_sl: number;
  cl_carry_forward_years: number;
  sl_carry_forward_allowed: boolean;
}

export interface CycleInfo {
  start_day: number;
  cycle_key: string;
  cycle_month: string;
  cycle_start_date: string;
  cycle_end_date: string;
  next_allocation_at: string;
  is_cycle_start_day: boolean;
}

export interface PolicyEmployee {
  id: number;
  name: string;
  email: string;
  employee_code: string;
  designation: string;
  joining_date: string | null;
  probation_end_date: string | null;
  is_in_probation: boolean;
  probation_cleared_manually: boolean;
  eligibility_status: string;
  eligibility_reason: string;
  days_remaining: number;
  casual_leave_balance: number;
  cl_carry_forward: number;
  sick_leave_balance: number;
  last_allocated_cycle: string | null;
  custom_monthly_cl: number | null;
  custom_monthly_sl: number | null;
  custom_probation_months: number | null;
  effective_monthly_cl: number;
  effective_monthly_sl: number;
  has_custom_allocation: boolean;
}

export interface LedgerEntry {
  id: number;
  user_id: number;
  leave_type: string;
  amount: number;
  transaction_type: string;
  cycle_key: string | null;
  opening_balance: number;
  closing_balance: number;
  modified_by: number | null;
  remarks: string | null;
  carry_forward_year: number | null;
  expires_at: string | null;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    employee_code?: string;
    email: string;
  };
  modifier?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

export const leavePolicyApi = {
  getSettings: async (): Promise<{ settings: LeavePolicySettings; cycle_info: CycleInfo }> => {
    const res = await api.get('/leave-policy/settings');
    return res.data;
  },

  updateSettings: async (settings: LeavePolicySettings): Promise<{ message: string; settings: LeavePolicySettings; cycle_info: CycleInfo }> => {
    const res = await api.post('/leave-policy/settings', settings);
    return res.data;
  },

  getEmployees: async (params?: { search?: string; status?: string }): Promise<{ employees: PolicyEmployee[]; count: number }> => {
    const res = await api.get('/leave-policy/employees', { params });
    return res.data;
  },

  updateEmployeePolicy: async (userId: number, data: {
    custom_monthly_cl?: number | null;
    custom_monthly_sl?: number | null;
    custom_probation_months?: number | null;
    probation_cleared_manually?: boolean;
    notes?: string;
  }): Promise<{ message: string; policy: any }> => {
    const res = await api.post(`/leave-policy/employees/${userId}`, data);
    return res.data;
  },

  clearProbation: async (userId: number): Promise<{ message: string }> => {
    const res = await api.post(`/leave-policy/employees/${userId}/clear-probation`);
    return res.data;
  },

  adjustBalance: async (userId: number, data: {
    casual_leave_balance?: number;
    cl_carry_forward?: number;
    cl_carry_forward_year?: number;
    sick_leave_balance?: number;
    remarks?: string;
  }): Promise<{ message: string; data: any }> => {
    const res = await api.post(`/leave-policy/adjust-balance/${userId}`, data);
    return res.data;
  },

  getLedger: async (params?: {
    user_id?: number;
    transaction_type?: string;
    leave_type?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ data: { data: LedgerEntry[]; total: number; current_page: number; last_page: number } }> => {
    const res = await api.get('/leave-policy/ledger', { params });
    return res.data;
  },

  triggerCycle: async (params?: { force?: boolean; date?: string }): Promise<{ message: string; result: any }> => {
    const res = await api.post('/leave-policy/trigger-cycle', params);
    return res.data;
  },
};

export default leavePolicyApi;
