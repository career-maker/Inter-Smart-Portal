<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentUpload extends Model
{

    protected $guarded = [];
    
    public function documentRequest() {
        return $this->belongsTo(DocumentRequest::class);
    }
    
    public function uploader() {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
    

    //
}
