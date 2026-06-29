<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WfhRequest extends Model
{

    protected $guarded = [];

    public function user() {
        return $this->belongsTo(User::class);
    }
    
    public function approver() {
        return $this->belongsTo(User::class, 'approved_by');
    }
    

    //
}
