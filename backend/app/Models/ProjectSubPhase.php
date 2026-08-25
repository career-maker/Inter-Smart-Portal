<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

/**
 * pm_sub_phases — global (team_id NULL) + optional team-specific taxonomy.
 */
class ProjectSubPhase extends Model
{
    protected $table = 'pm_sub_phases';

    protected $fillable = [
        'name',
        'team_id',
        'description',
        'display_order',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class, 'sub_phase_id');
    }

    /** Every sub-phase a member of $teamId may use: global rows + that team's own. */
    public function scopeAvailableForTeam(Builder $query, ?int $teamId): Builder
    {
        return $query->where(function ($q) use ($teamId) {
            $q->whereNull('team_id');
            if ($teamId) {
                $q->orWhere('team_id', $teamId);
            }
        })->where('is_active', true);
    }
}
