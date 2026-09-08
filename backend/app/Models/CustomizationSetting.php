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
        'welcome_banner_url',
        'login_bg_video_url',
        'welcome_banner_media_type',
        'sidebar_hover_color',
        'hover_color',
        'active_color',
        'dark_text_color',
        'light_bg_color',
        'card_bg_color',
        'border_color',
    ];

    protected $casts = [
        'extra_colors'          => 'array',
        'show_header_subtitle' => 'boolean',
    ];

    protected $appends = [
        'welcome_banner_url',
        'login_bg_video_url',
        'welcome_banner_media_type',
        'sidebar_hover_color',
        'hover_color',
        'active_color',
        'dark_text_color',
        'light_bg_color',
        'card_bg_color',
        'border_color',
    ];

    public function getWelcomeBannerUrlAttribute($value): string
    {
        if (!empty($value)) {
            return $value;
        }
        if (!empty($this->extra_colors['welcome_banner_url'])) {
            return $this->extra_colors['welcome_banner_url'];
        }
        return '/welcome-banner-bg.jpg';
    }

    public function getLoginBgVideoUrlAttribute($value): string
    {
        if (!empty($value)) {
            return $value;
        }
        if (!empty($this->extra_colors['login_bg_video_url'])) {
            return $this->extra_colors['login_bg_video_url'];
        }
        return '/videos/login-bg.mp4';
    }

    public function getWelcomeBannerMediaTypeAttribute($value): string
    {
        if (!empty($value)) {
            return $value;
        }
        if (!empty($this->extra_colors['welcome_banner_media_type'])) {
            return $this->extra_colors['welcome_banner_media_type'];
        }
        $banner = $this->welcome_banner_url;
        if (preg_match('/\.(mp4|webm|ogg|mov)($|\?)/i', (string) $banner)) {
            return 'video';
        }
        return 'image';
    }

    public function getSidebarHoverColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sidebar_hover_color'] ?? '#138A80');
    }

    public function getHoverColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['hover_color'] ?? '#138A80');
    }

    public function getActiveColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['active_color'] ?? '#14A092');
    }

    public function getDarkTextColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['dark_text_color'] ?? '#093E3A');
    }

    public function getLightBgColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['light_bg_color'] ?? '#E6F8F6');
    }

    public function getCardBgColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['card_bg_color'] ?? '#F2FCFB');
    }

    public function getBorderColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['border_color'] ?? '#CBEFEA');
    }

    public function getSidebarBgColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sidebar_bg_color'] ?? '#093E3A');
    }

    public function getSidebarActiveColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sidebar_active_color'] ?? '#14A092');
    }

    public function getSubHeaderBgAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sub_header_bg'] ?? '#ffffff');
    }

    public function getSubHeaderActiveColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sub_header_active_color'] ?? ($this->primary_color ?? '#0F766E'));
    }

    public static function defaults(): array
    {
        return [
            'font_family'               => 'Proxima Nova',
            'header_bg_color'           => '#0F766E',
            'header_text_color'         => '#FFFFFF',
            'sidebar_bg_color'          => '#093E3A',
            'header_subtitle'           => 'PERFECTION AT ITS FINEST',
            'show_header_subtitle'      => true,
            'sidebar_active_color'      => '#14A092',
            'sidebar_hover_color'       => '#138A80',
            'hover_color'               => '#138A80',
            'active_color'              => '#14A092',
            'dark_text_color'           => '#093E3A',
            'light_bg_color'            => '#E6F8F6',
            'card_bg_color'             => '#F2FCFB',
            'border_color'              => '#CBEFEA',
            'card_elevation'            => 'subtle',
            'button_style'              => 'rounded',
            'density'                   => 'comfortable',
            'footer_copyright'          => '© 2026 Inter Smart. All rights reserved.',
            'primary_color'             => '#0F766E',
            'body_font_size'            => '12px',
            'heading_scale'             => 'normal',
            'description_font_size'     => '13px',
            'page_title_base'           => 'Inter Smart',
            'page_title_format'         => '{title} | {pagename}',
            'favicon_url'               => '/icon.png',
            'logo_url'                  => '/logo.png',
            'welcome_banner_url'        => '/welcome-banner-bg.jpg',
            'welcome_banner_media_type' => 'image',
            'login_bg_video_url'        => '/videos/login-bg.mp4',
            'border_radius'             => '12px',
            'sub_header_bg'             => '#ffffff',
            'sub_header_active_color'   => '#0F766E',
            'login_heading'             => 'Sign in to your workplace',
            'login_subheading'          => 'Perfection at its finest. Workforce management portal',
            'title_separator'           => '|',
            'extra_colors'              => null,
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
