<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WfhRequest extends Model
{

    protected $guarded = [];

    protected $appends = ['days_count'];

    public function user() {
        return $this->belongsTo(User::class);
    }
    
    public function approver() {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getDaysCountAttribute(): float
    {
        if (in_array($this->duration_type, ['Half-Morning', 'Half-Afternoon'])) {
            return 0.5;
        }

        if (!$this->start_date) {
            return 1.0;
        }

        if (!$this->end_date || $this->end_date === $this->start_date) {
            return 1.0;
        }

        try {
            $start = \Carbon\Carbon::parse($this->start_date);
            $end   = \Carbon\Carbon::parse($this->end_date);
            if ($end->lessThan($start)) {
                return 1.0;
            }
            return (float) ($end->diffInDays($start) + 1);
        } catch (\Exception $e) {
            return 1.0;
        }
    }
}
