"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCustomization } from "@/context/CustomizationContext";
import { CustomizationSettings, DEFAULT_CUSTOMIZATION_SETTINGS } from "@/services/customization";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateSettings(form);
      setSuccessMessage("Portal customization saved and applied globally!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save customization.");
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
  const previewTabTitle = (form.page_title_format || "{title} | {pagename}")
    .replace(/\{title\}/gi, form.page_title_base || "Inter Smart")
    .replace(/\{pagename\}/gi, "Attendance Management");

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/project-management" className="hover:text-purple-600 dark:hover:text-purple-400">
              Project Management
            </Link>
            <span>/</span>
            <Link href="/project-management/addons" className="hover:text-purple-600 dark:hover:text-purple-400">
              Add-ons
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white">Customization</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-[#56348f]" />
            <span>Portal Customization</span>
            <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/60">
              Live Theme Engine
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize typography fonts, header and theme colors, font size scales, and browser tab titles. All edits preview in real-time.
          </p>
        </div>

        {/* Header Action Buttons */}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT COLUMN: Configuration Form ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. TYPOGRAPHY & FONT FAMILY */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Portal Typography & Font Family</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
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

          {/* 2. HEADER APPEARANCE */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Header Appearance & Color</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Customize the top navigation header background color, text color, and title branding.
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
                    title="Choose custom header color"
                  />
                </div>
              </div>

              {/* Presets */}
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

            {/* Header Text Color */}
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
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. FONT SIZING & HIERARCHY */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Font Size Hierarchy & Scaling</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Control text proportions for body content, section headings, and helper descriptions.
                </p>
              </div>
            </div>

            {/* Body Font Size */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Body Font Size (Default: 13px)
                </label>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                  {form.body_font_size}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-slate-400 font-mono">12px</span>
                <input
                  type="range"
                  min="12"
                  max="16"
                  step="1"
                  value={parseInt(form.body_font_size) || 13}
                  onChange={(e) => handleFieldChange("body_font_size", `${e.target.value}px`)}
                  className="flex-1 accent-[#56348f] cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono">16px</span>
              </div>
            </div>

            {/* Description / Caption Font Size */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description & Subtitle Font Size (Default: 12px)
                </label>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                  {form.description_font_size}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-slate-400 font-mono">11px</span>
                <input
                  type="range"
                  min="11"
                  max="14"
                  step="1"
                  value={parseInt(form.description_font_size) || 12}
                  onChange={(e) => handleFieldChange("description_font_size", `${e.target.value}px`)}
                  className="flex-1 accent-[#56348f] cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono">14px</span>
              </div>
            </div>

            {/* Heading Scale Selector */}
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

          {/* 4. THEME & PRIMARY ACCENT COLOR */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Theme Accent & Button Color</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Primary color used for call-to-action buttons, active badges, and focus rings.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Accent Color
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
          </div>

          {/* 5. PAGE TITLE CONFIGURATION */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-[#56348f] dark:text-purple-300">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Page Title & Browser Tab Format</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Supported variables:</span>
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-mono text-[10px]">{`{title}`}</code>
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-mono text-[10px]">{`{pagename}`}</code>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Interactive Live Preview (Sticky) ── */}
        <div className="lg:col-span-5 sticky top-20 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Real-Time Live Preview</span>
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Interactive</span>
            </span>
          </div>

          {/* Browser Tab Window Mockup */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-lg space-y-0">
            {/* Chrome Bar */}
            <div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>

              {/* Tab Item */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1 rounded-t-lg border-t border-x border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate shadow-xs">
                <img src="/icon.png" alt="Favicon" className="w-3.5 h-3.5 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <span className="truncate">{previewTabTitle}</span>
              </div>
            </div>

            {/* Mockup Header */}
            <div
              style={{
                backgroundColor: form.header_bg_color,
                color: form.header_text_color,
                fontFamily: `"${form.font_family}", sans-serif`,
              }}
              className="px-4 py-3 flex items-center justify-between transition-colors shadow-inner"
            >
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-6 w-auto brightness-0 invert object-contain"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-white/15 px-2.5 py-1 rounded-lg text-xs backdrop-blur-xs">
                  <Search className="w-3.5 h-3.5 opacity-70" />
                  <span className="text-[11px] opacity-70">Search any command...</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  SA
                </div>
              </div>
            </div>

            {/* Mockup Portal Body Content */}
            <div
              style={{
                fontFamily: `"${form.font_family}", sans-serif`,
              }}
              className="p-5 space-y-4 bg-slate-50 dark:bg-slate-950/60"
            >
              {/* Heading Sample */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Heading Preview</span>
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400">{form.heading_scale} scale</span>
                </div>
                <h3
                  style={{
                    fontSize: form.heading_scale === "compact"
                      ? "16px"
                      : form.heading_scale === "large"
                      ? "21px"
                      : form.heading_scale === "extra-large"
                      ? "24px"
                      : "18px",
                  }}
                  className="font-bold text-slate-900 dark:text-white leading-tight"
                >
                  Attendance Management
                </h3>
              </div>

              {/* Description Sample */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description / Caption</span>
                <p
                  style={{ fontSize: form.description_font_size }}
                  className="text-slate-500 dark:text-slate-400 leading-relaxed"
                >
                  Super Admin: View daily biometric punches, timeline records, and manage employee attendance logs.
                </p>
              </div>

              {/* Body Text Sample */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Body Typography ({form.body_font_size})</span>
                <p
                  style={{ fontSize: form.body_font_size }}
                  className="text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  This live sample demonstrates how paragraphs, cards, tables, and dialog text will appear across the Inter Smart workspace using the selected <strong className="text-slate-900 dark:text-white">{form.font_family}</strong> typeface.
                </p>
              </div>

              {/* Primary Buttons & Interactive Components Preview */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Action Buttons & Accents</span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    style={{ backgroundColor: form.primary_color }}
                    className="px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm hover:brightness-110 transition-all cursor-pointer"
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Secondary Action
                  </button>
                  <span
                    style={{
                      borderColor: form.primary_color,
                      color: form.primary_color,
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-white dark:bg-slate-900"
                  >
                    Active Tag
                  </span>
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
              When saved, the updated styling rules are broadcasted system-wide. Every employee, team lead, and admin accessing the portal will instantly experience the customized branding.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
