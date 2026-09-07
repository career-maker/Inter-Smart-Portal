"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Palette,
  Type,
  Layout,
  Maximize2,
  Sliders,
  Globe,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
  Check,
  Eye,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Bookmark,
  Bell,
  Rocket,
  Image as ImageIcon,
  Upload,
  Layers,
  Square,
  LogIn as LogInIcon,
  Box,
  ToggleLeft,
  ToggleRight,
  Shield,
  FileText,
  Video,
  Film,
  Play,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCustomization } from "@/context/CustomizationContext";
import { CustomizationSettings, DEFAULT_CUSTOMIZATION_SETTINGS, customizationApi, resolveCustomizationAssetUrl } from "@/services/customization";

const AVAILABLE_FONTS = [
  { id: "Proxima Nova", name: "Proxima Nova (Default)", category: "Sans-serif", provider: "Built-in" },
  { id: "Inter", name: "Inter", category: "Sans-serif", provider: "Google Fonts" },
  { id: "Outfit", name: "Outfit", category: "Geometric Sans", provider: "Google Fonts" },
  { id: "Poppins", name: "Poppins", category: "Geometric Sans", provider: "Google Fonts" },
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans", category: "Modern Sans", provider: "Google Fonts" },
  { id: "Montserrat", name: "Montserrat", category: "Classic Sans", provider: "Google Fonts" },
  { id: "Roboto", name: "Roboto", category: "Neutral Sans", provider: "Google Fonts" },
  { id: "Open Sans", name: "Open Sans", category: "Humanist Sans", provider: "Google Fonts" },
  { id: "Lato", name: "Lato", category: "Balanced Sans", provider: "Google Fonts" },
  { id: "Nunito", name: "Nunito", category: "Rounded Sans", provider: "Google Fonts" },
  { id: "DM Sans", name: "DM Sans", category: "Minimalist Sans", provider: "Google Fonts" },
];

const HEADER_COLOR_PRESETS = [
  { label: "Keka Purple", hex: "#56348f" },
  { label: "Deep Indigo", hex: "#4338ca" },
  { label: "Royal Blue", hex: "#1d4ed8" },
  { label: "Ocean Blue", hex: "#0284c7" },
  { label: "Emerald Teal", hex: "#0f766e" },
  { label: "Forest Green", hex: "#15803d" },
  { label: "Dark Slate", hex: "#1e293b" },
  { label: "Obsidian Black", hex: "#0f172a" },
  { label: "Rose Crimson", hex: "#be123c" },
  { label: "Warm Maroon", hex: "#881337" },
];

const HEADER_TEXT_PRESETS = [
  { label: "Pure White", hex: "#ffffff" },
  { label: "Ice White", hex: "#f8fafc" },
  { label: "Soft Platinum", hex: "#e2e8f0" },
  { label: "Pale Gold", hex: "#fef08a" },
];

const SUB_HEADER_BG_PRESETS = [
  { label: "Clean White", hex: "#ffffff" },
  { label: "Slate Ice", hex: "#f8fafc" },
  { label: "Cool Light", hex: "#f1f5f9" },
  { label: "Purple Tint", hex: "#f5f3ff" },
  { label: "Dark Slate", hex: "#0f172a" },
  { label: "Deep Slate", hex: "#1e293b" },
];

const SUB_HEADER_ACTIVE_PRESETS = [
  { label: "Keka Purple", hex: "#56348f" },
  { label: "Deep Indigo", hex: "#4338ca" },
  { label: "Royal Blue", hex: "#2563eb" },
  { label: "Teal", hex: "#0d9488" },
  { label: "Amber", hex: "#d97706" },
  { label: "Rose", hex: "#e11d48" },
];

const SIDEBAR_COLOR_PRESETS = [
  { label: "Keka Navy", hex: "#0e2638" },
  { label: "Obsidian Dark", hex: "#0f172a" },
  { label: "Pure Dark", hex: "#000000" },
  { label: "Deep Slate", hex: "#1e293b" },
  { label: "Midnight Purple", hex: "#1e1433" },
  { label: "Forest Pine", hex: "#062c26" },
  { label: "Royal Navy", hex: "#0b1c3d" },
  { label: "Dark Burgundy", hex: "#260813" },
];

const SIDEBAR_ACTIVE_PRESETS = [
  { label: "Navy Accent", hex: "#133249" },
  { label: "Keka Purple", hex: "#56348f" },
  { label: "Royal Blue", hex: "#1d4ed8" },
  { label: "Teal Emerald", hex: "#0f766e" },
  { label: "Dark Slate", hex: "#1e293b" },
  { label: "Deep Violet", hex: "#3b1f63" },
];

const PRIMARY_COLOR_PRESETS = [
  { label: "Keka Purple", hex: "#56348f" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Sky Blue", hex: "#0284c7" },
  { label: "Teal", hex: "#0d9488" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Violet", hex: "#7c3aed" },
];

const RADIUS_OPTIONS = [
  { id: "4px", label: "4px Sharp", desc: "Enterprise & structured" },
  { id: "8px", label: "8px Subtle", desc: "Classic & refined" },
  { id: "12px", label: "12px Balanced", desc: "Modern standard (Default)" },
  { id: "16px", label: "16px Smooth", desc: "Soft & rounded app feel" },
];

const ELEVATION_OPTIONS = [
  { id: "flat", label: "Flat Minimal", desc: "Crisp border, no shadow" },
  { id: "subtle", label: "Subtle Soft", desc: "Modern soft elevation (Default)" },
  { id: "floating", label: "Floating Lift", desc: "High contrast depth shadow" },
  { id: "glassmorphic", label: "Glass Effect", desc: "Translucent backdrop blur" },
];

const BUTTON_STYLES = [
  { id: "rounded", label: "Standard Rounded", desc: "Matches UI corner radius" },
  { id: "pill", label: "Capsule Pill", desc: "Rounded-full soft buttons" },
  { id: "sharp", label: "Sharp Rectangle", desc: "Crisp enterprise borders" },
];

const DENSITY_OPTIONS = [
  { id: "compact", label: "Compact", desc: "Dense data rows, tighter padding" },
  { id: "comfortable", label: "Comfortable", desc: "Standard balanced height" },
  { id: "spacious", label: "Spacious", desc: "Generous whitespace for touch" },
];

const TITLE_SEPARATORS = [
  { label: "| (Pipe)", value: "|" },
  { label: "- (Dash)", value: "-" },
  { label: "• (Bullet)", value: "•" },
  { label: "» (Chevron)", value: "»" },
  { label: "// (Slash)", value: "//" },
];

// Client-side image resizing helper with instant Data URL for immediate zero-latency preview
async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (file.type.includes("svg") || file.type.includes("ico") || file.type.includes("x-icon")) {
        return resolve({ file, dataUrl: rawDataUrl });
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/png", 0.9);
          canvas.toBlob((blob) => {
            if (blob) {
              const resized = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", {
                type: "image/png",
              });
              resolve({ file: resized, dataUrl });
            } else {
              resolve({ file, dataUrl });
            }
          }, "image/png", 0.9);
        } else {
          resolve({ file, dataUrl: rawDataUrl });
        }
      };
      img.onerror = () => resolve({ file, dataUrl: rawDataUrl });
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function CustomizationPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user?.role || "").toLowerCase() === "super admin";

  const {
    settings: currentSettings,
    updateSettings,
    resetSettings,
    setPreviewSettings,
    resetPreview,
  } = useCustomization();

  const [form, setForm] = useState<CustomizationSettings>(currentSettings);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLoginVideo, setUploadingLoginVideo] = useState(false);
  const [uploadingBannerVideo, setUploadingBannerVideo] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const bannerVideoInputRef = useRef<HTMLInputElement | null>(null);
  const loginVideoInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if external settings change
  useEffect(() => {
    setForm(currentSettings);
  }, [currentSettings]);

  // Real-time preview handler
  const handleFieldChange = <K extends keyof CustomizationSettings>(key: K, value: CustomizationSettings[K]) => {
    const updated = { ...form, [key]: value };
    setForm(updated);
    setPreviewSettings(updated);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Safe file upload handler with instant Data URL & dedicated upload API
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "favicon_url" | "logo_url" | "welcome_banner_url",
    maxDim: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "favicon_url") setUploadingFavicon(true);
    else if (field === "logo_url") setUploadingLogo(true);
    else setUploadingBanner(true);
    setErrorMessage(null);

    try {
      // 1. Optimize image client-side to prevent massive payloads and produce immediate data URL
      const { file: optimized, dataUrl } = await resizeImage(file, maxDim, maxDim);

      // 2. Instantly update UI and tab with 0ms latency
      handleFieldChange(field, dataUrl);

      // 3. Upload to server storage endpoint
      try {
        const type = field === "favicon_url" ? "favicon" : field === "logo_url" ? "logo" : "welcome_banner";
        const res = await customizationApi.uploadAsset(optimized, type);
        if (res?.url) {
          const resolved = resolveCustomizationAssetUrl(res.url);
          handleFieldChange(field, resolved);
          const label = field === "favicon_url" ? "Favicon" : field === "logo_url" ? "Logo" : "Welcome banner background";
          setSuccessMessage(`${label} uploaded and ready.`);
          return;
        }
      } catch (err: any) {
        console.warn("Customization asset upload exception, falling back to data URL:", err);
      }
    } catch (err) {
      console.error("Failed to process image:", err);
      setErrorMessage("Failed to process and optimize image. Please try another file.");
    } finally {
      if (field === "favicon_url") setUploadingFavicon(false);
      else if (field === "logo_url") setUploadingLogo(false);
      else setUploadingBanner(false);
    }
  };

  // Safe video upload handler for MP4/WebM videos (up to 50MB)
  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "login_bg_video_url" | "welcome_banner_url",
    type: "login_bg_video" | "welcome_banner_video"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("Video file exceeds the 50MB limit. Please select a smaller video.");
      return;
    }

    if (field === "login_bg_video_url") setUploadingLoginVideo(true);
    else setUploadingBannerVideo(true);
    setErrorMessage(null);

    try {
      // 1. Create immediate local object URL for 0ms preview
      const localUrl = URL.createObjectURL(file);
      handleFieldChange(field, localUrl);
      if (field === "welcome_banner_url") {
        handleFieldChange("welcome_banner_media_type", "video");
      }

      // 2. Upload video file to server
      const res = await customizationApi.uploadAsset(file, type);
      if (res?.url) {
        const resolved = resolveCustomizationAssetUrl(res.url);
        handleFieldChange(field, resolved);
      }
    } catch (err: any) {
      console.error("Failed to upload video asset:", err);
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to upload video asset.");
    } finally {
      if (field === "login_bg_video_url") setUploadingLoginVideo(false);
      else setUploadingBannerVideo(false);
    }
  };

  const handleSeparatorChange = (sep: string) => {
    const newFormat = `{title} ${sep} {pagename}`;
    const updated: CustomizationSettings = {
      ...form,
      title_separator: sep,
      page_title_format: newFormat,
    };
    setForm(updated);
    setPreviewSettings(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateSettings(form);
      setSuccessMessage("Portal customizations saved and applied universally across all screens.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save customizations.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all portal customizations back to InterSmart defaults?")) {
      return;
    }
    setResetting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await resetSettings();
      setForm(DEFAULT_CUSTOMIZATION_SETTINGS);
      setSuccessMessage("Portal customizations reset to default InterSmart branding.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to reset customization.");
    } finally {
      setResetting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-bold">Super Admin Access Only</h2>
          <p className="text-xs">Only Super Administrators have permission to modify portal branding and customizations.</p>
        </div>
      </div>
    );
  }

  // Calculate live preview browser title
  const previewTabTitle = (() => {
    let fmt = form.page_title_format || "{title} | {pagename}";
    const sep = form.title_separator || "|";
    if (form.title_separator && !fmt.includes(sep)) {
      fmt = fmt.replace(/\s*[|\-•»/]+\s*/, ` ${sep} `);
    }
    return fmt
      .replace(/\{title\}/gi, form.page_title_base || "Inter Smart")
      .replace(/\{pagename\}/gi, "Attendance Management");
  })();

  const currentFavicon = resolveCustomizationAssetUrl(form.favicon_url) || "/icon.png";
  const currentLogo = resolveCustomizationAssetUrl(form.logo_url) || "/logo.png";
  const currentWelcomeBanner = resolveCustomizationAssetUrl(form.welcome_banner_url) || "/welcome-banner-bg.jpg";
  const currentLoginBgVideo = resolveCustomizationAssetUrl(form.login_bg_video_url) || "/videos/login-bg.mp4";
  const isBannerVideo = form.welcome_banner_media_type === "video" || /\.(mp4|webm|ogg|mov)($|\?)/i.test(currentWelcomeBanner);
  const currentRadius = form.border_radius || "12px";
  const currentBtnRadius = form.button_style === "pill" ? "9999px" : form.button_style === "sharp" ? "2px" : currentRadius;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* ── Page Header (Standard Dashboard Typography) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <span>/</span>
            <Link href="/project-management/addons" className="hover:text-purple-600 dark:hover:text-purple-400">
              Add-on Modules
            </Link>
            <span>/</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">Portal Customization</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Universal Portal Customization
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Super Admin: Customize Favicon, Logos, Motto, Colors, Elevations, Border Radius, Buttons & Titles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting}
            style={{ backgroundColor: form.primary_color || "#56348f" }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
            <span>Save Customizations</span>
          </button>
        </div>
      </div>

      {/* ── Status Alerts ── */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Main Layout: Controls (Left 7 Cols) + Live Preview (Right 5 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        
        {/* ── LEFT COLUMN: Configuration Form ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. FAVICON & PORTAL LOGO BRANDING */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Favicon & Company Logo Branding</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Upload an image or specify an icon URL. Automatically optimized to prevent network errors.
                </p>
              </div>
            </div>

            {/* Favicon Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Browser Tab Favicon</span>
                  <span className="text-[10px] text-purple-600 font-normal">(Instant tab update)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingFavicon ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Upload className="w-3.5 h-3.5 text-purple-600" />}
                    <span>Upload Image</span>
                  </button>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "favicon_url", 64)}
                  />
                </div>
              </div>

              {/* Favicon Preview & URL Input */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    key={currentFavicon}
                    src={currentFavicon}
                    alt="Favicon"
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={form.favicon_url || ""}
                  onChange={(e) => handleFieldChange("favicon_url", e.target.value)}
                  placeholder="/icon.png or https://.../favicon.png"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 truncate"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                {[
                  { label: "Default Purple Mark", url: "/icon.png" },
                  { label: "Classic Favicon", url: "/favicon.ico" },
                ].map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => handleFieldChange("favicon_url", preset.url)}
                    className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header & Brand Logo Control */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Portal Header Logo</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Used in header & drawer)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    <span>{uploadingLogo ? "Optimizing..." : "Upload Logo"}</span>
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "logo_url", 512)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={currentLogo}
                    alt="Logo preview"
                    className="h-6 w-auto object-contain brightness-0 invert"
                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                  />
                </div>
                <input
                  type="text"
                  value={form.logo_url || ""}
                  onChange={(e) => handleFieldChange("logo_url", e.target.value)}
                  placeholder="/logo.png or https://.../logo.png"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 truncate"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                {[
                  { label: "Default InterSmart", url: "/logo.png" },
                  { label: "Dark Variant", url: "/logo-dark.png" },
                ].map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => handleFieldChange("logo_url", preset.url)}
                    className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. DASHBOARD WELCOME CARD HERO BANNER (IMAGE OR VIDEO) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">
                    Dashboard Welcome Card Background (Image or Video)
                  </h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    Customize the top welcome hero card background with a high-definition image or ambient looping video.
                  </p>
                </div>
              </div>

              {/* Media Type Switcher (Image vs Video) */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange("welcome_banner_media_type", "image");
                    if (isBannerVideo && form.welcome_banner_url?.includes(".mp4")) {
                      handleFieldChange("welcome_banner_url", "/welcome-banner-bg.jpg");
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    !isBannerVideo
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Image Banner</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange("welcome_banner_media_type", "video");
                    if (!isBannerVideo) {
                      handleFieldChange("welcome_banner_url", "/videos/login-bg.mp4");
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isBannerVideo
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video Banner</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Preview of Hero Banner */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Welcome Card Live Preview</span>
                  <span className="text-[10px] text-purple-600 font-normal">
                    {isBannerVideo ? "(With ambient looping video background)" : "(With dark gradient overlay)"}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isBannerVideo) {
                        handleFieldChange("welcome_banner_url", "/videos/login-bg.mp4");
                      } else {
                        handleFieldChange("welcome_banner_url", "/welcome-banner-bg.jpg");
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Default</span>
                  </button>

                  {!isBannerVideo ? (
                    <>
                      <button
                        type="button"
                        disabled={uploadingBanner}
                        onClick={() => bannerInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Upload className="w-3.5 h-3.5 text-purple-600" />}
                        <span>{uploadingBanner ? "Processing..." : "Upload Image"}</span>
                      </button>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "welcome_banner_url", 1920)}
                      />
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={uploadingBannerVideo}
                        onClick={() => bannerVideoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {uploadingBannerVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Video className="w-3.5 h-3.5 text-purple-600" />}
                        <span>{uploadingBannerVideo ? "Uploading Video..." : "Upload Video (.mp4)"}</span>
                      </button>
                      <input
                        ref={bannerVideoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        className="hidden"
                        onChange={(e) => handleVideoUpload(e, "welcome_banner_url", "welcome_banner_video")}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Banner Mockup Box */}
              <div
                style={{
                  ...(!isBannerVideo
                    ? {
                        backgroundImage: `linear-gradient(to right, rgba(12, 24, 45, 0.92) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(12, 24, 45, 0.92) 100%), url('${currentWelcomeBanner}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : { backgroundColor: "#0c182d" }),
                  borderRadius: currentRadius,
                }}
                className="relative overflow-hidden p-5 sm:p-6 border border-white/20 shadow-lg min-h-[150px] flex flex-col justify-between text-white transition-all select-none"
              >
                {isBannerVideo && (
                  <>
                    <video
                      key={currentWelcomeBanner}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{ zIndex: 0 }}
                    >
                      <source src={currentWelcomeBanner} type={currentWelcomeBanner.endsWith(".webm") ? "video/webm" : "video/mp4"} />
                    </video>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(to right, rgba(12, 24, 45, 0.88) 0%, rgba(15, 23, 42, 0.65) 50%, rgba(12, 24, 45, 0.88) 100%)",
                        zIndex: 1,
                      }}
                    />
                  </>
                )}

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ zIndex: 10 }}>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Live Welcome Card Preview {isBannerVideo && "(Video Active)"}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Good Day, {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Abhiram"}
                    </h3>
                    <p className="text-xs text-slate-200/90 font-medium">
                      {form.header_subtitle || "PERFECTION AT ITS FINEST"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs font-semibold shadow-xs">
                      ● Attendance Ready
                    </span>
                  </div>
                </div>

                <div className="relative flex flex-wrap items-center justify-between text-[11px] text-slate-300/80 pt-3 border-t border-white/10 mt-3" style={{ zIndex: 10 }}>
                  <span>
                    Current {isBannerVideo ? "Video" : "Image"}:{" "}
                    <strong className="text-white font-mono">
                      {currentWelcomeBanner.length > 40 ? currentWelcomeBanner.substring(0, 38) + "..." : currentWelcomeBanner}
                    </strong>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isBannerVideo ? "Video formats: MP4, WebM (up to 50MB)" : "Image formats: PNG, JPG, WebP (1920×1080)"}
                  </span>
                </div>
              </div>

              {/* Direct Path / URL Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isBannerVideo ? "Video Path or Direct MP4 URL" : "Image Path or Direct URL"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.welcome_banner_url || ""}
                    onChange={(e) => handleFieldChange("welcome_banner_url", e.target.value)}
                    placeholder={isBannerVideo ? "/videos/login-bg.mp4 or https://.../video.mp4" : "/welcome-banner-bg.jpg or https://.../image.jpg"}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 truncate"
                  />
                  {form.welcome_banner_url && form.welcome_banner_url !== (isBannerVideo ? "/videos/login-bg.mp4" : "/welcome-banner-bg.jpg") && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange("welcome_banner_url", isBannerVideo ? "/videos/login-bg.mp4" : "/welcome-banner-bg.jpg")}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Curated Aesthetic Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {isBannerVideo ? "Curated Video Themes:" : "Curated Background Themes:"}
                </span>
                {!isBannerVideo ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Navy Glow (Default)", url: "/welcome-banner-bg.jpg", desc: "Original InterSmart look" },
                      { label: "Deep Indigo Mesh", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80", desc: "Vibrant cyber gradient" },
                      { label: "Obsidian Slate", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80", desc: "Dark modern fluid art" },
                      { label: "Midnight Blue", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80", desc: "Smooth dusk spectrum" },
                      { label: "Tech Grid", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=80", desc: "Subtle digital matrix" },
                      { label: "Aurora Night", url: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1920&q=80", desc: "Cosmic starry glow" },
                    ].map((preset) => {
                      const isSelected = form.welcome_banner_url === preset.url || (!form.welcome_banner_url && preset.url === "/welcome-banner-bg.jpg");
                      return (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => {
                            handleFieldChange("welcome_banner_media_type", "image");
                            handleFieldChange("welcome_banner_url", preset.url);
                          }}
                          className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? "text-purple-950 dark:text-purple-200" : "text-slate-800 dark:text-slate-200"}`}>
                              {preset.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 ml-1" />}
                          </div>
                          <span className="text-[9.5px] text-slate-400 mt-0.5 truncate">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "InterSmart Tech Loop (Default)", url: "/videos/login-bg.mp4", desc: "Ambient cyber network particles" },
                      { label: "Digital Data Flow", url: "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-charts-and-data-31911-large.mp4", desc: "Smooth futuristic HUD telemetry" },
                      { label: "Circuit Stream", url: "https://assets.mixkit.co/videos/preview/mixkit-circuit-board-and-lines-of-data-31915-large.mp4", desc: "Glowing cyber board traces" },
                    ].map((preset) => {
                      const isSelected = form.welcome_banner_url === preset.url;
                      return (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => {
                            handleFieldChange("welcome_banner_media_type", "video");
                            handleFieldChange("welcome_banner_url", preset.url);
                          }}
                          className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? "text-purple-950 dark:text-purple-200" : "text-slate-800 dark:text-slate-200"}`}>
                              {preset.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 ml-1" />}
                          </div>
                          <span className="text-[9.5px] text-slate-400 mt-0.5 truncate">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. TYPOGRAPHY & FONT FAMILY */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Portal Typography & Font Family</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Select a font family for the entire portal. Fonts are loaded instantly.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selected Font Family
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_FONTS.map((font) => {
                  const isSelected = form.font_family === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => handleFieldChange("font_family", font.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div
                          style={{ fontFamily: `"${font.id}", sans-serif` }}
                          className={`text-sm font-bold ${
                            isSelected ? "text-purple-950 dark:text-purple-200" : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {font.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {font.category} • {font.provider}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. HEADER & SUB-HEADER APPEARANCE */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Top Header & Sub-Header Tabs Styling</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Customize the top navigation bar, company slogan, sub-header category tabs, and active underlines.
                </p>
              </div>
            </div>

            {/* Header Background Color */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Header Background Color
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.header_bg_color}</span>
                  <input
                    type="color"
                    value={form.header_bg_color}
                    onChange={(e) => handleFieldChange("header_bg_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {HEADER_COLOR_PRESETS.map((preset) => {
                  const isActive = form.header_bg_color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("header_bg_color", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Header Text & Icon Color */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Header Text & Icon Color
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.header_text_color}</span>
                  <input
                    type="color"
                    value={form.header_text_color}
                    onChange={(e) => handleFieldChange("header_text_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {HEADER_TEXT_PRESETS.map((preset) => {
                  const isActive = form.header_text_color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("header_text_color", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Company Motto / Header Subtitle */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Company Slogan / Header Subtitle</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleFieldChange("show_header_subtitle", !form.show_header_subtitle)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  {form.show_header_subtitle !== false ? (
                    <ToggleRight className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  <span className="text-[11px] font-medium">{form.show_header_subtitle !== false ? "Visible" : "Hidden"}</span>
                </button>
              </div>
              <input
                type="text"
                value={form.header_subtitle || ""}
                onChange={(e) => handleFieldChange("header_subtitle", e.target.value)}
                placeholder="PERFECTION AT ITS FINEST"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase tracking-wider font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Sub-Header Tab Bar Background */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sub-Header Tab Bar Background
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.sub_header_bg || "#ffffff"}</span>
                  <input
                    type="color"
                    value={form.sub_header_bg || "#ffffff"}
                    onChange={(e) => handleFieldChange("sub_header_bg", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {SUB_HEADER_BG_PRESETS.map((preset) => {
                  const isActive = (form.sub_header_bg || "#ffffff").toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("sub_header_bg", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Header Active Tab Indicator Color */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sub-Header Active Tab Highlight & Underline
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.sub_header_active_color || "#56348f"}</span>
                  <input
                    type="color"
                    value={form.sub_header_active_color || "#56348f"}
                    onChange={(e) => handleFieldChange("sub_header_active_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {SUB_HEADER_ACTIVE_PRESETS.map((preset) => {
                  const isActive = (form.sub_header_active_color || "#56348f").toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("sub_header_active_color", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. SIDEBAR NAVIGATION MENU STYLING */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Sidebar Navigation Styling</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Configure the left navigation bar background and active menu item highlight color.
                </p>
              </div>
            </div>

            {/* Sidebar Background Color */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Side Navigation Menu Background
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.sidebar_bg_color || "#0e2638"}</span>
                  <input
                    type="color"
                    value={form.sidebar_bg_color || "#0e2638"}
                    onChange={(e) => handleFieldChange("sidebar_bg_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {SIDEBAR_COLOR_PRESETS.map((preset) => {
                  const isActive = (form.sidebar_bg_color || "#0e2638").toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("sidebar_bg_color", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Active Item Color */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Active Item Background Highlight
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.sidebar_active_color || "#133249"}</span>
                  <input
                    type="color"
                    value={form.sidebar_active_color || "#133249"}
                    onChange={(e) => handleFieldChange("sidebar_active_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {SIDEBAR_ACTIVE_PRESETS.map((preset) => {
                  const isActive = (form.sidebar_active_color || "#133249").toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("sidebar_active_color", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. UI SHAPES, ELEVATION & CORNER RADIUS */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">UI Shapes, Elevation & Corner Roundness</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Configure button shapes, card shadow elevations, and component corner roundness.
                </p>
              </div>
            </div>

            {/* Primary Accent */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Accent & CTA Color
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{form.primary_color}</span>
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {PRIMARY_COLOR_PRESETS.map((preset) => {
                  const isActive = form.primary_color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleFieldChange("primary_color", preset.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-bold ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                UI Corner Radius & Roundness
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {RADIUS_OPTIONS.map((opt) => {
                  const isSelected = (form.border_radius || "12px") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleFieldChange("border_radius", opt.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div
                        style={{ borderRadius: opt.id }}
                        className="w-8 h-8 mx-auto mb-2 border-2 border-purple-500 bg-purple-100/50 dark:bg-purple-950/50 flex items-center justify-center"
                      >
                        <span className="text-[10px] font-mono">{opt.id.replace("px", "")}</span>
                      </div>
                      <div className="text-xs">{opt.label}</div>
                      <div className="text-[9px] text-slate-400 font-normal mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Elevation & Shadow Style */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Card & Panel Shadow Elevation
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ELEVATION_OPTIONS.map((opt) => {
                  const isSelected = (form.card_elevation || "subtle") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleFieldChange("card_elevation", opt.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[9.5px] text-slate-400 font-normal mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Button Shape Style */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interactive Button Shape
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {BUTTON_STYLES.map((opt) => {
                  const isSelected = (form.button_style || "rounded") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleFieldChange("button_style", opt.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[9.5px] text-slate-400 font-normal mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. FONT SIZES & HEADING MULTIPLIERS */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Font Sizing & Scale Multipliers</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Control baseline reading comfort across cards, tables, descriptions, and headings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Body Text Size
                  </label>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {form.body_font_size}
                  </span>
                </div>
                <input
                  type="range"
                  min="11"
                  max="17"
                  step="0.5"
                  value={parseFloat(form.body_font_size) || 12}
                  onChange={(e) => handleFieldChange("body_font_size", `${e.target.value}px`)}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>11px (Compact)</span>
                  <span>12px (Default)</span>
                  <span>17px (Large)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Description & Caption Size
                  </label>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {form.description_font_size}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="15"
                  step="0.5"
                  value={parseFloat(form.description_font_size) || 13}
                  onChange={(e) => handleFieldChange("description_font_size", `${e.target.value}px`)}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10px (Subtle)</span>
                  <span>13px (Default)</span>
                  <span>15px (Prominent)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Heading Scale Multiplier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "compact", label: "Compact (0.9x)" },
                  { id: "normal", label: "Normal (1.0x)" },
                  { id: "large", label: "Large (1.15x)" },
                  { id: "extra-large", label: "Extra Large (1.3x)" },
                ].map((scale) => {
                  const isActive = form.heading_scale === scale.id;
                  return (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() => handleFieldChange("heading_scale", scale.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        isActive
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 ring-1 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {scale.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7. WORKPLACE DENSITY */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Workplace Layout Density</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Control padding density across tables, forms, cards, and activity feeds.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {DENSITY_OPTIONS.map((opt) => {
                const isSelected = (form.density || "comfortable") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleFieldChange("density", opt.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[9.5px] text-slate-400 font-normal mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. PAGE TITLE CONFIGURATION & SEPARATORS */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">Page Title & Browser Tab Format</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Configure the base portal brand title and how browser tab titles are displayed across every page.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Base Portal Title
                </label>
                <input
                  type="text"
                  value={form.page_title_base}
                  onChange={(e) => handleFieldChange("page_title_base", e.target.value)}
                  placeholder="Inter Smart"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400">Company brand name shown at the front of the browser tab.</p>
              </div>

              {/* Quick Title Separators */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Title Separator Symbol
                </label>
                <div className="flex flex-wrap gap-2">
                  {TITLE_SEPARATORS.map((sep) => {
                    const isSelected = (form.title_separator || "|") === sep.value;
                    return (
                      <button
                        key={sep.value}
                        type="button"
                        onClick={() => handleSeparatorChange(sep.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 ring-1 ring-purple-500/20"
                            : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {sep.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Title Format Template
                </label>
                <input
                  type="text"
                  value={form.page_title_format}
                  onChange={(e) => handleFieldChange("page_title_format", e.target.value)}
                  placeholder="{title} | {pagename}"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2 text-[13px] text-slate-500">
                  <span>Supported variables:</span>
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-mono text-[10px]">{`{title}`}</code>
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-mono text-[10px]">{`{pagename}`}</code>
                </div>
              </div>
            </div>
          </div>

          {/* 11. LOGIN SCREEN BACKGROUND VIDEO & LEGAL MESSAGING */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <LogInIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white box-title">
                  Login Screen Background Video & Messaging
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  Customize the full-screen background video, headline, subtitle, and footer copyright text on the login page.
                </p>
              </div>
            </div>

            {/* Login Video Customization & Live Interactive Preview */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-purple-600" />
                    <span>Login Page Background Video</span>
                    <span className="text-[10px] text-slate-400 font-normal">(MP4, WebM formats)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFieldChange("login_bg_video_url", "/videos/login-bg.mp4")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Default</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploadingLoginVideo}
                      onClick={() => loginVideoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {uploadingLoginVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Upload className="w-3.5 h-3.5 text-purple-600" />}
                      <span>{uploadingLoginVideo ? "Uploading..." : "Upload Video (.mp4)"}</span>
                    </button>
                    <input
                      ref={loginVideoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      className="hidden"
                      onChange={(e) => handleVideoUpload(e, "login_bg_video_url", "login_bg_video")}
                    />
                  </div>
                </div>

                {/* Login Screen Video Live Mockup */}
                <div
                  style={{ borderRadius: currentRadius }}
                  className="relative overflow-hidden p-6 border border-slate-800 bg-[#181d24] shadow-xl min-h-[170px] flex flex-col justify-between text-white select-none"
                >
                  <video
                    key={currentLoginBgVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ zIndex: 0 }}
                  >
                    <source src={currentLoginBgVideo} type={currentLoginBgVideo.endsWith(".webm") ? "video/webm" : "video/mp4"} />
                  </video>
                  <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-[0.5px] pointer-events-none"
                    style={{ zIndex: 1 }}
                  />

                  <div className="relative space-y-1.5 max-w-sm" style={{ zIndex: 10 }}>
                    <div className="flex items-center gap-2">
                      <img
                        src={currentLogo}
                        alt="Logo"
                        className="h-6 w-auto max-w-[120px] object-contain drop-shadow"
                      />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                        Login Live Preview
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {form.login_heading || "Sign in to your workplace"}
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {form.login_subheading || "Perfection at its finest. Workforce management portal"}
                    </p>
                  </div>

                  <div className="relative flex items-center justify-between text-[11px] text-slate-300 pt-3 border-t border-white/15 mt-3" style={{ zIndex: 10 }}>
                    <span>
                      Video: <strong className="text-white font-mono">{currentLoginBgVideo.length > 40 ? currentLoginBgVideo.substring(0, 38) + "..." : currentLoginBgVideo}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400">Looping background video</span>
                  </div>
                </div>

                {/* Direct Video URL Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Video Path or Direct MP4 URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.login_bg_video_url || ""}
                      onChange={(e) => handleFieldChange("login_bg_video_url", e.target.value)}
                      placeholder="/videos/login-bg.mp4 or https://.../video.mp4"
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 truncate"
                    />
                    {form.login_bg_video_url && form.login_bg_video_url !== "/videos/login-bg.mp4" && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange("login_bg_video_url", "/videos/login-bg.mp4")}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Curated Video Presets */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Curated Login Video Themes:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { label: "InterSmart Cyber Network (Default)", url: "/videos/login-bg.mp4", desc: "Ambient tech particle waves" },
                      { label: "Digital Telemetry Stream", url: "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-charts-and-data-31911-large.mp4", desc: "HUD and data visualizer" },
                      { label: "Futuristic Board Matrix", url: "https://assets.mixkit.co/videos/preview/mixkit-circuit-board-and-lines-of-data-31915-large.mp4", desc: "Glowing cyber traces" },
                    ].map((preset) => {
                      const isSelected = form.login_bg_video_url === preset.url || (!form.login_bg_video_url && preset.url === "/videos/login-bg.mp4");
                      return (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => handleFieldChange("login_bg_video_url", preset.url)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? "text-purple-950 dark:text-purple-200" : "text-slate-800 dark:text-slate-200"}`}>
                              {preset.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 ml-1" />}
                          </div>
                          <span className="text-[9.5px] text-slate-400 mt-0.5 truncate">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Login Headline & Subheading */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Login Headline
                  </label>
                  <input
                    type="text"
                    value={form.login_heading || ""}
                    onChange={(e) => handleFieldChange("login_heading", e.target.value)}
                    placeholder="Sign in to your workplace"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Login Subheading / Workplace Motto
                  </label>
                  <textarea
                    rows={2}
                    value={form.login_subheading || ""}
                    onChange={(e) => handleFieldChange("login_subheading", e.target.value)}
                    placeholder="Perfection at its finest. Workforce management portal"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Footer Copyright & Legal Notice
                  </label>
                  <input
                    type="text"
                    value={form.footer_copyright || ""}
                    onChange={(e) => handleFieldChange("footer_copyright", e.target.value)}
                    placeholder="© 2026 Inter Smart. All rights reserved."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Info Box */}
          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-300 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Instant Universal Application</span>
            </div>
            <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
              When saved, all favicon changes, logos, custom colors, typography, border radius, and title formats are broadcasted universally. Every employee screen and browser tab updates automatically!
            </p>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Interactive Live Preview Container (Full Column Height for Complete Sticky Travel) ── */}
        <div className="lg:col-span-5 relative w-full">
          <div
            style={{ top: "116px", position: "sticky" }}
            className="sticky top-[116px] space-y-2.5 z-20"
          >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Real-Time Live Preview</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                📌 Always Visible
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Interactive</span>
              </span>
            </div>
          </div>

          {/* Browser Tab Window Mockup */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xl space-y-0 max-h-[calc(100vh-160px)] flex flex-col">
            {/* Chrome Bar */}
            <div className="bg-slate-100 dark:bg-slate-800/90 px-3.5 py-2 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>

              {/* Tab Item with Dynamic Favicon */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-t-lg border-t border-x border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate shadow-xs">
                <img
                  src={currentFavicon}
                  alt="Favicon"
                  className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
                <span className="truncate">{previewTabTitle}</span>
              </div>
            </div>

            {/* Mockup Frame with Side Menu & Header */}
            <div className="flex flex-row overflow-hidden">
              {/* Miniature Side Menu */}
              <div
                style={{
                  backgroundColor: form.sidebar_bg_color || "#0e2638",
                  fontFamily: `"${form.font_family}", sans-serif`,
                }}
                className="w-12 shrink-0 border-r border-white/10 flex flex-col items-center py-2.5 gap-2 transition-colors select-none"
              >
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center mb-0.5">
                  <Palette className="w-3 h-3 text-white" />
                </div>
                {/* Active Menu Item respecting sidebar_active_color */}
                <div
                  style={{ backgroundColor: form.sidebar_active_color || "#133249" }}
                  className="w-7 h-7 rounded-lg flex flex-col items-center justify-center text-[8px] text-white font-bold transition-colors"
                >
                  <span>Home</span>
                </div>
                <div className="w-7 h-7 rounded-lg hover:bg-white/10 flex flex-col items-center justify-center text-[8px] text-slate-300">
                  <span>Leaves</span>
                </div>
                <div className="w-7 h-7 rounded-lg hover:bg-white/10 flex flex-col items-center justify-center text-[8px] text-slate-300">
                  <span>WFH</span>
                </div>
                <div className="w-7 h-7 rounded-lg hover:bg-white/10 flex flex-col items-center justify-center text-[8px] text-slate-300">
                  <span>Projects</span>
                </div>
                <div className="mt-auto w-5 h-5 rounded-full bg-purple-600/60 flex items-center justify-center text-[7.5px] text-white font-bold">
                  SA
                </div>
              </div>

              {/* Main Preview Column (Header + SubHeader + Body) */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Mockup Top Header */}
                <div
                  style={{
                    backgroundColor: form.header_bg_color,
                    color: form.header_text_color,
                    fontFamily: `"${form.font_family}", sans-serif`,
                  }}
                  className="px-3 py-2 flex items-center justify-between transition-colors shadow-inner border-b border-black/10 shrink-0"
                >
                  <div className="flex flex-col min-w-0">
                    <img
                      src={currentLogo}
                      alt="Logo"
                      className="h-4.5 w-auto brightness-0 invert object-contain object-left max-w-[90px]"
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                    />
                    {form.show_header_subtitle !== false && form.header_subtitle && (
                      <span className="text-[6.5px] tracking-widest uppercase opacity-75 font-semibold leading-none mt-0.5 truncate">
                        {form.header_subtitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="hidden sm:flex items-center gap-1.5 bg-white/15 px-2 py-0.5 rounded-md text-[10px] backdrop-blur-xs">
                      <Search className="w-3 h-3" style={{ color: form.header_text_color }} />
                      <span className="text-[10px]" style={{ color: form.header_text_color, opacity: 0.85 }}>Search</span>
                    </div>
                    {/* Header Action Icons */}
                    <div className="flex items-center gap-1" style={{ color: form.header_text_color }}>
                      <Rocket className="w-3 h-3" style={{ color: form.header_text_color }} />
                      <Bookmark className="w-3 h-3" style={{ color: form.header_text_color }} />
                      <Bell className="w-3 h-3" style={{ color: form.header_text_color }} />
                    </div>
                    <div
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: form.header_text_color,
                        borderColor: form.header_text_color,
                      }}
                      className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold border border-opacity-30"
                    >
                      Logout
                    </div>
                  </div>
                </div>

                {/* Mockup Sub-Header Tabs Bar */}
                <div
                  style={{
                    backgroundColor: form.sub_header_bg || "#ffffff",
                    fontFamily: `"${form.font_family}", sans-serif`,
                  }}
                  className="px-3 flex items-center gap-3.5 h-7 border-b border-slate-200 dark:border-slate-800 transition-colors text-[9.5px] font-semibold overflow-hidden shrink-0"
                >
                  <div
                    style={{
                      color: form.sub_header_active_color || "#56348f",
                      borderBottom: `2px solid ${form.sub_header_active_color || "#56348f"}`,
                    }}
                    className="h-full flex items-center px-0.5 uppercase tracking-wider"
                  >
                    Attendance
                  </div>
                  <div className="text-slate-500 h-full flex items-center px-0.5 uppercase tracking-wider hover:text-slate-800">
                    Timelog
                  </div>
                  <div className="text-slate-500 h-full flex items-center px-0.5 uppercase tracking-wider hover:text-slate-800">
                    Shifts
                  </div>
                </div>

                {/* Mockup Portal Body Content */}
                <div
                  style={{
                    fontFamily: `"${form.font_family}", sans-serif`,
                  }}
                  className="p-3 space-y-2.5 bg-slate-50 dark:bg-slate-950/60 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {/* Miniature Welcome Hero Banner Preview */}
                  <div
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(12, 24, 45, 0.92) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(12, 24, 45, 0.92) 100%), url('${currentWelcomeBanner}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: currentRadius,
                    }}
                    className="p-3 border border-white/20 text-white shadow-md relative overflow-hidden space-y-2 select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold text-white shadow-inner">
                          SA
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white leading-tight">Good Day, Administrator</div>
                          <div className="text-[8px] text-white/80 font-medium truncate max-w-[140px]">{form.header_subtitle || "PERFECTION AT ITS FINEST"}</div>
                        </div>
                      </div>
                      <span className="text-[7.5px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-400/30 shrink-0">
                        ● In 10:02 AM
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[7.5px] text-white/75 pt-1 border-t border-white/10">
                      <span>Dashboard Hero Banner</span>
                      <span className="font-mono">10:00 AM - 07:00 PM</span>
                    </div>
                  </div>

                  {/* Heading Sample */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Heading Preview</span>
                      <span className="text-[9.5px] font-mono text-purple-600 dark:text-purple-400">{form.heading_scale} scale</span>
                    </div>
                    <h3
                      style={{
                        fontSize: form.heading_scale === "compact"
                          ? "15px"
                          : form.heading_scale === "large"
                          ? "19px"
                          : form.heading_scale === "extra-large"
                          ? "22px"
                          : "17px",
                      }}
                      className="font-bold text-slate-900 dark:text-white leading-tight"
                    >
                      Attendance Management
                    </h3>
                  </div>

                  {/* Description Sample */}
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                    <p
                      style={{ fontSize: form.description_font_size }}
                      className="text-slate-500 dark:text-slate-400 leading-snug line-clamp-2"
                    >
                      Super Admin: View daily biometric punches, timeline records, and manage employee logs.
                    </p>
                  </div>

                  {/* Body Text Sample with dynamic Border Radius & Elevation */}
                  <div
                    style={{
                      borderRadius: currentRadius,
                      boxShadow: form.card_elevation === "floating"
                        ? "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)"
                        : form.card_elevation === "glassmorphic"
                        ? "0 8px 32px 0 rgba(31, 38, 135, 0.15)"
                        : form.card_elevation === "flat"
                        ? "none"
                        : "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">
                        Card Container ({currentRadius})
                      </span>
                      <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400">
                        {form.card_elevation || "subtle"}
                      </span>
                    </div>
                    <p
                      style={{ fontSize: form.body_font_size }}
                      className="text-slate-700 dark:text-slate-300 leading-snug"
                    >
                      Previewing <strong className="text-slate-900 dark:text-white">{form.font_family}</strong> typeface with <strong className="text-purple-600 dark:text-purple-400">{currentRadius}</strong> corner rounding.
                    </p>
                  </div>

                  {/* Primary Buttons & Interactive Components Preview */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        style={{
                          backgroundColor: form.primary_color,
                          borderRadius: currentBtnRadius,
                        }}
                        className="px-3 py-1 text-white text-[11px] font-semibold shadow-xs hover:brightness-110 transition-all cursor-pointer"
                      >
                        Primary Action
                      </button>
                      <button
                        type="button"
                        style={{ borderRadius: currentBtnRadius }}
                        className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Secondary
                      </button>
                      <span
                        style={{
                          borderColor: form.primary_color,
                          color: form.primary_color,
                        }}
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-bold border bg-white dark:bg-slate-900"
                      >
                        Active Tag
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
