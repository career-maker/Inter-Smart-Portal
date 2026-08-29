<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeavePolicySetting extends Model
{
    use HasFactory;

    protected $table = 'leave_policy_settings';

    protected $guarded = [];

    protected $casts = [
        'monthly_cycle_start_day'      => 'integer',
        'probation_period_months'      => 'integer',
        'default_monthly_cl'           => 'float',
        'default_monthly_sl'           => 'float',
        'cl_carry_forward_years'       => 'integer',
        'sl_carry_forward_allowed'     => 'boolean',
        'cl_advance_notice_days'       => 'integer',
        'single_day_approval_level'    => 'string',
        'multi_day_approval_threshold' => 'integer',
        'lop_admin_approval_required'  => 'boolean',
    ];

    /**
     * Get or create the singleton global policy setting.
     */
    public static function current(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'monthly_cycle_start_day'      => 26,
                'probation_period_months'      => 6,
                'default_monthly_cl'           => 1.00,
                'default_monthly_sl'           => 1.00,
                'cl_carry_forward_years'       => 2,
                'sl_carry_forward_allowed'     => false,
                'cl_advance_notice_days'       => 3,
                'wfh_morning_cutoff_time'      => '09:45',
                'wfh_afternoon_cutoff_time'    => '14:30',
                'single_day_approval_level'    => 'tl_only',
                'multi_day_approval_threshold' => 2,
                'lop_admin_approval_required'  => true,
            ]
        );
    }
}
