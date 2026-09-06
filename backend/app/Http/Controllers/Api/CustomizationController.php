<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomizationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CustomizationController extends Controller
{
    /**
     * Get the current portal customization settings.
     */
    public function getSettings()
    {
        try {
            if (!Schema::hasTable('customization_settings')) {
                return response()->json([
                    'success'  => true,
                    'settings' => CustomizationSetting::defaults(),
                ]);
            }

            $settings = CustomizationSetting::getSettings();

            return response()->json([
                'success'  => true,
                'settings' => $settings,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success'  => true,
                'settings' => CustomizationSetting::defaults(),
            ]);
        }
    }

    /**
     * Update customization settings (Super Admin only).
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'font_family'           => 'nullable|string|max:100',
            'header_bg_color'       => 'nullable|string|max:50',
            'header_text_color'     => 'nullable|string|max:50',
            'sidebar_bg_color'      => 'nullable|string|max:50',
            'header_subtitle'       => 'nullable|string|max:100',
            'primary_color'         => 'nullable|string|max:50',
            'body_font_size'        => 'nullable|string|max:20',
            'heading_scale'         => 'nullable|string|in:compact,normal,large,extra-large',
            'description_font_size' => 'nullable|string|max:20',
            'page_title_base'       => 'nullable|string|max:100',
            'page_title_format'     => 'nullable|string|max:100',
            'extra_colors'          => 'nullable|array',
        ]);

        try {
            $setting = CustomizationSetting::getSettings();
            $setting->update(array_filter($validated, fn($val) => !is_null($val)));

            return response()->json([
                'success'  => true,
                'message'  => 'Portal customization updated successfully.',
                'settings' => $setting->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customization: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset customization settings back to default InterSmart branding.
     */
    public function resetSettings()
    {
        try {
            $defaults = CustomizationSetting::defaults();
            $setting = CustomizationSetting::getSettings();
            $setting->update($defaults);

            return response()->json([
                'success'  => true,
                'message'  => 'Portal customization reset to defaults successfully.',
                'settings' => $setting->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset customization: ' . $e->getMessage(),
            ], 500);
        }
    }
}
