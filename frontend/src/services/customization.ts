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
  sidebar_hover_color?: string;
  hover_color?: string;
  active_color?: string;
  dark_text_color?: string;
  light_bg_color?: string;
  card_bg_color?: string;
  border_color?: string;
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
  header_bg_color: "#0F766E",
  header_text_color: "#FFFFFF",
  sidebar_bg_color: "#093E3A",
  header_subtitle: "PERFECTION AT ITS FINEST",
  show_header_subtitle: true,
  sidebar_active_color: "#14A092",
  sidebar_hover_color: "#138A80",
  hover_color: "#138A80",
  active_color: "#14A092",
  dark_text_color: "#093E3A",
  light_bg_color: "#E6F8F6",
  card_bg_color: "#F2FCFB",
  border_color: "#CBEFEA",
  card_elevation: "subtle",
  button_style: "rounded",
  density: "comfortable",
  footer_copyright: "© 2026 Inter Smart. All rights reserved.",
  primary_color: "#0F766E",
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
  sub_header_active_color: "#0F766E",
  login_heading: "Sign in to your workplace",
  login_subheading: "Perfection at its finest. Workforce management portal",
  title_separator: "|",
  extra_colors: null,
};

export function normalizeCustomizationSettings(raw?: any): CustomizationSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CUSTOMIZATION_SETTINGS };
  }

  const extra = raw.extra_colors && typeof raw.extra_colors === "object" ? raw.extra_colors : {};

  return {
    ...DEFAULT_CUSTOMIZATION_SETTINGS,
    ...raw,
    // Preserve header, primary, and subheader colors explicitly
    header_bg_color:
      raw.header_bg_color ||
      extra.header_bg_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.header_bg_color,
    primary_color:
      raw.primary_color ||
      extra.primary_color ||
      raw.header_bg_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.primary_color,
    header_text_color:
      raw.header_text_color ||
      extra.header_text_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.header_text_color,
    sub_header_bg:
      raw.sub_header_bg ||
      extra.sub_header_bg ||
      DEFAULT_CUSTOMIZATION_SETTINGS.sub_header_bg,
    sub_header_active_color:
      raw.sub_header_active_color ||
      extra.sub_header_active_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.sub_header_active_color,
    sidebar_active_color:
      raw.sidebar_active_color ||
      extra.sidebar_active_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.sidebar_active_color,
    // Map legacy dark navy sidebar colors to the unified Green / Teal palette (#093E3A)
    sidebar_bg_color:
      (!raw.sidebar_bg_color || raw.sidebar_bg_color === "#071724" || raw.sidebar_bg_color === "#0e2638" || raw.sidebar_bg_color === "#0b1a2b")
        ? (DEFAULT_CUSTOMIZATION_SETTINGS.sidebar_bg_color || "#093E3A")
        : raw.sidebar_bg_color,
    // Flatten any values stored inside extra_colors (used as database fallback)
    login_bg_video_url:
      raw.login_bg_video_url ||
      extra.login_bg_video_url ||
      DEFAULT_CUSTOMIZATION_SETTINGS.login_bg_video_url,
    welcome_banner_url:
      raw.welcome_banner_url ||
      extra.welcome_banner_url ||
      DEFAULT_CUSTOMIZATION_SETTINGS.welcome_banner_url,
    welcome_banner_media_type:
      raw.welcome_banner_media_type ||
      extra.welcome_banner_media_type ||
      DEFAULT_CUSTOMIZATION_SETTINGS.welcome_banner_media_type,
    sidebar_hover_color:
      raw.sidebar_hover_color ||
      extra.sidebar_hover_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.sidebar_hover_color,
    hover_color:
      raw.hover_color ||
      extra.hover_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.hover_color,
    active_color:
      raw.active_color ||
      extra.active_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.active_color,
    dark_text_color:
      raw.dark_text_color ||
      extra.dark_text_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.dark_text_color,
    light_bg_color:
      raw.light_bg_color ||
      extra.light_bg_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.light_bg_color,
    card_bg_color:
      raw.card_bg_color ||
      extra.card_bg_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.card_bg_color,
    border_color:
      raw.border_color ||
      extra.border_color ||
      DEFAULT_CUSTOMIZATION_SETTINGS.border_color,
  };
}

export const customizationApi = {
  getSettings: async (): Promise<CustomizationSettings> => {
    const res = await api.get(`/customization/settings?_t=${Date.now()}`);
    return normalizeCustomizationSettings(res.data?.settings);
  },

  updateSettings: async (payload: Partial<CustomizationSettings>): Promise<{ message: string; settings: CustomizationSettings }> => {
    const res = await api.post("/customization/settings", payload);
    return {
      message: res.data?.message || "Settings updated successfully",
      settings: normalizeCustomizationSettings(res.data?.settings || payload),
    };
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
    return {
      message: res.data?.message || "Settings reset to defaults",
      settings: normalizeCustomizationSettings(res.data?.settings),
    };
  },
};

/**
 * Resolve customization asset URLs (favicons, logos, welcome banners, videos) whether they are data URLs,
 * local frontend static assets, or uploaded backend files.
 */
export function resolveCustomizationAssetUrl(url?: string | null): string {
  if (!url) return "";

  // 1. Data URLs or blob URLs
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // 2. Full HTTP(S) URLs
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Fix workplace.intersmart.in single /api/uploads/ to /api/api/uploads/
    if (url.includes("workplace.intersmart.in/api/uploads/customization/")) {
      return url.replace(
        "workplace.intersmart.in/api/uploads/customization/",
        "workplace.intersmart.in/api/api/uploads/customization/"
      );
    }
    // Fix workplace.intersmart.in root /uploads/customization/ to /api/api/uploads/
    if (url.includes("workplace.intersmart.in/uploads/customization/")) {
      return url.replace(
        "workplace.intersmart.in/uploads/customization/",
        "workplace.intersmart.in/api/api/uploads/customization/"
      );
    }
    return url;
  }

  // 3. Local static files in frontend public/ directory
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

  // 4. Uploaded assets on the backend server
  const rawApi = process.env.NEXT_PUBLIC_API_URL || "https://workplace.intersmart.in/api";
  let backendBase = rawApi.replace(/\/+$/, "");

  // On cPanel production, Laravel API is routed through https://workplace.intersmart.in/api/api/
  if (backendBase.includes("workplace.intersmart.in")) {
    backendBase = "https://workplace.intersmart.in/api/api";
  }

  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
}
