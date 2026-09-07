"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  CustomizationSettings,
  DEFAULT_CUSTOMIZATION_SETTINGS,
  customizationApi,
  resolveCustomizationAssetUrl,
} from "@/services/customization";

interface CustomizationContextValue {
  settings: CustomizationSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<CustomizationSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  setPreviewSettings: (preview: Partial<CustomizationSettings>) => void;
  resetPreview: () => void;
}

const CustomizationContext = createContext<CustomizationContextValue | undefined>(undefined);

const GOOGLE_FONTS_MAP: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
  Roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
  Poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
  Montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
  "Open Sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap",
  Lato: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",
  Nunito: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap",
  "DM Sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap",
};

const LOCAL_STORAGE_KEY = "intersmart_portal_customization";

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          return { ...DEFAULT_CUSTOMIZATION_SETTINGS, ...JSON.parse(cached) };
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    return DEFAULT_CUSTOMIZATION_SETTINGS;
  });

  const [activeSettings, setActiveSettings] = useState<CustomizationSettings>(settings);
  const [loading, setLoading] = useState(true);

  // Apply CSS Variables & Fonts to document root
  const applyStyles = useCallback((conf: CustomizationSettings) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 1. Font Family & Google Font Link injection
    const fontName = conf.font_family || "Proxima Nova";
    const fontValue = fontName === "Proxima Nova"
      ? '"Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : `"${fontName}", "Proxima Nova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    root.style.setProperty("--portal-font-family", fontValue);

    if (GOOGLE_FONTS_MAP[fontName]) {
      const linkId = `google-font-${fontName.toLowerCase().replace(/\s+/g, "-")}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = GOOGLE_FONTS_MAP[fontName];
        document.head.appendChild(link);
      }
    }

    // 2. Header, Sidebar & Brand Colors (Green / Teal System)
    const headerBg = conf.header_bg_color || "#0F766E";
    const headerText = conf.header_text_color || "#FFFFFF";
    const primaryColor = conf.primary_color || headerBg || "#0F766E";
    const hoverColor = conf.hover_color || "#138A80";
    const activeColor = conf.active_color || "#14A092";
    const darkTextColor = conf.dark_text_color || "#093E3A";
    const lightBg = conf.light_bg_color || "#E6F8F6";
    const cardBg = conf.card_bg_color || "#F2FCFB";
    const borderColor = conf.border_color || "#CBEFEA";
    const sidebarBg = conf.sidebar_bg_color || "#093E3A";
    const sidebarHover = conf.sidebar_hover_color || hoverColor;
    const sidebarActive = conf.sidebar_active_color || activeColor;

    root.style.setProperty("--portal-header-bg", headerBg);
    root.style.setProperty("--portal-header-text", headerText);
    root.style.setProperty("--portal-sidebar-bg", sidebarBg);
    root.style.setProperty("--portal-sidebar-hover", sidebarHover);
    root.style.setProperty("--portal-sidebar-active", sidebarActive);

    // 3. Primary / Accent & Semantic Color Palette
    root.style.setProperty("--portal-primary-color", primaryColor);
    root.style.setProperty("--portal-hover-color", hoverColor);
    root.style.setProperty("--portal-active-color", activeColor);
    root.style.setProperty("--portal-dark-text", darkTextColor);
    root.style.setProperty("--portal-light-bg", lightBg);
    root.style.setProperty("--portal-card-bg", cardBg);
    root.style.setProperty("--portal-border-color", borderColor);

    // 4. Update core theme tokens for Tailwind & Semantic components
    root.style.setProperty("--background", lightBg);
    root.style.setProperty("--card", cardBg);
    root.style.setProperty("--border", borderColor);
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--foreground", darkTextColor);

    // 5. Font Sizes & Scales
    const bodySize = conf.body_font_size ? (conf.body_font_size.endsWith("px") ? conf.body_font_size : `${conf.body_font_size}px`) : "12px";
    const descSize = conf.description_font_size ? (conf.description_font_size.endsWith("px") ? conf.description_font_size : `${conf.description_font_size}px`) : "13px";
    root.style.setProperty("--portal-body-size", bodySize);
    root.style.setProperty("--portal-desc-size", descSize);

    let headingMultiplier = "1";
    switch (conf.heading_scale) {
      case "compact":
        headingMultiplier = "0.9";
        break;
      case "large":
        headingMultiplier = "1.15";
        break;
      case "extra-large":
        headingMultiplier = "1.3";
        break;
      default:
        headingMultiplier = "1";
    }
    root.style.setProperty("--portal-heading-multiplier", headingMultiplier);
    // 6. Border Radius & Component Styling
    root.style.setProperty("--portal-radius", conf.border_radius || "12px");

    // 7. Sub-header Navigation Colors
    root.style.setProperty("--portal-sub-header-bg", conf.sub_header_bg || "#ffffff");
    root.style.setProperty("--portal-sub-header-active", conf.sub_header_active_color || primaryColor);

    // 8. Card Elevation & Button Style
    const elevationMap = {
      flat: "none",
      subtle: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
      floating: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
      glassmorphic: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
    };
    root.style.setProperty("--portal-card-shadow", elevationMap[conf.card_elevation || "subtle"] || elevationMap.subtle);

    const btnRadius = conf.button_style === "pill" ? "9999px" : conf.button_style === "sharp" ? "2px" : (conf.border_radius || "12px");
    root.style.setProperty("--portal-btn-radius", btnRadius);

    // 9. Dynamic Favicon Injection (Resolves backend upload paths & updates links in place without removing React 19 fiber nodes)
    const rawFavicon = conf.favicon_url || "/icon.png";
    const resolvedFavicon = resolveCustomizationAssetUrl(rawFavicon) || "/icon.png";
    const cacheBuster = resolvedFavicon.startsWith("data:")
      ? ""
      : resolvedFavicon.includes("?")
      ? `&v=${Date.now()}`
      : `?v=${Date.now()}`;
    const finalFaviconUrl = `${resolvedFavicon}${cacheBuster}`;

    let iconLink = document.getElementById("portal-dynamic-favicon") as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.id = "portal-dynamic-favicon";
      iconLink.rel = "icon";
      iconLink.type = "image/png";
      document.head.appendChild(iconLink);
    }
    iconLink.href = finalFaviconUrl;

    let shortcutLink = document.getElementById("portal-dynamic-shortcut-icon") as HTMLLinkElement | null;
    if (!shortcutLink) {
      shortcutLink = document.createElement("link");
      shortcutLink.id = "portal-dynamic-shortcut-icon";
      shortcutLink.rel = "shortcut icon";
      shortcutLink.type = "image/png";
      document.head.appendChild(shortcutLink);
    }
    shortcutLink.href = finalFaviconUrl;

    let appleLink = document.getElementById("portal-dynamic-apple-icon") as HTMLLinkElement | null;
    if (!appleLink) {
      appleLink = document.createElement("link");
      appleLink.id = "portal-dynamic-apple-icon";
      appleLink.rel = "apple-touch-icon";
      appleLink.href = finalFaviconUrl;
      document.head.appendChild(appleLink);
    }
    appleLink.href = finalFaviconUrl;

    // 10. Dashboard Welcome Banner Background Image CSS Variable
    const rawBanner = conf.welcome_banner_url || "/welcome-banner-bg.jpg";
    const resolvedBanner = resolveCustomizationAssetUrl(rawBanner) || "/welcome-banner-bg.jpg";
    root.style.setProperty("--portal-welcome-banner", `url('${resolvedBanner}')`);
  }, []);

  // Fetch settings from API on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const serverSettings = await customizationApi.getSettings();
        if (isMounted && serverSettings) {
          let cachedParsed: Partial<CustomizationSettings> = {};
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (cached) cachedParsed = JSON.parse(cached);
          } catch (e) {}

          const merged: CustomizationSettings = {
            ...DEFAULT_CUSTOMIZATION_SETTINGS,
            ...cachedParsed,
            ...serverSettings,
            // Keep user selected banner if server returned default or empty
            welcome_banner_url:
              (serverSettings.welcome_banner_url && serverSettings.welcome_banner_url !== "/welcome-banner-bg.jpg")
                ? serverSettings.welcome_banner_url
                : (cachedParsed.welcome_banner_url || serverSettings.welcome_banner_url || DEFAULT_CUSTOMIZATION_SETTINGS.welcome_banner_url),
          };
          setSettings(merged);
          setActiveSettings(merged);
          applyStyles(merged);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Failed to load portal customization settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [applyStyles]);

  // Initial style apply from initial state
  useEffect(() => {
    applyStyles(activeSettings);
  }, [activeSettings, applyStyles]);

  // Update settings via API and persist
  const updateSettings = async (newSettings: Partial<CustomizationSettings>) => {
    const res = await customizationApi.updateSettings(newSettings);
    const updated: CustomizationSettings = {
      ...settings,
      ...newSettings,
      ...(res.settings || {}),
      welcome_banner_url: newSettings.welcome_banner_url ?? res.settings?.welcome_banner_url ?? settings.welcome_banner_url,
      welcome_banner_media_type: newSettings.welcome_banner_media_type ?? res.settings?.welcome_banner_media_type ?? settings.welcome_banner_media_type,
      login_bg_video_url: newSettings.login_bg_video_url ?? res.settings?.login_bg_video_url ?? settings.login_bg_video_url,
      sidebar_hover_color: newSettings.sidebar_hover_color ?? res.settings?.sidebar_hover_color ?? settings.sidebar_hover_color,
      hover_color: newSettings.hover_color ?? res.settings?.hover_color ?? settings.hover_color,
      active_color: newSettings.active_color ?? res.settings?.active_color ?? settings.active_color,
      dark_text_color: newSettings.dark_text_color ?? res.settings?.dark_text_color ?? settings.dark_text_color,
      light_bg_color: newSettings.light_bg_color ?? res.settings?.light_bg_color ?? settings.light_bg_color,
      card_bg_color: newSettings.card_bg_color ?? res.settings?.card_bg_color ?? settings.card_bg_color,
      border_color: newSettings.border_color ?? res.settings?.border_color ?? settings.border_color,
    };
    setSettings(updated);
    setActiveSettings(updated);
    applyStyles(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  // Reset settings to defaults
  const resetSettings = async () => {
    const res = await customizationApi.resetSettings();
    const reset = res.settings || DEFAULT_CUSTOMIZATION_SETTINGS;
    setSettings(reset);
    setActiveSettings(reset);
    applyStyles(reset);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reset));
    } catch (e) {}
  };

  // Real-time preview without saving
  const setPreviewSettings = (preview: Partial<CustomizationSettings>) => {
    const merged = { ...activeSettings, ...preview };
    setActiveSettings(merged);
    applyStyles(merged);
  };

  const resetPreview = () => {
    setActiveSettings(settings);
    applyStyles(settings);
  };

  return (
    <CustomizationContext.Provider
      value={{
        settings: activeSettings,
        loading,
        updateSettings,
        resetSettings,
        setPreviewSettings,
        resetPreview,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error("useCustomization must be used within a CustomizationProvider");
  }
  return context;
}
