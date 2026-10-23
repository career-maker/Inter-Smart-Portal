<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectPayment extends Model
{
    protected $guarded = [];

    protected $casts = ['decided_at' => 'datetime', 'due_date' => 'date:Y-m-d'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
