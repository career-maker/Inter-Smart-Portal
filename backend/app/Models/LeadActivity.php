<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadActivity extends Model
{
    protected $guarded = [];

    protected $casts = ['due_at' => 'date:Y-m-d', 'completed_at' => 'datetime'];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
