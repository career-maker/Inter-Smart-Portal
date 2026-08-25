<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * pm_task_comments — attributed, timestamped comment history. Replaces
 * the legacy QA Tracker's single overwritable free-text `comments` column.
 */
class ProjectTaskComment extends Model
{
    protected $table = 'pm_task_comments';

    protected $fillable = [
        'task_id',
        'user_id',
        'comment',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
