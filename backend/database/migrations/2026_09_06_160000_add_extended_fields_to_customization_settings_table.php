<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('customization_settings')) {
            $colsToAdd = [
                'sidebar_bg_color'        => fn(Blueprint $t) => $t->string('sidebar_bg_color')->default('#0e2638'),
                'favicon_url'             => fn(Blueprint $t) => $t->longText('favicon_url')->nullable(),
                'logo_url'                => fn(Blueprint $t) => $t->longText('logo_url')->nullable(),
                'border_radius'           => fn(Blueprint $t) => $t->string('border_radius')->default('12px'),
                'sub_header_bg'           => fn(Blueprint $t) => $t->string('sub_header_bg')->default('#ffffff'),
                'sub_header_active_color' => fn(Blueprint $t) => $t->string('sub_header_active_color')->default('#56348f'),
                'login_heading'           => fn(Blueprint $t) => $t->string('login_heading')->nullable()->default('Sign in to your workplace'),
                'login_subheading'        => fn(Blueprint $t) => $t->string('login_subheading')->nullable()->default('Perfection at its finest. Workforce management portal'),
                'title_separator'         => fn(Blueprint $t) => $t->string('title_separator')->default('|'),
                'show_header_subtitle'    => fn(Blueprint $t) => $t->boolean('show_header_subtitle')->default(true),
                'sidebar_active_color'    => fn(Blueprint $t) => $t->string('sidebar_active_color')->default('#133249'),
                'card_elevation'          => fn(Blueprint $t) => $t->string('card_elevation')->default('subtle'),
                'button_style'            => fn(Blueprint $t) => $t->string('button_style')->default('rounded'),
                'density'                 => fn(Blueprint $t) => $t->string('density')->default('comfortable'),
                'footer_copyright'        => fn(Blueprint $t) => $t->string('footer_copyright')->default('© 2026 Inter Smart. All rights reserved.'),
            ];

            foreach ($colsToAdd as $col => $closure) {
                if (!Schema::hasColumn('customization_settings', $col)) {
                    Schema::table('customization_settings', $closure);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('customization_settings')) {
            $cols = [
                'sidebar_bg_color',
                'favicon_url',
                'logo_url',
                'border_radius',
                'sub_header_bg',
                'sub_header_active_color',
                'login_heading',
                'login_subheading',
                'title_separator',
                'show_header_subtitle',
                'sidebar_active_color',
                'card_elevation',
                'button_style',
                'density',
                'footer_copyright',
            ];

            foreach ($cols as $col) {
                if (Schema::hasColumn('customization_settings', $col)) {
                    Schema::table('customization_settings', function (Blueprint $t) use ($col) {
                        $t->dropColumn($col);
                    });
                }
            }
        }
    }
};
