<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * pm_project_members — project roster.
 *
 * project_role is one of 'Member' | 'Lead' | 'Reviewer' only — 'Coordinator'
 * is intentionally never a valid value here (enforced in validation, not the
 * DB). Coordinator status lives exclusively in Project::project_coordinator_id
 * / ProjectTask::coordinator_id — one source of truth, never duplicated.
 */
class ProjectMember extends Model
{
    protected $table = 'pm_project_members';

    public const ROLES = ['Member', 'Lead', 'Reviewer'];

    protected $fillable = [
        'project_id',
        'user_id',
        'project_role',
        'added_by',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
