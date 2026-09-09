export type BugzillaSeverity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'NORMAL' | 'MINOR' | 'TRIVIAL';
export type BugzillaPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type BugzillaStatus = 'UNCONFIRMED' | 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'IN PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED' | 'REOPENED';
export type BugzillaResolution = 'FIXED' | 'INVALID' | 'WONTFIX' | 'DUPLICATE' | 'WORKSFORME' | 'INCOMPLETE';

export interface BugzillaUserSummary {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  avatar?: string;
  designation?: string;
}

export interface BugzillaProject {
  id: number;
  portal_project_id: number;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  default_assignee_id?: number | null;
  default_assignee?: BugzillaUserSummary | null;
  created_by?: number | null;
  portal_project?: {
    id: number;
    name: string;
    status: string;
    category?: string;
    team_id?: number;
    team?: { id: number; name: string; code?: string };
    coordinator?: BugzillaUserSummary;
    members?: Array<{ user: BugzillaUserSummary }>;
  };
  components?: BugzillaComponent[];
  components_count?: number;
  bugs_count?: number;
  open_bugs_count?: number;
  critical_bugs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BugzillaComponent {
  id: number;
  bugzilla_project_id: number;
  name: string;
  description?: string | null;
  default_assignee_id?: number | null;
  default_assignee?: BugzillaUserSummary | null;
  status: 'active' | 'inactive';
  bugs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BugzillaLabel {
  id: number;
  name: string;
}

export interface BugzillaComment {
  id: number;
  bug_id: number;
  user_id: number;
  user?: BugzillaUserSummary;
  comment: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface BugzillaAttachment {
  id: number;
  bug_id: number;
  uploaded_by: number;
  uploader?: BugzillaUserSummary;
  file_path: string;
  file_url?: string;
  original_name: string;
  mime_type?: string;
  file_size?: number;
  description?: string;
  is_private: boolean;
  created_at: string;
}

export interface BugzillaHistory {
  id: number;
  bug_id: number;
  user_id: number;
  user?: BugzillaUserSummary;
  action: string;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
}

export interface BugzillaDependency {
  id: number;
  bug_id: number;
  depends_on_bug_id: number;
  relationship_type: 'depends_on' | 'blocks';
  depends_on_bug?: BugzillaBug;
  bug?: BugzillaBug;
  created_at: string;
}

export interface BugzillaWatcher {
  id: number;
  bug_id: number;
  user_id: number;
  user?: BugzillaUserSummary;
  created_at: string;
}

export interface BugzillaBug {
  id: number;
  bug_number: string;
  bugzilla_project_id: number;
  portal_project_id: number;
  task_id?: number | null;
  component_id?: number | null;
  reporter_id: number;
  assignee_id?: number | null;
  summary: string;
  description: string;
  steps_to_reproduce?: string | null;
  expected_result?: string | null;
  actual_result?: string | null;
  environment?: string | null;
  browser?: string | null;
  device?: string | null;
  severity: BugzillaSeverity;
  priority: BugzillaPriority;
  status: BugzillaStatus;
  resolution?: BugzillaResolution | null;
  duplicate_of_bug_id?: number | null;
  linked_pm_bug_id?: number | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  bugzilla_project?: BugzillaProject;
  portal_project?: { id: number; name: string; team_id?: number; team?: { id: number; name: string } };
  project?: { id: number; name: string; team_id?: number };
  task?: { id: number; title: string; status: string; priority: string; due_date?: string; project_id?: number };
  component?: BugzillaComponent;
  reporter?: BugzillaUserSummary;
  assignee?: BugzillaUserSummary | null;
  duplicate_of?: { id: number; bug_number: string; summary: string; status: string } | null;
  duplicates?: Array<{ id: number; bug_number: string; summary: string; status: string }>;
  linked_pm_bug?: any;
  comments?: BugzillaComment[];
  comments_count?: number;
  attachments?: BugzillaAttachment[];
  attachments_count?: number;
  labels?: BugzillaLabel[];
  history?: BugzillaHistory[];
  dependencies?: BugzillaDependency[];
  blocks?: BugzillaDependency[];
  watchers?: BugzillaWatcher[];
}

export interface BugzillaSavedSearch {
  id: number;
  user_id: number;
  name: string;
  criteria: Record<string, any>;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface BugzillaCapabilities {
  has_access: boolean;
  can_view: boolean;
  can_report: boolean;
  can_develop: boolean;
  can_manage: boolean;
  is_super_admin: boolean;
  addon_enabled: boolean;
}

export interface BugzillaOverviewMetrics {
  total: number;
  open: number;
  critical: number;
  unassigned: number;
  resolved: number;
  closed: number;
  reopened: number;
  assigned_to_me: number;
}

export interface DuplicateCandidate {
  id: number;
  bug_number: string;
  summary: string;
  status: string;
  similarity?: number;
}

export interface BugzillaBugListParams {
  page?: number;
  per_page?: number;
  portal_project_id?: number;
  bugzilla_project_id?: number;
  task_id?: number;
  component_id?: number;
  reporter_id?: number;
  assignee_id?: number;
  status?: string;
  resolution?: string;
  severity?: string;
  priority?: string;
  search?: string;
  quick_filter?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface CreateBugzillaBugPayload {
  portal_project_id: number;
  bugzilla_project_id?: number;
  task_id?: number | null;
  component_id?: number | null;
  summary: string;
  description: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  environment?: string;
  browser?: string;
  device?: string;
  severity: BugzillaSeverity;
  priority: BugzillaPriority;
  status?: BugzillaStatus;
  assignee_id?: number | null;
  labels?: string[];
}

export interface UpdateBugzillaBugPayload {
  summary?: string;
  description?: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  environment?: string;
  browser?: string;
  device?: string;
  severity?: BugzillaSeverity;
  priority?: BugzillaPriority;
  status?: BugzillaStatus;
  resolution?: BugzillaResolution | null;
  component_id?: number | null;
  assignee_id?: number | null;
  labels?: string[];
  duplicate_of_bug_id?: number | null;
}

export interface BulkUpdateBugzillaBugsPayload {
  bug_ids: number[];
  status?: BugzillaStatus | string;
  resolution?: BugzillaResolution | string;
  priority?: BugzillaPriority | string;
  severity?: BugzillaSeverity | string;
  assignee_id?: number | null;
  component_id?: number | null;
  add_labels?: string[];
  remove_labels?: string[];
}

export interface BugzillaReportData {
  summary: {
    total: number;
    open: number;
    unassigned: number;
    critical_blocker: number;
    resolved: number;
    closed: number;
    reopened: number;
  };
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  by_priority: Record<string, number>;
  by_resolution: Record<string, number>;
  by_assignee: Record<string, number>;
  by_project: Record<string, number>;
  recent_bugs?: BugzillaBug[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success?: boolean;
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}

