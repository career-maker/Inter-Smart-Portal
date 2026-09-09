<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugzillaHistory extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'bugzilla_history';

    protected $fillable = [
        'bug_id',
        'user_id',
        'action',
        'field',
        'old_value',
        'new_value',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function bug(): BelongsTo
    {
        return $this->belongsTo(BugzillaBug::class, 'bug_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Record an audit log entry for a bug modification.
     */
    public static function logChange(int $bugId, int $userId, string $action, ?string $field = null, ?string $oldValue = null, ?string $newValue = null): self
    {
        return static::create([
            'bug_id' => $bugId,
            'user_id' => $userId,
            'action' => $action,
            'field' => $field,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'created_at' => now(),
        ]);
    }
}
