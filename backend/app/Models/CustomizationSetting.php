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
        return $value ?: ($this->extra_colors['sidebar_hover_color'] ?? '#B94670');
    }

    public function getHoverColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['hover_color'] ?? '#00A58C');
    }

    public function getActiveColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['active_color'] ?? '#A8325C');
    }

    public function getDarkTextColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['dark_text_color'] ?? '#161D2C');
    }

    public function getLightBgColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['light_bg_color'] ?? '#F5F7FC');
    }

    public function getCardBgColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['card_bg_color'] ?? '#FDFBFE');
    }

    public function getBorderColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['border_color'] ?? '#E4E7F0');
    }

    public function getSidebarBgColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sidebar_bg_color'] ?? '#A8325C');
    }

    public function getSidebarActiveColorAttribute($value): string
    {
        return $value ?: ($this->extra_colors['sidebar_active_color'] ?? '#7E2345');
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
            'font_family'               => 'Poppins',
            'header_bg_color'           => '#A8325C',
            'header_text_color'         => '#FFFFFF',
            'sidebar_bg_color'          => '#A8325C',
            'header_subtitle'           => 'PERFECTION AT ITS FINEST',
            'show_header_subtitle'      => true,
            'sidebar_active_color'      => '#7E2345',
            'sidebar_hover_color'       => '#B94670',
            'hover_color'               => '#00A58C',
            'active_color'              => '#A8325C',
            'dark_text_color'           => '#161D2C',
            'light_bg_color'            => '#F5F7FC',
            'card_bg_color'             => '#FDFBFE',
            'border_color'              => '#E4E7F0',
            'card_elevation'            => 'subtle',
            'button_style'              => 'rounded',
            'density'                   => 'comfortable',
            'footer_copyright'          => '© 2026 Inter Smart. All rights reserved.',
            'primary_color'             => '#00BDA1',
            'body_font_size'            => '14px',
            'heading_scale'             => 'normal',
            'description_font_size'     => '12px',
            'page_title_base'           => 'Inter Smart',
            'page_title_format'         => '{title} | {pagename}',
            'favicon_url'               => '/icon.png',
            'logo_url'                  => '/logo.png',
            'welcome_banner_url'        => '/welcome-banner-bg.jpg',
            'welcome_banner_media_type' => 'image',
            'login_bg_video_url'        => '/videos/login-bg.mp4',
            'border_radius'             => '14px',
            'sub_header_bg'             => '#FFFFFF',
            'sub_header_active_color'   => '#A8325C',
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
