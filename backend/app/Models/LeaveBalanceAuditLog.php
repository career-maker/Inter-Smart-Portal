<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalanceAuditLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'previous_balance' => 'float',
        'new_balance'      => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function modifier()
    {
        return $this->belongsTo(User::class, 'modified_by');
    }
}
