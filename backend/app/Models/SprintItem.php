<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SprintItem extends Model
{
    public const STATUSES = [
        'Pending', 'In progress', 'Completed', 'Testing bugs 1', 'Testing bugs 2', 'Testing bugs 3',
        'Waiting for approval', 'Correction 1', 'Correction 2', 'Correction 3', 'Approved',
    ];

    protected $table = 'sprint_items';
    protected $guarded = [];

    public function sprint()
    {
        return $this->belongsTo(WorkSprint::class, 'sprint_id');
    }
}
