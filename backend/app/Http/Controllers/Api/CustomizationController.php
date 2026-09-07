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
            if (empty($settings->welcome_banner_url) && !empty($settings->extra_colors['welcome_banner_url'])) {
                $settings->welcome_banner_url = $settings->extra_colors['welcome_banner_url'];
            }

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
            'welcome_banner_url'        => 'nullable|string',
            'login_bg_video_url'        => 'nullable|string',
            'welcome_banner_media_type' => 'nullable|string|in:image,video',
            'border_radius'             => 'nullable|string|max:20',
            'sub_header_bg'             => 'nullable|string|max:50',
            'sub_header_active_color'   => 'nullable|string|max:50',
            'login_heading'             => 'nullable|string|max:150',
            'login_subheading'          => 'nullable|string|max:255',
            'title_separator'           => 'nullable|string|max:10',
            'show_header_subtitle'      => 'nullable|boolean',
            'sidebar_active_color'      => 'nullable|string|max:50',
            'card_elevation'            => 'nullable|string|in:flat,subtle,floating,glassmorphic',
            'button_style'              => 'nullable|string|in:rounded,pill,sharp',
            'density'                   => 'nullable|string|in:compact,comfortable,spacious',
            'footer_copyright'          => 'nullable|string|max:255',
            'extra_colors'              => 'nullable|array',
        ]);

        try {
            // Automatically convert any base64 data URLs to stored image files
            if (!empty($validated['favicon_url']) && str_starts_with($validated['favicon_url'], 'data:image/')) {
                $validated['favicon_url'] = $this->saveBase64Image($validated['favicon_url'], 'favicon');
            }
            if (!empty($validated['logo_url']) && str_starts_with($validated['logo_url'], 'data:image/')) {
                $validated['logo_url'] = $this->saveBase64Image($validated['logo_url'], 'logo');
            }
            if (!empty($validated['welcome_banner_url']) && str_starts_with($validated['welcome_banner_url'], 'data:image/')) {
                $validated['welcome_banner_url'] = $this->saveBase64Image($validated['welcome_banner_url'], 'welcome_banner');
            }

            $setting = CustomizationSetting::getSettings();
            $existingColumns = Schema::getColumnListing('customization_settings');

            // If welcome_banner_url, login_bg_video_url, or welcome_banner_media_type columns don't exist yet on DB, store them safely in extra_colors JSON
            $extra = $setting->extra_colors ?? [];
            if (!is_array($extra)) {
                $extra = [];
            }
            $extraUpdated = false;

            if (isset($validated['welcome_banner_url']) && !in_array('welcome_banner_url', $existingColumns, true)) {
                $extra['welcome_banner_url'] = $validated['welcome_banner_url'];
                $extraUpdated = true;
            }
            if (isset($validated['login_bg_video_url']) && !in_array('login_bg_video_url', $existingColumns, true)) {
                $extra['login_bg_video_url'] = $validated['login_bg_video_url'];
                $extraUpdated = true;
            }
            if (isset($validated['welcome_banner_media_type']) && !in_array('welcome_banner_media_type', $existingColumns, true)) {
                $extra['welcome_banner_media_type'] = $validated['welcome_banner_media_type'];
                $extraUpdated = true;
            }
            if ($extraUpdated) {
                $validated['extra_colors'] = $extra;
            }

            $payload = array_filter(
                $validated,
                fn($val, $key) => !is_null($val) && in_array($key, $existingColumns, true),
                ARRAY_FILTER_USE_BOTH
            );

            $setting->update($payload);

            $fresh = $setting->fresh();
            if (empty($fresh->welcome_banner_url) && !empty($fresh->extra_colors['welcome_banner_url'])) {
                $fresh->welcome_banner_url = $fresh->extra_colors['welcome_banner_url'];
            }
            if (empty($fresh->login_bg_video_url) && !empty($fresh->extra_colors['login_bg_video_url'])) {
                $fresh->login_bg_video_url = $fresh->extra_colors['login_bg_video_url'];
            }
            if (empty($fresh->welcome_banner_media_type) && !empty($fresh->extra_colors['welcome_banner_media_type'])) {
                $fresh->welcome_banner_media_type = $fresh->extra_colors['welcome_banner_media_type'];
            }

            return response()->json([
                'success'  => true,
                'message'  => 'Portal customization updated successfully.',
                'settings' => $fresh,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customization: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload an asset file (favicon, logo, welcome banner image/video, or login background video).
     */
    public function uploadAsset(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200', // allow up to 50MB for videos
            'type' => 'nullable|string|in:favicon,logo,welcome_banner,login_bg_video,welcome_banner_video',
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
