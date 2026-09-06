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
            'font_family'             => 'nullable|string|max:100',
            'header_bg_color'         => 'nullable|string|max:50',
            'header_text_color'       => 'nullable|string|max:50',
            'sidebar_bg_color'        => 'nullable|string|max:50',
            'header_subtitle'         => 'nullable|string|max:100',
            'primary_color'           => 'nullable|string|max:50',
            'body_font_size'          => 'nullable|string|max:20',
            'heading_scale'           => 'nullable|string|in:compact,normal,large,extra-large',
            'description_font_size'   => 'nullable|string|max:20',
            'page_title_base'         => 'nullable|string|max:100',
            'page_title_format'       => 'nullable|string|max:100',
            'favicon_url'             => 'nullable|string',
            'logo_url'                => 'nullable|string',
            'border_radius'           => 'nullable|string|max:20',
            'sub_header_bg'           => 'nullable|string|max:50',
            'sub_header_active_color' => 'nullable|string|max:50',
            'login_heading'           => 'nullable|string|max:150',
            'login_subheading'        => 'nullable|string|max:255',
            'title_separator'         => 'nullable|string|max:10',
            'show_header_subtitle'    => 'nullable|boolean',
            'sidebar_active_color'    => 'nullable|string|max:50',
            'card_elevation'          => 'nullable|string|in:flat,subtle,floating,glassmorphic',
            'button_style'            => 'nullable|string|in:rounded,pill,sharp',
            'density'                 => 'nullable|string|in:compact,comfortable,spacious',
            'footer_copyright'        => 'nullable|string|max:255',
            'extra_colors'            => 'nullable|array',
        ]);

        try {
            // Automatically convert any base64 data URLs to stored image files
            if (!empty($validated['favicon_url']) && str_starts_with($validated['favicon_url'], 'data:image/')) {
                $validated['favicon_url'] = $this->saveBase64Image($validated['favicon_url'], 'favicon');
            }
            if (!empty($validated['logo_url']) && str_starts_with($validated['logo_url'], 'data:image/')) {
                $validated['logo_url'] = $this->saveBase64Image($validated['logo_url'], 'logo');
            }

            $setting = CustomizationSetting::getSettings();
            $existingColumns = Schema::getColumnListing('customization_settings');
            $payload = array_filter(
                $validated,
                fn($val, $key) => !is_null($val) && in_array($key, $existingColumns, true),
                ARRAY_FILTER_USE_BOTH
            );

            $setting->update($payload);

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
     * Upload an asset file (favicon or logo).
     */
    public function uploadAsset(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:5120',
            'type' => 'nullable|string|in:favicon,logo',
        ]);

        try {
            $file = $request->file('file');
            $ext  = strtolower($file->getClientOriginalExtension());
            if (!$ext) {
                $ext = 'png';
            }
            $prefix = $request->input('type') ?: 'asset';
            $filename = $prefix . '_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;

            $dir = public_path('uploads/customization');
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }

            $file->move($dir, $filename);

            return response()->json([
                'success' => true,
                'url'     => '/uploads/customization/' . $filename,
                'message' => 'Asset uploaded successfully.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload asset: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Public route to serve customization assets if needed.
     */
    public function showAsset($filename)
    {
        $clean = basename($filename);
        $path = public_path('uploads/customization' . DIRECTORY_SEPARATOR . $clean);
        if (!file_exists($path)) {
            abort(404);
        }
        $mime = mime_content_type($path) ?: 'application/octet-stream';
        return response()->file($path, ['Content-Type' => $mime]);
    }

    /**
     * Convert data URL base64 image into file on disk.
     */
    private function saveBase64Image(string $dataUrl, string $prefix = 'asset'): string
    {
        if (!preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $type)) {
            return $dataUrl;
        }

        $imageType = strtolower($type[1]);
        if (!in_array($imageType, ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'x-icon', 'vnd.microsoft.icon'])) {
            $imageType = 'png';
        }
        if ($imageType === 'x-icon' || $imageType === 'vnd.microsoft.icon') {
            $imageType = 'ico';
        }

        $data = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $data = base64_decode($data);
        if ($data === false) {
            return $dataUrl;
        }

        $dir = public_path('uploads/customization');
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = $prefix . '_' . time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $imageType;
        file_put_contents($dir . DIRECTORY_SEPARATOR . $filename, $data);

        return '/uploads/customization/' . $filename;
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
