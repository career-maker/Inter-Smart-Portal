import api from "./api";

export interface CustomizationSettings {
  id?: number;
  font_family: string;
  header_bg_color: string;
  header_text_color: string;
  sidebar_bg_color: string;
  header_subtitle?: string;
  show_header_subtitle?: boolean;
  sidebar_active_color?: string;
  card_elevation?: "flat" | "subtle" | "floating" | "glassmorphic";
  button_style?: "rounded" | "pill" | "sharp";
  density?: "compact" | "comfortable" | "spacious";
  footer_copyright?: string;
  primary_color: string;
  body_font_size: string;
  heading_scale: "compact" | "normal" | "large" | "extra-large";
  description_font_size: string;
  page_title_base: string;
  page_title_format: string;
  favicon_url?: string;
  logo_url?: string;
  welcome_banner_url?: string;
  welcome_banner_media_type?: "image" | "video";
  login_bg_video_url?: string;
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
  show_header_subtitle: true,
  sidebar_active_color: "#133249",
  card_elevation: "subtle",
  button_style: "rounded",
  density: "comfortable",
  footer_copyright: "© 2026 Inter Smart. All rights reserved.",
  primary_color: "#56348f",
  body_font_size: "12px",
  heading_scale: "normal",
  description_font_size: "13px",
  page_title_base: "Inter Smart",
  page_title_format: "{title} | {pagename}",
  favicon_url: "/icon.png",
  logo_url: "/logo.png",
  welcome_banner_url: "/welcome-banner-bg.jpg",
  welcome_banner_media_type: "image",
  login_bg_video_url: "/videos/login-bg.mp4",
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

  uploadAsset: async (file: File, type?: "favicon" | "logo" | "welcome_banner" | "login_bg_video" | "welcome_banner_video"): Promise<{ success: boolean; url: string; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    if (type) formData.append("type", type);
    const res = await api.post("/customization/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  resetSettings: async (): Promise<{ message: string; settings: CustomizationSettings }> => {
    const res = await api.post("/customization/reset");
    return res.data;
  },
};

/**
 * Resolve customization asset URLs (favicons, logos, welcome banners, videos) whether they are data URLs,
 * local frontend static assets, or uploaded backend files.
 */
export function resolveCustomizationAssetUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Local static files in frontend public/ directory
  if (
    url === "/icon.png" ||
    url === "/logo.png" ||
    url === "/logo-dark.png" ||
    url === "/favicon.ico" ||
    url === "/welcome-banner-bg.jpg" ||
    url.startsWith("/videos/") ||
    url.startsWith("/icons/")
  ) {
    return url;
  }
  // Uploaded assets on the backend server
  const rawApi = process.env.NEXT_PUBLIC_API_URL || "https://workplace.intersmart.in/api";
  const backendBase = rawApi.replace(/\/api\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
}
