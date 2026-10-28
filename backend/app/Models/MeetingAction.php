<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingAction extends Model
{
    protected $guarded = [];

    protected $casts = ['done' => 'boolean', 'due_date' => 'date'];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
