<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkChange extends Model
{
    public const KINDS = ['Correction', 'Change'];
    public const COUNTED = ['Approved', 'In progress', 'Completed']; // count against the department budget

    protected $table = 'work_changes';
    protected $guarded = [];
    protected $casts = ['decided_at' => 'datetime', 'completed_at' => 'datetime'];
}
