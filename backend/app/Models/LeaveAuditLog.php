<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveAuditLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'previous_value' => 'array',
        'new_value' => 'array',
    ];

    public function leaveRequest()
    {
        return $this->belongsTo(LeaveRequest::class);
    }

    public function modifier()
    {
        return $this->belongsTo(User::class, 'modified_by');
    }
}
