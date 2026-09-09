/**
 * Bugzilla Module — Frontend API Client Service
 * InterSmart Employee Portal
 */

import api from './api';
import {
  BugzillaProject,
  BugzillaComponent,
  BugzillaBug,
  BugzillaComment,
  BugzillaAttachment,
  BugzillaHistory,
  BugzillaDependency,
  BugzillaSavedSearch,
  BugzillaReportData,
  BugzillaBugListParams,
  CreateBugzillaBugPayload,
  UpdateBugzillaBugPayload,
  BulkUpdateBugzillaBugsPayload,
  DuplicateCandidate,
  PaginatedResponse,
  ApiResponse,
} from '@/types/bugzilla';

export const bugzillaApi = {
  // ── Projects ───────────────────────────────────────────────────────────────
  getProjects: async (params?: { search?: string; status?: string; per_page?: number; page?: number }): Promise<any> => {
    const res = await api.get<any>('/bugzilla/projects', { params });
    const list = res.data?.projects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    return {
      projects: list,
      data: list,
      total: res.data?.total ?? list.length,
      ...res.data,
    };
  },

  getProject: async (id: number): Promise<ApiResponse<BugzillaProject>> => {
    const res = await api.get<ApiResponse<BugzillaProject>>(`/bugzilla/projects/${id}`);
    return res.data;
  },

  createProject: async (payload: { portal_project_id: number; name?: string; description?: string; status?: string }): Promise<ApiResponse<BugzillaProject>> => {
    const res = await api.post<ApiResponse<BugzillaProject>>('/bugzilla/projects', payload);
    return res.data;
  },

  updateProject: async (id: number, payload: { name?: string; description?: string; status?: string }): Promise<ApiResponse<BugzillaProject>> => {
    const res = await api.patch<ApiResponse<BugzillaProject>>(`/bugzilla/projects/${id}`, payload);
    return res.data;
  },

  autoCreateProjects: async (): Promise<{ success: boolean; message: string; data: { created: number; skipped: number; failed: number } }> => {
    const res = await api.post('/bugzilla/projects/auto-create');
    return res.data;
  },

  // ── Components ─────────────────────────────────────────────────────────────
  getComponents: async (projectId: number): Promise<ApiResponse<BugzillaComponent[]>> => {
    const res = await api.get<ApiResponse<BugzillaComponent[]>>(`/bugzilla/projects/${projectId}/components`);
    return res.data;
  },

  createComponent: async (
    projectId: number,
    payload: { name: string; description?: string; default_assignee_id?: number | null; status?: string }
  ): Promise<ApiResponse<BugzillaComponent>> => {
    const res = await api.post<ApiResponse<BugzillaComponent>>(`/bugzilla/projects/${projectId}/components`, payload);
    return res.data;
  },

  updateComponent: async (
    id: number,
    payload: { name?: string; description?: string; default_assignee_id?: number | null; status?: string }
  ): Promise<ApiResponse<BugzillaComponent>> => {
    const res = await api.patch<ApiResponse<BugzillaComponent>>(`/bugzilla/components/${id}`, payload);
    return res.data;
  },

  deleteComponent: async (id: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/bugzilla/components/${id}`);
    return res.data;
  },

  // ── Bugs ───────────────────────────────────────────────────────────────────
  getBugs: async (params?: BugzillaBugListParams): Promise<any> => {
    const res = await api.get<any>('/bugzilla/bugs', { params });
    const paginator = res.data?.bugs || res.data;
    const items = paginator?.data || (Array.isArray(paginator) ? paginator : []);
    return {
      data: items,
      bugs: items,
      total: paginator?.total ?? items.length,
      current_page: paginator?.current_page ?? 1,
      last_page: paginator?.last_page ?? 1,
      ...res.data,
    };
  },

  getBug: async (id: number): Promise<ApiResponse<BugzillaBug>> => {
    const res = await api.get<ApiResponse<BugzillaBug>>(`/bugzilla/bugs/${id}`);
    return res.data;
  },

  createBug: async (payload: CreateBugzillaBugPayload): Promise<ApiResponse<BugzillaBug>> => {
    const res = await api.post<ApiResponse<BugzillaBug>>('/bugzilla/bugs', payload);
    return res.data;
  },

  updateBug: async (id: number, payload: UpdateBugzillaBugPayload): Promise<ApiResponse<BugzillaBug>> => {
    const res = await api.patch<ApiResponse<BugzillaBug>>(`/bugzilla/bugs/${id}`, payload);
    return res.data;
  },

  bulkUpdateBugs: async (payload: BulkUpdateBugzillaBugsPayload): Promise<{ success: boolean; message: string; updated_count: number }> => {
    const res = await api.post('/bugzilla/bugs/bulk-update', payload);
    return res.data;
  },

  checkDuplicates: async (summary: string, projectId?: number): Promise<ApiResponse<DuplicateCandidate[]>> => {
    const res = await api.get<ApiResponse<DuplicateCandidate[]>>('/bugzilla/bugs/check-duplicates', {
      params: { summary, project_id: projectId },
    });
    return res.data;
  },

  // ── Comments ───────────────────────────────────────────────────────────────
  getComments: async (bugId: number): Promise<ApiResponse<BugzillaComment[]>> => {
    const res = await api.get<ApiResponse<BugzillaComment[]>>(`/bugzilla/bugs/${bugId}/comments`);
    return res.data;
  },

  addComment: async (bugId: number, comment: string, isPrivate: boolean = false): Promise<ApiResponse<BugzillaComment>> => {
    const res = await api.post<ApiResponse<BugzillaComment>>(`/bugzilla/bugs/${bugId}/comments`, {
      comment,
      is_private: isPrivate,
    });
    return res.data;
  },

  // ── Attachments ────────────────────────────────────────────────────────────
  getAttachments: async (bugId: number): Promise<ApiResponse<BugzillaAttachment[]>> => {
    const res = await api.get<ApiResponse<BugzillaAttachment[]>>(`/bugzilla/bugs/${bugId}/attachments`);
    return res.data;
  },

  uploadAttachment: async (bugId: number, file: File, description?: string): Promise<ApiResponse<BugzillaAttachment>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    const res = await api.post<ApiResponse<BugzillaAttachment>>(`/bugzilla/bugs/${bugId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  deleteAttachment: async (attachmentId: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/bugzilla/attachments/${attachmentId}`);
    return res.data;
  },

  // ── Dependencies ───────────────────────────────────────────────────────────
  getDependencies: async (bugId: number): Promise<ApiResponse<BugzillaDependency[]>> => {
    const res = await api.get<ApiResponse<BugzillaDependency[]>>(`/bugzilla/bugs/${bugId}/dependencies`);
    return res.data;
  },

  addDependency: async (
    bugId: number,
    dependsOnBugId: number,
    relationshipType: 'depends_on' | 'blocks' = 'depends_on'
  ): Promise<ApiResponse<BugzillaDependency>> => {
    const res = await api.post<ApiResponse<BugzillaDependency>>(`/bugzilla/bugs/${bugId}/dependencies`, {
      depends_on_bug_id: dependsOnBugId,
      relationship_type: relationshipType,
    });
    return res.data;
  },

  deleteDependency: async (dependencyId: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/bugzilla/dependencies/${dependencyId}`);
    return res.data;
  },

  // ── History & Audit ────────────────────────────────────────────────────────
  getHistory: async (bugId: number): Promise<ApiResponse<BugzillaHistory[]>> => {
    const res = await api.get<ApiResponse<BugzillaHistory[]>>(`/bugzilla/bugs/${bugId}/history`);
    return res.data;
  },

  // ── Watchers ───────────────────────────────────────────────────────────────
  toggleWatch: async (bugId: number): Promise<{ success: boolean; watching: boolean; message: string }> => {
    const res = await api.post(`/bugzilla/bugs/${bugId}/watch`);
    return res.data;
  },

  // ── Saved Searches ─────────────────────────────────────────────────────────
  getSavedSearches: async (): Promise<ApiResponse<BugzillaSavedSearch[]>> => {
    const res = await api.get<ApiResponse<BugzillaSavedSearch[]>>('/bugzilla/saved-searches');
    return res.data;
  },

  createSavedSearch: async (payload: { name: string; criteria: Record<string, any>; is_shared?: boolean }): Promise<ApiResponse<BugzillaSavedSearch>> => {
    const res = await api.post<ApiResponse<BugzillaSavedSearch>>('/bugzilla/saved-searches', payload);
    return res.data;
  },

  deleteSavedSearch: async (id: number): Promise<ApiResponse<null>> => {
    const res = await api.delete<ApiResponse<null>>(`/bugzilla/saved-searches/${id}`);
    return res.data;
  },

  // ── Reports & Overview ─────────────────────────────────────────────────────
  getReports: async (params?: { portal_project_id?: number }): Promise<ApiResponse<BugzillaReportData>> => {
    const res = await api.get<ApiResponse<BugzillaReportData>>('/bugzilla/reports', { params });
    return res.data;
  },
};
