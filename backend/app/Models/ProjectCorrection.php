<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * pm_corrections — project-level by default (task_id is nullable; a
 * correction is never required to reference one specific task, matching
 * the legacy QA Tracker's actual behavior — Gap A2 in the validation report).
 */
class ProjectCorrection extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pm_corrections';

    public const TYPES = ['Bug', 'Rework', 'Client Feedback', 'QA Rejection', 'Other'];
    public const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
    public const STATUSES = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'];

    protected $fillable = [
        'project_id',
        'task_id',
        'correction_type',
        'severity',
        'status',
        'description',
        'raised_by',
        'assigned_to',
        'raised_at',
        'resolved_at',
        'created_by',
    ];

    protected $casts = [
        'raised_at' => 'datetime',
        'resolved_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function raisedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'raised_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ProjectCorrectionComment::class, 'correction_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ProjectCorrectionAttachment::class, 'correction_id');
    }
}
