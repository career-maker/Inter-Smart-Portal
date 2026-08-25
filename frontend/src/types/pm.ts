/**
 * Project Management Module (PM) — TypeScript Domain Types & API Contracts.
 *
 * Matches the backend models and API responses implemented in Stage 7
 * (App\Models\Project, ProjectTask, ProjectMember, ProjectTaskAssignee, ProjectTaskComment).
 */

// ── Status & Priority Vocabularies ───────────────────────────────────────────

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Planning',
  'Active',
  'On Hold',
  'Completed',
  'Cancelled',
];

export type TaskStatus =
  | 'Yet to Start'
  | 'Being Developed'
  | 'Ready for QA'
  | 'Assigned to QA'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Forecast'
  | 'Rejected';

export const TASK_STATUSES: TaskStatus[] = [
  'Yet to Start',
  'Being Developed',
  'Ready for QA',
  'Assigned to QA',
  'In Progress',
  'On Hold',
  'Completed',
  'Forecast',
  'Rejected',
];

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export type ProjectRole = 'Member' | 'Lead' | 'Reviewer' | 'Observer';

export const PROJECT_ROLES: ProjectRole[] = ['Member', 'Lead', 'Reviewer', 'Observer'];

// ── Domain Entities ──────────────────────────────────────────────────────────

export interface ProjectCoordinatorSummary {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  profile_photo_path?: string | null;
}

export interface ProjectTeamSummary {
  id: number;
  name: string;
}

export interface ProjectMemberUser {
  id: number;
  first_name: string;
  last_name: string;
  employee_code?: string | null;
  pivot?: {
    project_id: number;
    user_id: number;
    project_role?: ProjectRole;
    created_at?: string;
  };
}

export interface Project {
  id: number;
  name: string;
  name_normalized?: string;
  description?: string | null;
  status: ProjectStatus;
  project_type?: string | null;
  category?: string | null;
  team_id?: number | null;
  project_coordinator_id?: number | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  allotted_effort?: number | null;
  confirmed_effort?: number | null;
  expected_effort?: number | null;
  committed_effort?: number | null;
  hubstaff_project_id?: string | null;
  blockers?: string | null;
  budget?: number | null;
  live_notes?: string | null;
  fixing_notes?: string | null;
  created_by?: number;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // Eager-loaded relations
  team?: ProjectTeamSummary | null;
  coordinator?: ProjectCoordinatorSummary | null;
  creator?: { id: number; first_name: string; last_name: string } | null;
  members?: ProjectMemberUser[];
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  project_role: ProjectRole;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    employee_code?: string | null;
  };
}

export interface ProjectTaskAssigneeSummary {
  id: number;
  first_name: string;
  last_name: string;
  pivot?: {
    task_id: number;
    user_id: number;
    is_primary: boolean;
    individual_status?: TaskStatus | null;
    progress_percentage?: number | null;
  };
}

export interface ProjectTaskCatalog {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  sub_phase_id?: number | null;
  catalog_task_id?: number | null;
  team_id?: number | null;
  coordinator_id?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  actual_start_date?: string | null;
  actual_completion_date?: string | null;
  include_saturday?: boolean;
  include_sunday?: boolean;
  sprint?: string | null;
  sprint_link?: string | null;
  allotted_days?: number | null;
  time_taken?: number | null;
  days_taken?: number | null;
  deviation?: number | null;
  deviation_reason?: string | null;
  activity_percentage?: number | null;
  current_updates?: string | null;
  created_by?: number;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;

  // Eager-loaded relations
  project?: { id: number; name: string; team_id?: number | null };
  sub_phase?: { id: number; name: string } | null;
  catalog_task?: ProjectTaskCatalog | null;
  catalogTask?: ProjectTaskCatalog | null;
  coordinator?: ProjectCoordinatorSummary | null;
  assignees?: ProjectTaskAssigneeSummary[];
}

export interface ProjectTaskAssignee {
  id: number;
  task_id: number;
  user_id: number;
  is_primary: boolean;
  individual_status?: TaskStatus | null;
  progress_percentage?: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

export interface ProjectTaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_photo_path?: string | null;
  };
}

// ── Generic API Responses ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Request Payloads ─────────────────────────────────────────────────────────

export interface StoreProjectPayload {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  project_type?: string | null;
  category?: string | null;
  team_id?: number | null;
  project_coordinator_id?: number | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  allotted_effort?: number | null;
  confirmed_effort?: number | null;
  expected_effort?: number | null;
  committed_effort?: number | null;
  hubstaff_project_id?: string | null;
  blockers?: string | null;
  budget?: number | null;
  live_notes?: string | null;
  fixing_notes?: string | null;
}

export type UpdateProjectPayload = Partial<StoreProjectPayload>;

export interface AddProjectMemberPayload {
  user_id: number;
  project_role?: ProjectRole;
}

export interface SetProjectCoordinatorPayload {
  project_coordinator_id?: number | null;
}

export interface ProjectFilterParams {
  status?: string;
  team_id?: number;
  search?: string;
  page?: number;
}

export interface StoreProjectTaskPayload {
  title: string;
  catalog_task_id?: number | null;
  description?: string | null;
  sub_phase_id?: number | null;
  team_id?: number | null;
  coordinator_id?: number | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  include_saturday?: boolean;
  include_sunday?: boolean;
  sprint?: string | null;
  sprint_link?: string | null;
  allotted_days?: number | null;
  current_updates?: string | null;
  assignee_ids?: number[];
}

export interface UpdateProjectTaskPayload extends Partial<StoreProjectTaskPayload> {
  actual_start_date?: string | null;
  actual_completion_date?: string | null;
  time_taken?: number | null;
  days_taken?: number | null;
  deviation_reason?: string | null;
  activity_percentage?: number | null;
}

export interface UpdateProjectTaskStatusPayload {
  status: TaskStatus;
  deviation_reason?: string | null;
}

export interface AssignProjectTaskPayload {
  user_id: number;
  is_primary?: boolean;
}

export interface SetTaskCoordinatorPayload {
  coordinator_id?: number | null;
}

export interface TaskFilterParams {
  project_id?: number;
  sub_phase_id?: number;
  team_id?: number;
  status?: string;
  priority?: string;
  assignee_id?: number;
  search?: string;
  page?: number;
}

export interface StoreProjectTaskCommentPayload {
  comment: string;
}
