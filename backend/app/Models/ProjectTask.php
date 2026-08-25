<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Project Management module — pm_tasks.
 *
 * status retains the full legacy vocabulary (see PROJECT_MANAGEMENT_MODULE_DESIGN.md
 * Decision 1) validated at the FormRequest layer, not a DB enum.
 * coordinator_id is a nullable, task-level override of the parent
 * project's coordinator — both reference the existing `users` table
 * directly, never a separate Coordinator identity.
 */
class ProjectTask extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pm_tasks';

    /** Full legacy vocabulary, retained per Decision 1. */
    public const STATUSES = [
        'Yet to Start', 'Being Developed', 'Ready for QA', 'Assigned to QA',
        'In Progress', 'On Hold', 'Completed', 'Forecast', 'Rejected',
    ];

    public const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

    /** Fields an assignee may edit on their own task without `manage tasks` — Decision 2. */
    public const EXECUTION_FIELDS = [
        'status', 'current_updates', 'actual_start_date', 'actual_completion_date',
        'time_taken', 'days_taken', 'deviation_reason',
    ];

    /** Fields that require `manage tasks` (or being the owning team's Team Lead / Super Admin) — Decision 2. */
    public const PLANNING_FIELDS = [
        'project_id', 'sub_phase_id', 'coordinator_id', 'title', 'description',
        'priority', 'start_date', 'due_date', 'include_saturday', 'include_sunday',
        'sprint', 'sprint_link', 'allotted_days', 'activity_percentage', 'team_id',
    ];

    protected $fillable = [
        'project_id', 'sub_phase_id', 'coordinator_id', 'title', 'description',
        'status', 'priority', 'start_date', 'due_date', 'actual_start_date',
        'actual_completion_date', 'include_saturday', 'include_sunday',
        'current_updates', 'deviation_reason', 'sprint', 'sprint_link',
        'allotted_days', 'time_taken', 'days_taken', 'deviation',
        'activity_percentage', 'team_id', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'actual_start_date' => 'date',
        'actual_completion_date' => 'date',
        'include_saturday' => 'boolean',
        'include_sunday' => 'boolean',
        'allotted_days' => 'decimal:2',
        'time_taken' => 'decimal:2',
        'days_taken' => 'decimal:2',
        'deviation' => 'decimal:2',
        'activity_percentage' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subPhase(): BelongsTo
    {
        return $this->belongsTo(ProjectSubPhase::class, 'sub_phase_id');
    }

    /** Task-level coordinator override; falls back to project()->coordinator when null. */
    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
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

    public function taskAssignees(): HasMany
    {
        return $this->hasMany(ProjectTaskAssignee::class, 'task_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pm_task_assignees', 'task_id', 'user_id')
            ->withPivot(['assigned_by', 'is_primary', 'individual_status', 'progress_percentage', 'assigned_at'])
            ->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ProjectTaskComment::class, 'task_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ProjectTaskAttachment::class, 'task_id');
    }

    public function bugs(): HasMany
    {
        return $this->hasMany(ProjectTaskBug::class, 'task_id');
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(ProjectCorrection::class, 'task_id');
    }

    public function checklistAssignments(): HasMany
    {
        return $this->hasMany(ProjectChecklistAssignment::class, 'checklistable_id')
            ->where('checklistable_type', 'Task');
    }

    /**
     * The coordinator actually notified for this task: its own override,
     * or the parent project's coordinator, or null if neither is set.
     * Mirrors ProjectAuthorizationService::resolveTaskCoordinator() —
     * kept here too since it's a pure read, useful outside the service.
     */
    public function resolvedCoordinator(): ?User
    {
        return $this->coordinator ?? $this->project?->coordinator;
    }
}
