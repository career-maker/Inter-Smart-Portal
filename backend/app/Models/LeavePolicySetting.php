<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeavePolicySetting extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'monthly_cycle_start_day'  => 'integer',
        'probation_period_months'  => 'integer',
        'default_monthly_cl'       => 'float',
        'default_monthly_sl'       => 'float',
        'cl_carry_forward_years'   => 'integer',
        'sl_carry_forward_allowed' => 'boolean',
    ];

    /**
     * Get or create the singleton global policy setting.
     */
    public static function current(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'monthly_cycle_start_day'  => 26,
                'probation_period_months'  => 6,
                'default_monthly_cl'       => 1.00,
                'default_monthly_sl'       => 1.00,
                'cl_carry_forward_years'   => 2,
                'sl_carry_forward_allowed' => false,
            ]
        );
    }
}
