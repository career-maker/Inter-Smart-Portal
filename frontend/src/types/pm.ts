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
  is_live?: boolean;
  live_date?: string | null;
  live_notes?: string | null;
  live_marked_by?: number | null;
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
  fixing_notes?: string | null;
  created_by?: number;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // Counts
  tasks_count?: number;
  completed_tasks_count?: number;
  active_tasks_count?: number;

  // Eager-loaded relations
  team?: ProjectTeamSummary | null;
  coordinator?: ProjectCoordinatorSummary | null;
  creator?: { id: number; first_name: string; last_name: string } | null;
  liveMarker?: { id: number; first_name: string; last_name: string } | null;
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
  html_bugs?: number | null;
  functional_bugs?: number | null;
  total_bugs?: number | null;
  bug_tracker_link?: string | null;
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
  team_id?: number | null;
  search?: string;
  page?: number;
  per_page?: number | string;
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
  html_bugs?: number | null;
  functional_bugs?: number | null;
  total_bugs?: number | null;
  bug_tracker_link?: string | null;
}

// ── PM Add-on & Team Module Types ───────────────────────────────────────────

export interface PmTeamSummary {
  id: number;
  name: string;
  code?: string | null;
}

export interface PmAddon {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  teams?: PmTeamSummary[];
  created_at: string;
  updated_at: string;
}

export interface BugReportSummary {
  total_bugs: number;
  html_bugs: number;
  functional_bugs: number;
  tasks_with_bugs: number;
  total_tasks: number;
  avg_bugs_per_task: number;
}

export interface BugReportResponse {
  summary: BugReportSummary;
  tasks: PaginatedResponse<ProjectTask>;
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
  team_id?: number | null;
  status?: string;
  priority?: string;
  assignee_id?: number;
  coordinator_id?: number | null;
  search?: string;
  page?: number;
  per_page?: number | string;
}

export interface StoreProjectTaskCommentPayload {
  comment: string;
}

export interface StoreProjectTaskCatalogPayload {
  name: string;
  category?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export type UpdateProjectTaskCatalogPayload = Partial<StoreProjectTaskCatalogPayload>;

// ── Hubstaff Integration Types ───────────────────────────────────────────────

export interface HubstaffProject {
  id: string;
  name: string;
  status?: string;
  is_already_linked: boolean;
  linked_project_id?: number | null;
}

export interface HubstaffProjectsResponse {
  configured: boolean;
  projects: HubstaffProject[];
  error?: string | null;
  message?: string | null;
}

// ── Project Status 360 & Made Live Types ─────────────────────────────────────

export interface MarkProjectLivePayload {
  live_date?: string;
  live_notes?: string;
}

export interface SubPhaseAnalyticsItem {
  id: number;
  name: string;
  order: number;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  forecast_tasks: number;
  progress_percentage: number;
}

export interface HubstaffProjectMemberStat {
  hubstaff_user_id: string;
  user_id?: number | null;
  name: string;
  email?: string | null;
  employee_code?: string | null;
  designation?: string;
  team_name?: string | null;
  is_linked?: boolean;
  profile_photo_path?: string | null;
  tracked_seconds: number;
  tracked_formatted: string;
  activity_percentage: number;
}

export interface HubstaffProjectAnalytics {
  hubstaff_project_id: string;
  total_tracked_seconds: number;
  total_tracked_formatted: string;
  avg_activity_percentage: number;
  members: HubstaffProjectMemberStat[];
}

export interface TaskDeviationItem {
  id: number;
  title: string;
  status: TaskStatus;
  allotted_days?: number | null;
  time_taken?: number | null;
  days_taken?: number | null;
  deviation?: number | null;
  deviation_reason?: string | null;
  sub_phase_name?: string;
}

export interface ProjectStatusDetailsData {
  project: Project & {
    subPhases?: Array<{ id: number; name: string; order: number; status: string }>;
    tasks?: ProjectTask[];
  };
  sub_phases_analytics: SubPhaseAnalyticsItem[];
  hubstaff_analytics?: HubstaffProjectAnalytics | null;
  deviations: TaskDeviationItem[];
  after_live_tasks: ProjectTask[];
  stats: {
    total_tasks: number;
    completed_tasks: number;
    active_tasks: number;
    forecast_tasks: number;
    overdue_tasks: number;
    total_members: number;
  };
}
