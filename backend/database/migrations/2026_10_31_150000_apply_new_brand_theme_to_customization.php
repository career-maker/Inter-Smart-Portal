<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * The portal's default look becomes the new brand colours and Poppins. The saved Customization row is moved to it.
 * The values it had before are written to storage/app/previous-customization.json so they can be put back from the Customization tab.
 */
return new class extends Migration
{
    private const THEME = [
        'font_family' => 'Poppins', 'header_bg_color' => '#276BFA', 'header_text_color' => '#FFFFFF', 'sidebar_bg_color' => '#161D2C',
        'sidebar_active_color' => '#276BFA', 'sidebar_hover_color' => '#232C42', 'hover_color' => '#00A58C', 'active_color' => '#276BFA',
        'dark_text_color' => '#161D2C', 'light_bg_color' => '#F5F7FC', 'card_bg_color' => '#FDFBFE', 'border_color' => '#E4E7F0',
        'primary_color' => '#00BDA1', 'body_font_size' => '14px', 'description_font_size' => '12px', 'border_radius' => '14px',
        'sub_header_bg' => '#FFFFFF', 'sub_header_active_color' => '#276BFA',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('customization_settings')) {
            return;
        }
        $row = DB::table('customization_settings')->first();
        if (! $row) {
            return; // nothing saved: the new defaults apply on their own
        }
        $previous = [];
        $set = [];
        $extra = json_decode((string) ($row->extra_colors ?? ''), true) ?: [];
        foreach (self::THEME as $k => $v) {
            $previous[$k] = $row->{$k} ?? ($extra[$k] ?? null);
            if (Schema::hasColumn('customization_settings', $k)) {
                $set[$k] = $v;
            }
            unset($extra[$k]); // a stale copy in extra_colors would win over the column
        }
        try {
            Storage::disk('local')->put('previous-customization.json', json_encode($previous, JSON_PRETTY_PRINT));
        } catch (\Throwable $e) {
            // the database dump taken at release also holds the old values
        }
        if (Schema::hasColumn('customization_settings', 'extra_colors')) {
            $set['extra_colors'] = $extra ? json_encode($extra) : null;
        }
        DB::table('customization_settings')->where('id', $row->id)->update($set + ['updated_at' => now()]);
    }

    public function down(): void
    {
        // The previous values are kept in storage/app/previous-customization.json; restore them from the Customization tab.
    }
};
