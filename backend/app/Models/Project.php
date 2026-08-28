<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Project Management module — pm_projects.
 *
 * Reuses the existing HR `users`/`teams` tables directly for every
 * identity reference (coordinator, team, creator). No new identity
 * system. See PROJECT_MANAGEMENT_MODULE_DESIGN.md §5/§2.
 */
class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pm_projects';

    protected $fillable = [
        'name',
        'description',
        'status',
        'is_live',
        'live_date',
        'live_notes',
        'live_marked_by',
        'project_type',
        'category',
        'team_id',
        'project_coordinator_id',
        'start_date',
        'expected_end_date',
        'allotted_effort',
        'confirmed_effort',
        'expected_effort',
        'committed_effort',
        'hubstaff_project_id',
        'blockers',
        'budget',
        'fixing_notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_live' => 'boolean',
        'live_date' => 'date',
        'start_date' => 'date',
        'expected_end_date' => 'date',
        'allotted_effort' => 'decimal:2',
        'confirmed_effort' => 'decimal:2',
        'expected_effort' => 'decimal:2',
        'committed_effort' => 'decimal:2',
        'budget' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    // name_normalized is a DB-generated (STORED) column — deliberately not
    // in $fillable above; MySQL/Postgres compute and store it themselves.

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_coordinator_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** Project roster — Member | Lead | Reviewer only, never 'Coordinator' (§2 of the design doc). */
    public function projectMembers(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pm_project_members', 'project_id', 'user_id')
            ->withPivot(['project_role', 'added_by'])
            ->withTimestamps();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(ProjectCorrection::class);
    }

    public function liveMarker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'live_marked_by');
    }

    /** Checklist items assigned directly to this project (not via a specific task). */
    public function checklistAssignments(): HasMany
    {
        return $this->hasMany(ProjectChecklistAssignment::class, 'checklistable_id')
            ->where('checklistable_type', 'Project');
    }
}
