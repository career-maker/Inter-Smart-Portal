<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTaskAttachment extends Model
{
    public $timestamps = false; // created_at only, no updated_at — see migration

    protected $table = 'pm_task_attachments';

    protected $fillable = [
        'task_id',
        'file_path',
        'file_name',
        'file_type',
        'uploaded_by',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
