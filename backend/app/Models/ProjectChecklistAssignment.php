<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

/**
 * pm_checklist_assignments — one row per (project-or-task, checklist_item)
 * pair, holding pass/fail state directly. checklistable_type/_id is a
 * lightweight polymorphic pair ('Project'|'Task') — deliberately NOT a
 * Laravel morphMap relation, to avoid any change to an existing shared
 * service provider; scoped manually via the helper scopes below instead.
 */
class ProjectChecklistAssignment extends Model
{
    protected $table = 'pm_checklist_assignments';

    protected $fillable = [
        'checklistable_type',
        'checklistable_id',
        'checklist_item_id',
        'is_checked',
        'checked_by',
        'checked_at',
    ];

    protected $casts = [
        'is_checked' => 'boolean',
        'checked_at' => 'datetime',
    ];

    public function checklistItem(): BelongsTo
    {
        return $this->belongsTo(ProjectChecklistItem::class, 'checklist_item_id');
    }

    public function checkedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }

    public function scopeForProject(Builder $query, int $projectId): Builder
    {
        return $query->where('checklistable_type', 'Project')->where('checklistable_id', $projectId);
    }

    public function scopeForTask(Builder $query, int $taskId): Builder
    {
        return $query->where('checklistable_type', 'Task')->where('checklistable_id', $taskId);
    }
}
