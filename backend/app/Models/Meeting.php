<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Meeting extends Model
{
    protected $guarded = [];

    protected $casts = ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'external_emails' => 'array'];

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function organizer()
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function attendees()
    {
        return $this->belongsToMany(User::class, 'meeting_user');
    }

    public function actions()
    {
        return $this->hasMany(MeetingAction::class);
    }
}
