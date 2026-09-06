<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomizationSetting extends Model
{
    use HasFactory;

    protected $table = 'customization_settings';

    protected $fillable = [
        'font_family',
        'header_bg_color',
        'header_text_color',
        'sidebar_bg_color',
        'header_subtitle',
        'primary_color',
        'body_font_size',
        'heading_scale',
        'description_font_size',
        'page_title_base',
        'page_title_format',
        'extra_colors',
    ];

    protected $casts = [
        'extra_colors' => 'array',
    ];

    public static function defaults(): array
    {
        return [
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
            'extra_colors'          => null,
        ];
    }

    public static function getSettings(): self
    {
        $setting = static::first();
        if (!$setting) {
            $setting = static::create(static::defaults());
        }
        return $setting;
    }
}
