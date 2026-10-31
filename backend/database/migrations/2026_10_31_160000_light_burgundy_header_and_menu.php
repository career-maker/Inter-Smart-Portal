<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Header and side menu move to light burgundy #A8325C, with matching highlight colours. */
return new class extends Migration
{
    private const COLORS = [
        'header_bg_color' => '#A8325C', 'sidebar_bg_color' => '#A8325C', 'sidebar_active_color' => '#7E2345',
        'sidebar_hover_color' => '#B94670', 'active_color' => '#A8325C', 'sub_header_active_color' => '#A8325C',
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
