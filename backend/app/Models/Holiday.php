<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{

    protected $guarded = [];
    
    public function applicableTeam() {
        return $this->belongsTo(Team::class, 'applicable_team_id');
    }
    

    //
}
