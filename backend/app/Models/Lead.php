<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    public const STATUSES = ['New', 'Follow up', 'Hot', 'Ready to close', 'Won', 'Lost'];

    protected $guarded = [];

    protected $casts = ['next_followup_at' => 'date:Y-m-d'];

    public function activities()
    {
        return $this->hasMany(LeadActivity::class);
    }
}
