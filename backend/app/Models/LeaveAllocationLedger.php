<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveAllocationLedger extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'amount'              => 'float',
        'opening_balance'     => 'float',
        'closing_balance'     => 'float',
        'carry_forward_year'  => 'integer',
        'expires_at'          => 'date',
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
