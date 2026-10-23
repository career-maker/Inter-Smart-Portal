<?php

namespace App\Support;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Module on/off switch stored in system_settings as `module.<name>.enabled` = 'true'.
 * Missing or any other value means OFF, so new modules ship dark.
 */
class Feature
{
    public static function enabled(string $module): bool
    {
        return Cache::remember("feature.{$module}", 60, fn () =>
            SystemSetting::where('key', "module.{$module}.enabled")->value('value') === 'true'
        );
    }

    public static function set(string $module, bool $on): void
    {
        SystemSetting::updateOrCreate(
            ['key' => "module.{$module}.enabled"],
            ['value' => $on ? 'true' : 'false']
        );
        Cache::forget("feature.{$module}");
    }
}
