<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkSprint extends Model
{
    public const OPEN_STATUSES = ['Approved', 'Scheduled', 'In progress', 'Completed']; // count against the department budget

    protected $table = 'work_sprints';
    protected $guarded = [];
    protected $casts = ['requested_start' => 'date:Y-m-d', 'requested_end' => 'date:Y-m-d', 'start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d', 'decided_at' => 'datetime'];

    public function items()
    {
        return $this->hasMany(SprintItem::class, 'sprint_id')->orderBy('position')->orderBy('id');
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }
}
