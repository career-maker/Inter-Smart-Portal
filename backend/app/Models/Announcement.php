<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_pinned'    => 'boolean',
        'scheduled_at' => 'datetime',
        'expires_at'   => 'datetime',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
