<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * pm_user_hubstaff_links — explicit employee <-> Hubstaff-user-ID link.
 * Deliberately its own table, not a column on the existing `users` table
 * (see design doc §7/§9) — keeps `users` completely untouched.
 */
class ProjectUserHubstaffLink extends Model
{
    protected $table = 'pm_user_hubstaff_links';

    protected $fillable = [
        'user_id',
        'hubstaff_user_id',
        'linked_by',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function linkedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'linked_by');
    }
}
