"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  CustomizationSettings,
  DEFAULT_CUSTOMIZATION_SETTINGS,
  customizationApi,
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

    // 2. Header & Sidebar Colors
    root.style.setProperty("--portal-header-bg", conf.header_bg_color || "#56348f");
    root.style.setProperty("--portal-header-text", conf.header_text_color || "#ffffff");
    root.style.setProperty("--portal-sidebar-bg", conf.sidebar_bg_color || "#0e2638");

    // 3. Primary / Accent Color
    root.style.setProperty("--portal-primary-color", conf.primary_color || "#56348f");

    // 4. Font Sizes & Scales
    root.style.setProperty("--portal-body-size", conf.body_font_size || "13px");
    root.style.setProperty("--portal-desc-size", conf.description_font_size || "12px");

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
    root.style.setProperty("--portal-heading-scale", headingMultiplier);
  }, []);

  // Fetch settings from API on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const serverSettings = await customizationApi.getSettings();
        if (isMounted && serverSettings) {
          const merged = { ...DEFAULT_CUSTOMIZATION_SETTINGS, ...serverSettings };
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
    const updated = { ...settings, ...(res.settings || newSettings) };
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
