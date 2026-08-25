<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * pm_task_bugs — normalized, one-row-per-bug replacement for the legacy
 * QA Tracker's flat bug_count/html_bugs/functional_bugs counters.
 */
class ProjectTaskBug extends Model
{
    protected $table = 'pm_task_bugs';

    public const TYPES = ['HTML', 'Functional', 'Other'];
    public const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
    public const STATUSES = ['Open', 'Fixed', 'Verified', 'Reopened', 'Closed'];

    protected $fillable = [
        'task_id',
        'bug_type',
        'severity',
        'status',
        'description',
        'reported_by',
        'fixed_by',
        'reported_at',
        'fixed_at',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
        'fixed_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function fixer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fixed_by');
    }
}
