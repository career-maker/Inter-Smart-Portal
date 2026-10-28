<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appreciation extends Model
{
    protected $guarded = [];

    protected $casts = ['decided_at' => 'datetime'];

    public function nominee()
    {
        return $this->belongsTo(User::class, 'nominee_id');
    }

    public function nominator()
    {
        return $this->belongsTo(User::class, 'nominated_by');
    }
}
