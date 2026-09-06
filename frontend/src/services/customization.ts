import api from "./api";

export interface CustomizationSettings {
  id?: number;
  font_family: string;
  header_bg_color: string;
  header_text_color: string;
  sidebar_bg_color: string;
  header_subtitle?: string;
  primary_color: string;
  body_font_size: string;
  heading_scale: "compact" | "normal" | "large" | "extra-large";
  description_font_size: string;
  page_title_base: string;
  page_title_format: string;
  favicon_url?: string;
  logo_url?: string;
  border_radius?: string;
  sub_header_bg?: string;
  sub_header_active_color?: string;
  login_heading?: string;
  login_subheading?: string;
  title_separator?: string;
  extra_colors?: Record<string, string> | null;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CUSTOMIZATION_SETTINGS: CustomizationSettings = {
  font_family: "Proxima Nova",
  header_bg_color: "#56348f",
  header_text_color: "#ffffff",
  sidebar_bg_color: "#0e2638",
  header_subtitle: "PERFECTION AT ITS FINEST",
  primary_color: "#56348f",
  body_font_size: "13px",
  heading_scale: "normal",
  description_font_size: "12px",
  page_title_base: "Inter Smart",
  page_title_format: "{title} | {pagename}",
  favicon_url: "/icon.png",
  logo_url: "/logo.png",
  border_radius: "12px",
  sub_header_bg: "#ffffff",
  sub_header_active_color: "#56348f",
  login_heading: "Sign in to your workplace",
  login_subheading: "Perfection at its finest. Workforce management portal",
  title_separator: "|",
  extra_colors: null,
};

export const customizationApi = {
  getSettings: async (): Promise<CustomizationSettings> => {
    const res = await api.get("/customization/settings");
    return res.data?.settings || DEFAULT_CUSTOMIZATION_SETTINGS;
  },

  updateSettings: async (payload: Partial<CustomizationSettings>): Promise<{ message: string; settings: CustomizationSettings }> => {
    const res = await api.post("/customization/settings", payload);
    return res.data;
  },

  resetSettings: async (): Promise<{ message: string; settings: CustomizationSettings }> => {
    const res = await api.post("/customization/reset");
    return res.data;
  },
};
