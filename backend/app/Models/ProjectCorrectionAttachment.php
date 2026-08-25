<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectCorrectionAttachment extends Model
{
    public $timestamps = false; // created_at only — see migration

    protected $table = 'pm_correction_attachments';

    protected $fillable = [
        'correction_id',
        'file_path',
        'file_name',
        'file_type',
        'uploaded_by',
    ];

    public function correction(): BelongsTo
    {
        return $this->belongsTo(ProjectCorrection::class, 'correction_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
