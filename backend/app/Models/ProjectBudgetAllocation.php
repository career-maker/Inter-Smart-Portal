<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectBudgetAllocation extends Model
{
    protected $table = 'project_budget_allocations';
    protected $guarded = [];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }
}
