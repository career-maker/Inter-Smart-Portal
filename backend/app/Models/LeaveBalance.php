<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    protected $guarded = [];

    protected $casts = [
        'casual_leave_balance'       => 'float',
        'cl_carry_forward'           => 'float',
        'cl_carry_forward_year'      => 'integer',
        'sick_leave_balance'         => 'float',
        'total_leaves_taken'         => 'float',
        'probation_leaves_allocated' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Total available CL = current year + carry-forward.
     */
    public function getTotalCasualAttribute(): float
    {
        return ($this->casual_leave_balance ?? 0) + ($this->cl_carry_forward ?? 0);
    }
}
