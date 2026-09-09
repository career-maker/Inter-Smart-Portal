<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugzillaAttachment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'bugzilla_attachments';

    protected $fillable = [
        'bug_id',
        'uploaded_by',
        'file_path',
        'original_name',
        'mime_type',
        'file_size',
        'description',
        'is_private',
        'created_at',
    ];

    protected $casts = [
        'is_private' => 'boolean',
        'file_size' => 'integer',
        'created_at' => 'datetime',
    ];

    public function bug(): BelongsTo
    {
        return $this->belongsTo(BugzillaBug::class, 'bug_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
