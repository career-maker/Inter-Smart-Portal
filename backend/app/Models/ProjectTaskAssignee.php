<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * pm_task_assignees — proper many-to-many join (task <-> users), replacing
 * the legacy QA Tracker's row-per-assignee duplication.
 *
 * individual_status / progress_percentage (Decision 3): optional per-
 * assignee tracking; NULL means "follows the task's own master status".
 */
class ProjectTaskAssignee extends Model
{
    protected $table = 'pm_task_assignees';

    protected $fillable = [
        'task_id',
        'user_id',
        'assigned_by',
        'is_primary',
        'individual_status',
        'progress_percentage',
        'assigned_at',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'progress_percentage' => 'decimal:2',
        'assigned_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
