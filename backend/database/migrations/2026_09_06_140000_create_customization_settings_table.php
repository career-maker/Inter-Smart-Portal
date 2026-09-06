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
                $table->json('extra_colors')->nullable();
                $table->timestamps();
            });

            // Seed default InterSmart customization settings
            DB::table('customization_settings')->insert([
                'font_family'           => 'Proxima Nova',
                'header_bg_color'       => '#56348f',
                'header_text_color'     => '#ffffff',
                'sidebar_bg_color'      => '#0e2638',
                'header_subtitle'       => 'PERFECTION AT ITS FINEST',
                'primary_color'         => '#56348f',
                'body_font_size'        => '13px',
                'heading_scale'         => 'normal',
                'description_font_size' => '12px',
                'page_title_base'       => 'Inter Smart',
                'page_title_format'     => '{title} | {pagename}',
                'created_at'            => now(),
                'updated_at'            => now(),
            ]);
        } else {
            if (!Schema::hasColumn('customization_settings', 'sidebar_bg_color')) {
                Schema::table('customization_settings', function (Blueprint $table) {
                    $table->string('sidebar_bg_color')->default('#0e2638')->after('header_text_color');
                });
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
