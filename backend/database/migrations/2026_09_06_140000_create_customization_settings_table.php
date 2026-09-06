<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('customization_settings')) {
            Schema::create('customization_settings', function (Blueprint $table) {
                $table->id();
                $table->string('font_family')->default('Proxima Nova');
                $table->string('header_bg_color')->default('#56348f');
                $table->string('header_text_color')->default('#ffffff');
                $table->string('sidebar_bg_color')->default('#0e2638');
                $table->string('header_subtitle')->default('PERFECTION AT ITS FINEST');
                $table->string('primary_color')->default('#56348f');
                $table->string('body_font_size')->default('13px');
                $table->string('heading_scale')->default('normal'); // compact, normal, large, extra-large
                $table->string('description_font_size')->default('12px');
                $table->string('page_title_base')->default('Inter Smart');
                $table->string('page_title_format')->default('{title} | {pagename}');
                $table->longText('favicon_url')->nullable();
                $table->longText('logo_url')->nullable();
                $table->string('border_radius')->default('12px');
                $table->string('sub_header_bg')->default('#ffffff');
                $table->string('sub_header_active_color')->default('#56348f');
                $table->string('login_heading')->nullable()->default('Sign in to your workplace');
                $table->string('login_subheading')->nullable()->default('Perfection at its finest. Workforce management portal');
                $table->string('title_separator')->default('|');
                $table->boolean('show_header_subtitle')->default(true);
                $table->string('sidebar_active_color')->default('#133249');
                $table->string('card_elevation')->default('subtle');
                $table->string('button_style')->default('rounded');
                $table->string('density')->default('comfortable');
                $table->string('footer_copyright')->default('© 2026 Inter Smart. All rights reserved.');
                $table->json('extra_colors')->nullable();
                $table->timestamps();
            });

            // Seed default InterSmart customization settings
            DB::table('customization_settings')->insert([
                'font_family'             => 'Proxima Nova',
                'header_bg_color'         => '#56348f',
                'header_text_color'       => '#ffffff',
                'sidebar_bg_color'        => '#0e2638',
                'header_subtitle'         => 'PERFECTION AT ITS FINEST',
                'show_header_subtitle'    => true,
                'sidebar_active_color'    => '#133249',
                'card_elevation'          => 'subtle',
                'button_style'            => 'rounded',
                'density'                 => 'comfortable',
                'footer_copyright'        => '© 2026 Inter Smart. All rights reserved.',
                'primary_color'           => '#56348f',
                'body_font_size'          => '13px',
                'heading_scale'           => 'normal',
                'description_font_size'   => '12px',
                'page_title_base'         => 'Inter Smart',
                'page_title_format'       => '{title} | {pagename}',
                'favicon_url'             => '/icon.png',
                'logo_url'                => '/logo.png',
                'border_radius'           => '12px',
                'sub_header_bg'           => '#ffffff',
                'sub_header_active_color' => '#56348f',
                'login_heading'           => 'Sign in to your workplace',
                'login_subheading'        => 'Perfection at its finest. Workforce management portal',
                'title_separator'         => '|',
                'created_at'              => now(),
                'updated_at'              => now(),
            ]);
        } else {
            $colsToAdd = [
                'sidebar_bg_color'        => fn($t) => $t->string('sidebar_bg_color')->default('#0e2638')->after('header_text_color'),
                'favicon_url'             => fn($t) => $t->longText('favicon_url')->nullable()->after('page_title_format'),
                'logo_url'                => fn($t) => $t->longText('logo_url')->nullable()->after('favicon_url'),
                'border_radius'           => fn($t) => $t->string('border_radius')->default('12px')->after('logo_url'),
                'sub_header_bg'           => fn($t) => $t->string('sub_header_bg')->default('#ffffff')->after('border_radius'),
                'sub_header_active_color' => fn($t) => $t->string('sub_header_active_color')->default('#56348f')->after('sub_header_bg'),
                'login_heading'           => fn($t) => $t->string('login_heading')->nullable()->default('Sign in to your workplace')->after('sub_header_active_color'),
                'login_subheading'        => fn($t) => $t->string('login_subheading')->nullable()->default('Perfection at its finest. Workforce management portal')->after('login_heading'),
                'title_separator'         => fn($t) => $t->string('title_separator')->default('|')->after('login_subheading'),
                'show_header_subtitle'    => fn($t) => $t->boolean('show_header_subtitle')->default(true)->after('title_separator'),
                'sidebar_active_color'    => fn($t) => $t->string('sidebar_active_color')->default('#133249')->after('show_header_subtitle'),
                'card_elevation'          => fn($t) => $t->string('card_elevation')->default('subtle')->after('sidebar_active_color'),
                'button_style'            => fn($t) => $t->string('button_style')->default('rounded')->after('card_elevation'),
                'density'                 => fn($t) => $t->string('density')->default('comfortable')->after('button_style'),
                'footer_copyright'        => fn($t) => $t->string('footer_copyright')->default('© 2026 Inter Smart. All rights reserved.')->after('density'),
            ];

            foreach ($colsToAdd as $col => $closure) {
                if (!Schema::hasColumn('customization_settings', $col)) {
                    Schema::table('customization_settings', $closure);
                }
            }
        }

        // Seed 'customization' addon in pm_addons table
        if (Schema::hasTable('pm_addons')) {
            $exists = DB::table('pm_addons')->where('key', 'customization')->exists();
            if (!$exists) {
                DB::table('pm_addons')->insert([
                    'key'         => 'customization',
                    'name'        => 'Customization',
                    'description' => 'Customize portal font family, header background and text colors, typography scales, and dynamic page titles.',
                    'icon'        => 'Palette',
                    'is_active'   => true,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customization_settings');

        if (Schema::hasTable('pm_addons')) {
            DB::table('pm_addons')->where('key', 'customization')->delete();
        }
    }
};
