import api from "./api";

export interface StickyNote {
  id: number;
  user_id: number;
  title: string;
  content: string;
  color: "amber" | "emerald" | "sky" | "rose" | "purple" | "slate" | string;
  is_pinned: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStickyNoteInput {
  title?: string;
  content?: string;
  color?: string;
  is_pinned?: boolean;
}

export interface UpdateStickyNoteInput {
  title?: string;
  content?: string;
  color?: string;
  is_pinned?: boolean;
  order_index?: number;
}

export const stickyNotesService = {
  async getNotes(): Promise<StickyNote[]> {
    const response = await api.get<{ success: boolean; data: StickyNote[] }>("/sticky-notes");
    return response.data?.data || [];
  },

  async createNote(input: CreateStickyNoteInput): Promise<StickyNote> {
    const response = await api.post<{ success: boolean; data: StickyNote }>("/sticky-notes", input);
    return response.data.data;
  },

  async updateNote(id: number, input: UpdateStickyNoteInput): Promise<StickyNote> {
    const response = await api.put<{ success: boolean; data: StickyNote }>(`/sticky-notes/${id}`, input);
    return response.data.data;
  },

  async deleteNote(id: number): Promise<void> {
    await api.delete(`/sticky-notes/${id}`);
  },

  async clearAllNotes(): Promise<void> {
    await api.delete("/sticky-notes/clear");
  },
};
