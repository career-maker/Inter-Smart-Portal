<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PmAddon extends Model
{
    use HasFactory;

    protected $table = 'pm_addons';

    protected $fillable = [
        'key',
        'name',
        'description',
        'icon',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'pm_team_addons', 'addon_id', 'team_id')
            ->withTimestamps();
    }

    public function teamAddons(): HasMany
    {
        return $this->hasMany(PmTeamAddon::class, 'addon_id');
    }
}
