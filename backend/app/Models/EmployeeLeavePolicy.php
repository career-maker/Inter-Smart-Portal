<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeLeavePolicy extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'custom_monthly_cl'          => 'float',
        'custom_monthly_sl'          => 'float',
        'custom_probation_months'    => 'integer',
        'probation_cleared_manually' => 'boolean',
        'probation_cleared_at'       => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function probationClearedBy()
    {
        return $this->belongsTo(User::class, 'probation_cleared_by');
    }
}
