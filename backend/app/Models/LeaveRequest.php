<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{

    protected $guarded = [];

    protected $appends = ['duration_type'];

    public function getDurationTypeAttribute()
    {
        $name = strtolower($this->leaveType->name ?? '');
        if (str_contains($name, 'morning')) {
            return 'Half-Morning';
        }
        if (str_contains($name, 'afternoon')) {
            return 'Half-Afternoon';
        }
        if (str_contains($name, 'half')) {
            return 'Half-Morning'; // default fallback for half day
        }
        return 'Full';
    }

    public function user() {
        return $this->belongsTo(User::class);
    }
    
    public function leaveType() {
        return $this->belongsTo(LeaveType::class);
    }
    
    public function approver() {
        return $this->belongsTo(User::class, 'approved_by');
    }
    

    //
}
