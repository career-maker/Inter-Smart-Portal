<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Header #252525 and side menu #1C1C1C (dark charcoal), burgundy #A8325C highlights. */
return new class extends Migration
{
    private const COLORS = [
        'header_bg_color' => '#252525', 'sidebar_bg_color' => '#1C1C1C', 'sidebar_active_color' => '#A8325C',
        'sidebar_hover_color' => '#333333', 'active_color' => '#A8325C', 'sub_header_active_color' => '#A8325C',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('customization_settings')) {
            return;
        }
        $row = DB::table('customization_settings')->first();
        if (! $row) {
            return;
        }
        $extra = json_decode((string) ($row->extra_colors ?? ''), true) ?: [];
        $set = [];
        foreach (self::COLORS as $k => $v) {
            if (Schema::hasColumn('customization_settings', $k)) {
                $set[$k] = $v;
            }
            unset($extra[$k]);
        }
        if (Schema::hasColumn('customization_settings', 'extra_colors')) {
            $set['extra_colors'] = $extra ? json_encode($extra) : null;
        }
        DB::table('customization_settings')->where('id', $row->id)->update($set + ['updated_at' => now()]);
    }

    public function down(): void
    {
    }
};
