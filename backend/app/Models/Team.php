<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Team extends Model
{

    protected $guarded = [];

    public function teamLead() {
        return $this->belongsTo(User::class, 'team_lead_id');
    }
    
    public function members() {
        return $this->hasMany(User::class);
    }
    

    //
}
