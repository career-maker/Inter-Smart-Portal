<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectCorrectionComment extends Model
{
    protected $table = 'pm_correction_comments';

    protected $fillable = [
        'correction_id',
        'user_id',
        'comment',
    ];

    public function correction(): BelongsTo
    {
        return $this->belongsTo(ProjectCorrection::class, 'correction_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
