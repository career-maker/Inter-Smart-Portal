<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiometricSyncState extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'last_successful_sync' => 'datetime',
        'last_attempted_sync' => 'datetime',
    ];
}
