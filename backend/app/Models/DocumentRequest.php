<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentRequest extends Model
{

    protected $guarded = [];
    
    public function user() {
        return $this->belongsTo(User::class);
    }
    
    public function uploads() {
        return $this->hasMany(DocumentUpload::class);
    }
    

    //
}
