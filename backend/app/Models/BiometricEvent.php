<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiometricEvent extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'local_punch_time' => 'datetime',
        'utc_punch_time' => 'datetime',
        'received_at' => 'datetime',
    ];

    /**
     * Optional relationship to the portal user, if mapped.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
