<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeamFeedback extends Model
{
    /** The four fixed questions (field => question shown to the team lead). */
    public const QUESTIONS = [
        'attitude' => 'Attitude towards the team and the work',
        'attire' => 'Attire and professional presentation',
        'learning' => 'Learning new things',
        'on_time' => 'Completing work on time',
    ];

    protected $table = 'team_feedback';
    protected $guarded = [];
}
