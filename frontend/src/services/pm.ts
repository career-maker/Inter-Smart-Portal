/**
 * Project Management Module (PM) — API Client Service.
 *
 * Reuses the existing authenticated Axios instance in frontend/src/services/api.ts.
 * Implements methods strictly for currently active backend routes (Projects, Tasks, Comments).
 */

import api from './api';
import {
  Project,
  ProjectMember,
  ProjectMemberUser,
  ProjectTask,
  ProjectTaskCatalog,
  ProjectTaskAssignee,
  ProjectTaskComment,
  PaginatedResponse,
  ApiResponse,
  StoreProjectPayload,
  UpdateProjectPayload,
  AddProjectMemberPayload,
  SetProjectCoordinatorPayload,
  ProjectFilterParams,
  StoreProjectTaskPayload,
  UpdateProjectTaskPayload,
  UpdateProjectTaskStatusPayload,
  AssignProjectTaskPayload,
  SetTaskCoordinatorPayload,
  TaskFilterParams,
  StoreProjectTaskCommentPayload,
} from '@/types/pm';

export const pmApi = {
  // ── Projects ───────────────────────────────────────────────────────────────

  /**
   * List projects (scoped by role/membership/coordinator).
   */
  getProjects: async (params?: ProjectFilterParams): Promise<PaginatedResponse<Project>> => {
    const res = await api.get<PaginatedResponse<Project>>('/projects', { params });
    return res.data;
  },

  /**
   * Get single project details with coordinator, team, and creator.
   */
  getProject: async (id: number): Promise<ApiResponse<Project>> => {
    const res = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return res.data;
  },

  /**
   * Create a new project.
   */
  createProject: async (payload: StoreProjectPayload): Promise<ApiResponse<Project>> => {
    const res = await api.post<ApiResponse<Project>>('/projects', payload);
    return res.data;
  },

  /**
   * Update an existing project.
   */
  updateProject: async (id: number, payload: UpdateProjectPayload): Promise<ApiResponse<Project>> => {
    const res = await api.put<ApiResponse<Project>>(`/projects/${id}`, payload);
    return res.data;
  },

  /**
   * Soft-delete / archive a project.
   */
  deleteProject: async (id: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/projects/${id}`);
    return res.data;
  },

  /**
   * List members of a project.
   */
  getProjectMembers: async (projectId: number): Promise<{ data: ProjectMemberUser[] }> => {
    const res = await api.get<{ data: ProjectMemberUser[] }>(`/projects/${projectId}/members`);
    return res.data;
  },

  /**
   * Add a member to a project.
   */
  addProjectMember: async (
    projectId: number,
    payload: AddProjectMemberPayload
  ): Promise<ApiResponse<ProjectMember>> => {
    const res = await api.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, payload);
    return res.data;
  },

  /**
   * Remove a member from a project.
   */
  removeProjectMember: async (projectId: number, userId: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/projects/${projectId}/members/${userId}`);
    return res.data;
  },

  /**
   * Assign or update project coordinator (server validates target department).
   */
  setProjectCoordinator: async (
    projectId: number,
    payload: SetProjectCoordinatorPayload
  ): Promise<ApiResponse<Project>> => {
    const res = await api.post<ApiResponse<Project>>(`/projects/${projectId}/coordinator`, payload);
    return res.data;
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────

  /**
   * List all visible tasks (filterable by project, sub_phase, team, status, assignee).
   */
  getTasks: async (params?: TaskFilterParams): Promise<PaginatedResponse<ProjectTask>> => {
    const res = await api.get<PaginatedResponse<ProjectTask>>('/project-tasks', { params });
    return res.data;
  },

  /**
   * List tasks assigned to the current authenticated user.
   */
  getMyTasks: async (params?: { page?: number }): Promise<PaginatedResponse<ProjectTask>> => {
    const res = await api.get<PaginatedResponse<ProjectTask>>('/project-tasks/my', { params });
    return res.data;
  },

  /**
   * Get single task details with project, subPhase, coordinator, and assignees.
   */
  getTask: async (id: number): Promise<ApiResponse<ProjectTask>> => {
    const res = await api.get<ApiResponse<ProjectTask>>(`/project-tasks/${id}`);
    return res.data;
  },

  /**
   * Create a new task within a project.
   */
  createProjectTask: async (
    projectId: number,
    payload: StoreProjectTaskPayload
  ): Promise<ApiResponse<ProjectTask>> => {
    const res = await api.post<ApiResponse<ProjectTask>>(`/projects/${projectId}/tasks`, payload);
    return res.data;
  },

  /**
   * Update task fields (server authorizes planning vs execution fields).
   */
  updateTask: async (
    id: number,
    payload: UpdateProjectTaskPayload
  ): Promise<ApiResponse<ProjectTask>> => {
    const res = await api.put<ApiResponse<ProjectTask>>(`/project-tasks/${id}`, payload);
    return res.data;
  },

  /**
   * Quick status update for a task.
   */
  updateTaskStatus: async (
    id: number,
    payload: UpdateProjectTaskStatusPayload
  ): Promise<ApiResponse<ProjectTask>> => {
    const res = await api.post<ApiResponse<ProjectTask>>(`/project-tasks/${id}/status`, payload);
    return res.data;
  },

  /**
   * Add an assignee to a task.
   */
  addTaskAssignee: async (
    taskId: number,
    payload: AssignProjectTaskPayload
  ): Promise<ApiResponse<ProjectTaskAssignee>> => {
    const res = await api.post<ApiResponse<ProjectTaskAssignee>>(
      `/project-tasks/${taskId}/assignees`,
      payload
    );
    return res.data;
  },

  /**
   * Remove an assignee from a task.
   */
  removeTaskAssignee: async (taskId: number, userId: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/project-tasks/${taskId}/assignees/${userId}`);
    return res.data;
  },

  /**
   * Assign or update task coordinator (server validates target department).
   */
  setTaskCoordinator: async (
    taskId: number,
    payload: SetTaskCoordinatorPayload
  ): Promise<ApiResponse<ProjectTask>> => {
    const res = await api.post<ApiResponse<ProjectTask>>(`/project-tasks/${taskId}/coordinator`, payload);
    return res.data;
  },

  // ── Comments ───────────────────────────────────────────────────────────────

  /**
   * List comments for a task.
   */
  getTaskComments: async (taskId: number): Promise<ApiResponse<ProjectTaskComment[]>> => {
    const res = await api.get<ApiResponse<ProjectTaskComment[]>>(`/project-tasks/${taskId}/comments`);
    return res.data;
  },

  /**
   * Add a comment to a task.
   */
  addTaskComment: async (
    taskId: number,
    payload: StoreProjectTaskCommentPayload
  ): Promise<ApiResponse<ProjectTaskComment>> => {
    const res = await api.post<ApiResponse<ProjectTaskComment>>(
      `/project-tasks/${taskId}/comments`,
      payload
    );
    return res.data;
  },

  // ── Task Catalog ───────────────────────────────────────────────────────────

  /**
   * List task catalog items (active items for selectors, or paginated list for administration).
   */
  getTaskCatalog: async (params?: {
    is_active?: boolean;
    search?: string;
    category?: string;
    all?: boolean;
    page?: number;
  }): Promise<{ data: ProjectTaskCatalog[] } | PaginatedResponse<ProjectTaskCatalog>> => {
    const res = await api.get('/pm-task-catalog', { params });
    return res.data;
  },

  /**
   * Create a new task catalog item (Super Admin only).
   */
  createTaskCatalogItem: async (
    payload: { name: string; category?: string | null; description?: string | null; is_active?: boolean }
  ): Promise<ApiResponse<ProjectTaskCatalog>> => {
    const res = await api.post<ApiResponse<ProjectTaskCatalog>>('/pm-task-catalog', payload);
    return res.data;
  },

  /**
   * Update a task catalog item (Super Admin only).
   */
  updateTaskCatalogItem: async (
    id: number,
    payload: { name?: string; category?: string | null; description?: string | null; is_active?: boolean }
  ): Promise<ApiResponse<ProjectTaskCatalog>> => {
    const res = await api.put<ApiResponse<ProjectTaskCatalog>>(`/pm-task-catalog/${id}`, payload);
    return res.data;
  },

  /**
   * Soft-delete a task catalog item (Super Admin only).
   */
  deleteTaskCatalogItem: async (id: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/pm-task-catalog/${id}`);
    return res.data;
  },

  // ── Hubstaff Integration ───────────────────────────────────────────────────

  /**
   * Fetch available Hubstaff projects for project linking during creation.
   */
  getHubstaffProjects: async (): Promise<{
    configured: boolean;
    projects: { id: string; name: string; status?: string; is_already_linked: boolean; linked_project_id?: number | null }[];
    error?: string | null;
    message?: string | null;
  }> => {
    const res = await api.get('/pm/hubstaff/projects');
    return res.data;
  },
};

export default pmApi;
