<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugzillaComment extends Model
{
    use HasFactory;

    protected $table = 'bugzilla_comments';

    protected $fillable = [
        'bug_id',
        'user_id',
        'comment',
        'is_private',
    ];

    protected $casts = [
        'is_private' => 'boolean',
    ];

    public function bug(): BelongsTo
    {
        return $this->belongsTo(BugzillaBug::class, 'bug_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
