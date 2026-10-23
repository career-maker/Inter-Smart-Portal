<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AmcContract extends Model
{
    protected $guarded = [];

    protected $casts = ['start_date' => 'date:Y-m-d', 'end_date' => 'date:Y-m-d'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
