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
        'extra_colors',
    ];

    protected $casts = [
        'extra_colors'          => 'array',
        'show_header_subtitle' => 'boolean',
    ];

    public static function defaults(): array
    {
        return [
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
            'body_font_size'          => '12px',
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
            'extra_colors'            => null,
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
